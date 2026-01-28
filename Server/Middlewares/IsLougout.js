
const jwt = require("jsonwebtoken");

const isLogout = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return next(); 

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.status(403).json({ message: "Already logged in" });
  } catch (err) {
    next();
  }
};

module.exports = isLogout;
