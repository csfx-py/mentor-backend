const router = require("express").Router();
const bcrypt = require("bcrypt");
const createToken = require("../utils/createToken");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password)
      throw new Error("Please enter all fields");

    // Check for existing user
    const user = await User.findOne({ email });
    if (user) throw Error("User already exists");

    const salt = await bcrypt.genSalt(10);
    if (!salt) throw Error("Something went wrong with password encryption");

    const hash = await bcrypt.hash(password, salt);
    if (!hash) throw Error("Something went wrong with password encryption");

    const newUser = new User({
      name,
      email,
      password: hash,
    });

    const savedUser = await newUser.save();
    if (!savedUser) throw Error("Something went wrong saving the user");

    const token = createToken(savedUser, process.env.ACCESS_TOKEN_SEC, "168h");

    res
      .cookie("token", token, {
        httpOnly: true,
      })
      .status(200)
      .json({
        success: true,
        token,
        message: "User registered successfully",
      });
  } catch (err) {
    // console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) throw new Error("Please enter all fields");

    // Check for existing user
    const user = await User.findOne({ email });
    if (!user) throw Error("User does not exist. Please register to continue");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      throw Error("Invalid credentials. Please check your email and password");

    const token = createToken(user, process.env.ACCESS_TOKEN_SEC, "168h");

    res
      .cookie("token", token, {
        httpOnly: true,
      })
      .status(200)
      .json({
        success: true,
        token,
        message: "User logged in successfully",
      });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/refresh", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) throw Error("No token found");

    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SEC);
    if (!verified) throw Error("Token verification failed");

    const user = await User.findById(verified._id);
    if (!user) throw Error("User does not exist");

    const newToken = createToken(user, process.env.ACCESS_TOKEN_SEC, "168h");

    res
      .cookie("token", newToken, {
        httpOnly: true,
      })
      .status(200)
      .json({
        success: true,
        token: newToken,
        message: "Token refreshed successfully",
      });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/logout", async (req, res) => {
  try {
    res
      .cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
      })
      .status(200)
      .json({
        success: true,
        message: "User logged out successfully",
      });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
