const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send("Unauthorized");

  try {
    const { role } = jwt.verify(token, process.env.ACCESS_TOKEN_SEC);

    if (role !== "admin") res.status(401).send("Unauthorized");

    next();
  } catch (err) {
    res.status(401).send("Unauthorized. Error: " + err);
  }
};
