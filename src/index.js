require("dotenv").config();

const PORT = process.env.PORT || 5000;

const app = require("express")();
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const dev = true;

app.use(cors());
app.use(morgan("dev"));

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

app.listen(PORT, () => {
  console.log(`listening at http://localhost:${PORT}`);
});
