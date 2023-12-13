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
app.use(
  cors({
    origin: [
      "https://pet-haven-client.web.app",
      "https://pet-haven-client.firebaseapp.com",
    ],
    credentials: true,
  })
);
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
const bookingCollection = client.db("petHavenDB").collection("bookings");

// Middlewares
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, accessTokenSecret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Auth related API
    app.post("/api/v1/auth/access-token", async (req, res) => {
      try {
        // creating token and send to client
        const user = req.body;
        const token = jwt.sign(user, accessTokenSecret, { expiresIn: "24h" });
        res
          .cookie("token", token, {
            httpOnly: true,
            secure: false,
            // sameSite: "none",
          })
          .send({ success: true });
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/api/v1/logout", async (req, res) => {
      const loggedOutUser = req.body;
      console.log(loggedOutUser);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // Get Method
    // Popular Services
    app.get("/api/v1/popularServices", async (req, res) => {
      try {
        const result = await serviceCollection.find().limit(4).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // All services and filtering services
    app.get("/api/v1/services", async (req, res) => {
      try {
        let query = {};
        let sortObj = {};

        const serviceName = req.query.serviceName;
        const sortField = req.query.sortField;
        const sortOrder = req.query.sortOrder;

        if (serviceName) {
          // query.serviceName = serviceName;
          query = {
            serviceName: { $regex: serviceName, $options: "i" },
          };
        }
        if (sortField && sortOrder) {
          sortObj[sortField] = sortOrder;
        }
        // console.log(sortObj);

        const result = await serviceCollection
          .find(query)
          .sort(sortObj)
          .toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // Get Services according to email
    app.get("/api/v1/user/services", async (req, res) => {
      try {
        const email = req.query?.email;
        const query = { providerEmail: email };
        // console.log(query);
        if (email) {
          const result = await serviceCollection.find(query).toArray();
          res.send(result);
        } else {
          res.send([]);
        }
      } catch (err) {
        console.log(err);
      }
    });

    // Get Single Service
    app.get("/api/v1/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // Bookings
    app.get("/api/v1/user/bookings", async (req, res) => {
      const queryEmail = req.query?.email;
      // const tokenEmail = req.user.email;

      let query = {};

      // if (queryEmail !== tokenEmail) {
      //   return res.status(403).send("Forbidden");
      // }
      if (queryEmail) {
        query = { customerEmail: queryEmail };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // Post Method
    app.post("/api/v1/user/create-service", async (req, res) => {
      try {
        const services = req.body;
        const result = await serviceCollection.insertOne(services);
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

    // Update Data
    app.put("/api/v1/user/service/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedService = req.body;
        const query = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedData = {
          $set: {
            ...updatedService,
          },
        };
        const result = await serviceCollection.updateOne(
          query,
          updatedData,
          options
        );
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // Delete Method
    app.delete("/api/v1/user/service/:serviceId", async (req, res) => {
      try {
        const id = req.params.serviceId;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/api/v1/user/cancel-booking/:bookingId", async (req, res) => {
      try {
        const id = req.params.bookingId;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pet Haven Server is Running");
});

app.listen(port, () => {
  console.log(`PET HAVEN SERVER IS RUNNING ON PORT ${port}`);
});
