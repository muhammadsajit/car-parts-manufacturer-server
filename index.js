const express = require('express');
const cors = require('cors');
const jwt=require('jsonwebtoken');
require('dotenv').config()
const app = express();
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { ObjectID } = require('bson');
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.daakn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {

        await client.connect();
        const itemsCollection = client.db('car_parts_manufacturer').collection('items');
        const orderCollection = client.db('car_parts_manufacturer').collection('orders');
        const userCollection = client.db('car_parts_manufacturer').collection('users');
        const usersCollection = client.db('car_parts_manufacturer').collection('carUser');
        const reviewCollection = client.db('car_parts_manufacturer').collection('reviews');


        function verifyJWT(req,res,next){
            const authHeader=req.headers.authorization;
            if(!authHeader){
                return res.status(401).send({message:'unauthorized'})
            }
            const token=authHeader.split(' ')[1];
            console.log('token',token)
            jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
                if(err){
                    return res.status(403).send({message:'forbidden access'})
                }
                req.decoded=decoded;
                next();
              });
        };
        const verifyAdmin=async(req,res,next)=>{
            
            const requester= req.decoded.email;
            const requesterAccount=await usersCollection.findOne({email:requester});
            if(requesterAccount.role==='admin'){
                   next()
            }
            else{
                res.status(403).send({message:'forbidden'})
            }
        }

        app.get('/items', async (req, res) => {
            const query = {};
            const cursor = itemsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });
        app.get('/items', verifyJWT,verifyAdmin, async (req, res) => {
            
            
            const result = await itemsCollection.find().toArray();
            res.send(result)
        });
        app.post('/items',verifyJWT,verifyAdmin, async (req, res) => {
            const newitem = req.body;

            const result = await itemsCollection.insertOne(newitem);
            res.send(result)
        });
        app.delete('/items/:id',verifyJWT,verifyAdmin, async (req, res) => {
            const id= req.params.id;
              const query ={_id:ObjectId(id)};

            const result = await itemsCollection.deleteOne(query);
            res.send(result)
        });

        app.get('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await itemsCollection.findOne(query);
            res.send(purchase);
        });
        

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)

        });
        app.get('/order', async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);

        });
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);

        });
        app.get('/orders',verifyJWT,async (req, res) => {
            const user = req.query.userEmail;
            const decodedEmail=req.decoded.email;
            if(user===decodedEmail){

            const query = { userEmail: user };
            const orders=await orderCollection.find(query).toArray();
             return res.send(orders)
            }
 
            else{
                  res.status(403).send('forbidden access')
            }



        });

        app.get('/orders/:id',verifyJWT,async(req,res)=>{
            const id=req.params.id;
            const query = { _id: ObjectId(id) };
            const order= await orderCollection.findOne(query);
            res.send(order)

        });
        app.patch('/orders/:id',verifyJWT,async(req,res)=>{
            const id= req.params.id;
            const payment=req.body;
            const filter={_id:ObjectId(id)};
            const updatedDoc={
                $set:{
                    paid:true,
                    transactionId:payment.transactionId,


                }
                
            }
            const updatedOrder= await orderCollection.updateOne(filter,updatedDoc)
            res.send(updatedOrder);
        })
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)



        });

        app.get('/users',verifyJWT,async(req,res)=>{
            const users=await usersCollection.find().toArray();
            res.send(users)
        });
        app.post('/create-payment-intent',verifyJWT ,async(req,res)=>{
            const order=req.body;
            const price=order.price;
            const amount=price *100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
              })
              res.send({clientSecret:paymentIntent.client_secret})
        })


     app.get('/admin/:email',async(req,res)=>{
         const email=req.params.email;
         const user=await usersCollection.findOne({email:email});
         const isAdmin=user.role==='admin';
         res.send({admin:isAdmin})
     })

    app.put('/users/admin/:email', verifyJWT,verifyAdmin,async(req,res)=>{
            const email=req.params.email;
            
                const filter={ email:email };
            
                const updateDoc={
                    $set:{role:'admin'},
                }
                const result= await usersCollection.updateOne(filter,updateDoc);
               
    
                res.send(result) 
            
            
            
        });
    app.put('/users/:email',async(req,res)=>{
            const email=req.params.email;
            const user=req.body;
            const filter={ email:email };
            const options={ upsert:true};
            const updateDoc={
                $set:user,
            }
            const result= await usersCollection.updateOne(filter,updateDoc,options);
            const token=jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{ expiresIn: 60 * 60 })

            res.send({result,token}) 
        });
        app.put('/user/:email',async(req,res)=>{
            const email=req.params.email;
            const user=req.body;
            const filter={ email:email };
            const options={ upsert:true};
            const updateDoc={
                $set:user,
            }
            const result= await userCollection.updateOne(filter,updateDoc,options);

            res.send(result) 
          });
          app.get('/profiles/:email', verifyJWT,async(req,res)=>{
               const email=req.params.email;
               const query={email:email}
              const result = await userCollection.findOne(query);
             
              res.send(result);


          })
          app.get('/profiles',async(req,res)=>{
             const result=await userCollection.find().toArray()

             
              res.send(result);


          })



    }
    finally {

    }

}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Server is running')
})

app.listen(port, () => {
    console.log(`car app listening on port ${port}`)
})