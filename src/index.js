//require("dotenv").config();

const PORT = process.env.PORT || 5000;

const app = require("express")();
const cors = require("cors");
const morgan = require("morgan");

app.use(cors());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(PORT, () => {
  console.log(`listening at http://localhost:${PORT}`);
});
