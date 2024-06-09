const express = require('express');
const { MongoClient } = require('mongodb');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;

const app = express();
const port = process.env.PORT || 5000;

//Firebase Service Account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mgglo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch (err) {}
  }
  next();
}

async function mongodbCURD() {
  try {
    /* ------------------------------------- 
     checking connection with DB
    ------------------------------------- */
    await client.connect();
    /* ------------------------------------- 
    database name and collection init
    ------------------------------------- */
    const database = client.db('droneium');
    const droneCollection = database.collection('drones');
    const userCollection = database.collection('users');
    const orderCollection = database.collection('orders');
    const reviewCollection = database.collection('reviews');
    /* ------------------------------------- 
    GET All Drone API
    ------------------------------------- */
    app.get('/drones', async (req, res) => {
      const cursor = droneCollection.find({});
      const drones = await cursor.toArray();
      res.send(drones);
    });
    /* ------------------------------------- 
    GET Single Drone API
    ------------------------------------- */
    app.get('/drones/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const drone = await droneCollection.findOne(query);
      res.json(drone);
    });
    /* ------------------------------------- 
    POST Single Drone API
    ------------------------------------- */
    app.post('/drones', async (req, res) => {
      // Step 1. data
      const drone = req.body;
      // Step 2. insertOne
      const result = await droneCollection.insertOne(drone);
      res.json(result);
    });
    /* ------------------------------------- 
    DELETE Single Drone API
    ------------------------------------- */
    app.delete('/drones/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await droneCollection.deleteOne(query);
      res.json(result);
    });
    /* ------------------------------------- 
    Make An Admin API(Update existing user with admin role)
    ------------------------------------- */
    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await userCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === 'admin') {
          const query = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await userCollection.updateOne(query, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(401)
          .json({ message: 'You donot have permission to make an admin.' });
      }
    });
    /* ------------------------------------- 
   Get Admin API
    ------------------------------------- */
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    /* ------------------------------------- 
    Add a New User API
    ------------------------------------- */
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.json(result);
    });
    /* ------------------------------------- 
    Upsert User API
    ------------------------------------- */
    app.put('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.json(result);
    });
    /* ------------------------------------- 
    GET All order API
    ------------------------------------- */
    app.get('/orders', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
      }
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    /* ------------------------------------- 
    GET Single order API
    ------------------------------------- */
    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.json(order);
    });
    /* ------------------------------------- 
    POST Single order API
    ------------------------------------- */
    app.post('/orders', async (req, res) => {
      // Step 1. data
      const orderInfo = req.body;
      // Step 2. insertOne
      const result = await orderCollection.insertOne(orderInfo);
      res.json(result);
    });
    /* ------------------------------------- 
    DELETE Single order API
    ------------------------------------- */
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });
    /* ------------------------------------- 
    Update Single order Status API
    ------------------------------------- */
    app.put('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body.status;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.updateOne(query, {
        $set: { status: updatedStatus },
      });
      res.json(result);
    });
    /* ------------------------------------- 
    GET All Reviews API
    ------------------------------------- */
    app.get('/reviews', async (req, res) => {
      const cursor = reviewCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    /* ------------------------------------- 
    POST Single Review API
    ------------------------------------- */
    app.post('/reviews', async (req, res) => {
      // Step 1. data
      const review = req.body;
      // Step 2. insertOne
      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}

mongodbCURD().catch(console.dir);

// server run
app.get('/', (req, res) => res.send('server runinng'));

app.listen(port, () => console.log(`Running Server on port ${port}`));
