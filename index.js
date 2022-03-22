const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
const { MongoClient } = require("mongodb");
const ObjectId = require('mongodb').ObjectId;

require("dotenv").config();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
app.use(cors());
app.use(express.json());

// doctors-portal-firebase-adminsdk
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.terls.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("healthBondhu");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

    app.get('/appointments', verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;

      const query = { email: email, date: date }

      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
  })

  app.get('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appointmentsCollection.findOne(query);
      res.json(result);
  })

  app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await appointmentsCollection.insertOne(appointment);
      res.json(result)
  });

  app.put('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
          $set: {
              payment: payment
          }
      };
      const result = await appointmentsCollection.updateOne(filter, updateDoc);
      res.json(result);
  })

  app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
          isAdmin = true;
      }
      res.json({ admin: isAdmin });
  })

  app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
  });

  app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
  });

  app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
          const requesterAccount = await usersCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
              const filter = { email: user.email };
              const updateDoc = { $set: { role: 'admin' } };
              const result = await usersCollection.updateOne(filter, updateDoc);
              res.json(result);
          }
      }
      else {
          res.status(403).json({ message: 'you do not have access to make admin' })
      }

  })

////////////////////////////////////////////////////////////////
// // Insert new booking 
// app.post('/booked', async (req,res)=> {
//   const data = req.body;
//   const result = await ordersCollection.insertOne(data);
//   res.json(result);
// })
// // Delete a booking 
// app.delete('/booked', async(req,res)=> {
//   const deleteId = req.body.deleteId;
//   const result = await ordersCollection.deleteOne({_id:objectId(deleteId)});
//   res.json({res:' '})
// })
// // Update a booking by admin 
// app.put('/booked', async (req,res)=> {
//   const updateId = req.body.updateId;
//   const status = req.body.status;
//   const filter = { _id: objectId(updateId)};
//   const options = { upsert: true };
//   const updateDoc = {
//     $set: {
//       status: status
//     },
//   };
//   const result = await ordersCollection.updateOne(filter, updateDoc, options);
//   res.json({res:' '});
// })
// // Get my orders 
// app.get('/allBookings/:userEmail', async (req,res)=> {
//   const userEmail = req.params.userEmail;
//   const result = await ordersCollection.find({userEmail:userEmail});
//   const convertedOrders = await result.toArray();
//   res.json(convertedOrders);
// })
// // Get all orders 
// app.get('/allBookings', async (req,res)=> {
//   const result = await ordersCollection.find({});
//   const convertedOrders = await result.toArray();
//   res.json(convertedOrders);
// })
// // Post message 
// app.post('/contact',async (req,res)=> {
//   const contactData = req.body;
//   const result = await contactsCollection.insertOne(contactData);
//   res.json({res: ' '});
// })

// // review
// app.post("/addReview", async (req, res) => {
// const result = await reviewCollection.insertOne(req.body);
// res.send(result);
// });

// app.get("/addReview", async (req, res) => {
// const review = await reviewCollection.find({});
// const convertedOffers = await review.toArray();
// res.json(convertedOffers);
// });
//////////////////////////////////////////////



  app.post('/create-payment-intent', async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
          currency: 'usd',
          amount: amount,
          payment_method_types: ['card']
      });
      res.json({ clientSecret: paymentIntent.client_secret })
  })

  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctor Portal!");
});

app.listen(port, () => {
  console.log(` listening at ${port}`);
});
