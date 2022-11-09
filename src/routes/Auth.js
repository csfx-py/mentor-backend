const router = require("express").Router();
const bcrypt = require("bcrypt");
const createToken = require("../utils/createToken");

const User = require("../models/User");

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password)
      return res.status(400).json({ message: "Please enter all fields" });

    // Check for existing user
    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    if (!salt) throw Error("Something went wrong with bcrypt");

    const hash = await bcrypt.hash(password, salt);
    if (!hash) throw Error("Something went wrong hashing the password");

    const newUser = new User({
      name,
      email,
      password: hash,
    });

    const savedUser = await newUser.save();
    if (!savedUser) throw Error("Something went wrong saving the user");

    const token = createToken(savedUser, process.env.ACCESS_TOKEN_SEC, "168h");

    res
      .status(200)
      .json({
        token,
        message: "User registered successfully",
      })
      .cookie("token", token, {
        httpOnly: true,
      });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password)
      return res.status(400).json({ message: "Please enter all fields" });

    // Check for existing user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = createToken(user, process.env.ACCESS_TOKEN_SEC, "168h");

    res
      .status(200)
      .json({
        token,
        message: "User logged in successfully",
      })
      .cookie("token", token, {
        httpOnly: true,
      });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
