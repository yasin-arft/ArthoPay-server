const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
var bcrypt = require('bcryptjs');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jzumutc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const app = express();
const port = process.env.PORT || 5000;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Artho Pay server is running')
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections
    const userCollection = client.db('arthoPayDb').collection('users');

    // authentication related api
    app.post('/login', async (req, res) => {
      const credential = req.body;

      const user = await userCollection.findOne({ email: credential.emailOrPhone }) ||
        await userCollection.findOne({ phone: credential.emailOrPhone });

      if (!user) {
        return res.status(401).send({ message: 'unauthorized' });
      }

      if (user.status !== 'Approved') {
        return res.send({ message: 'Your request is not approved yet.' });
      }

      bcrypt.compare(credential.pin, user.pin, function (err, response) {
        if (err) {
          return res.send({ message: 'Something went wrong! Please Try again.' });
        } else if (response === false) {
          return res.status(401).send({ message: 'unauthorized' });
        } else {
          res.send(user)
        }
      });
    });


    // user related apis
    app.post('/users', async (req, res) => {
      const user = req.body;

      // hash the pin
      bcrypt.hash(user.pin, 8, async (err, hash) => {
        if (hash) {
          const hashedUser = {
            ...user,
            pin: hash,
            status: 'Pending'
          }

          // add the user
          const result = await userCollection.insertOne(hashedUser)
          res.send(result);
        }
      });
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Artho Pay server running on PORT: ${port}`);
})