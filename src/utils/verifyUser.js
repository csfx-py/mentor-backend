const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("Unauthorized");

    const { _id, role } = jwt.verify(token, process.env.ACCESS_TOKEN_SEC);

    const user = User.findById(_id);
    if (!user) return res.status(401).send("Unauthorized");

    if (!role)
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });

    req.reqUser = { _id, role };

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Unauthorized" + err.message,
    });
  }
};
