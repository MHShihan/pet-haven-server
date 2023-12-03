const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const accessTokenSecret = process.env.SECRET_TOKEN;

const app = express();
const port = process.env.PORT || 5000;

// Parser
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.88ffpvi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const serviceCollection = client
  .db("petHavenDB")
  .collection("petHavenServices");
const postCollection = client.db("petHavenDB").collection("createdServices");
const bookingCollection = client.db("petHaven").collection("bookings");

// Middlewares
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, accessTokenSecret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorizeddddd" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Auth related API
    app.post("/api/v1/auth/access-token", async (req, res) => {
      try {
        // creating token and send to client
        const user = req.body;
        const token = jwt.sign(user, accessTokenSecret, { expiresIn: "1h" });
        res
          .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "none",
          })
          .send({ success: true });
      } catch (err) {
        console.log(err);
      }
    });

    // Get Method
    // Popular Services
    app.get("/api/v1/popularServices", verifyToken, async (req, res) => {
      try {
        const result = await serviceCollection.find().limit(4).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Bookings
    app.get("/api/v1/user/bookings", verifyToken, async (req, res) => {
      const queryEmail = req.query?.email;
      const tokenEmail = req.user.email;

      if (queryEmail !== tokenEmail) {
        return res.status(403).send("Forbidden");
      }

      const result = await bookingCollection
        .find({ email: queryEmail })
        .toArray();
      res.send(result);
    });

    // Post Method
    app.post("/api/v1/user/create-service", async (req, res) => {
      try {
        const services = req.body;
        const result = await postCollection.insertOne(services);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    // Insert Bookings
    app.post("/api/v1/user/bookings", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // Delete Method
    app.delete("/api/v1/user/cancel-booking/:bookingId", async (req, res) => {
      const id = req.params.bookingId;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pet Haven Server is Running");
});

app.listen(port, () => {
  console.log(`PET HAVEN SERVER IS RUNNING ON PORT ${port}`);
});
