require("dotenv").config();
const dev = process.env.NODE_ENV !== "production";

const PORT = dev ? process.env.PORT || 5000 : process.env.PORT_PROD || 5000;

const express = require("express");
const app = express();

const cors = require("cors");
const cookieParser = require("cookie-parser");

const morgan = require("morgan");

const mongoose = require("mongoose");

const authRoute = require("./routes/Auth");
const adminRoutes = require("./routes/Admin");
const postsRoute = require("./routes/Posts");
const userRoute = require("./routes/User");

app.use(
  cors(
    dev
      ? {
          origin: ["http://localhost:3000"],
          credentials: true,
        }
      : {
          origin: ["https://www.example.com", "http://localhost:3100"],
          credentials: true,
        }
  )
);
app.use(morgan("tiny"));
app.use(express.json());
app.use(cookieParser());

// connect mongodb
mongoose.connect(
  dev ? process.env.MONGO_LOCAL : process.env.MONGO_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) throw err;
    console.log("Connected to MongoDB");
  }
);

app.get("/", (req, res) => {
  res.send("Hello");
});

app.use("/auth", authRoute);
app.use("/admin", adminRoutes);
app.use("/user", userRoute);
app.use("/posts", postsRoute);

app.listen(PORT, () => {
  console.log(`listening at http://localhost:${PORT}`);
});
