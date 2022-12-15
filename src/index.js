require("dotenv").config();

const PORT = process.env.PORT || 5000;

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

const dev = true;

app.use(
  cors(
    dev
      ? {
          origin: ["http://localhost:3000"],
          credentials: true,
        }
      : {
          origin: "https://www.example.com",
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
