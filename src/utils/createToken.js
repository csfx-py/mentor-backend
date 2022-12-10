const jwt = require("jsonwebtoken");

module.exports = (user, secret, exp) => {
  const { _id, name, role } = user;
  return jwt.sign(
    {
      _id,
      name,
      role,
    },
    secret,
    { expiresIn: exp }
  );
};
