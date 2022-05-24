const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.daakn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run (){
    try{

        await client.connect();
        const itemsCollection=client.db('car_parts_manufacturer').collection('items');
        app.get('/items',async(req,res)=>{
            const query={};
            const cursor= itemsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        


    }
    finally{

    }

}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Server is running')
})
//0WgaES3xRJmjmSdW
//car_user
app.listen(port, () => {
    console.log(`car app listening on port ${port}`)
})