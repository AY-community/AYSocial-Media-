
const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const decodeToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user to compare tokenVersion — this is what makes logout/password change instant
    const user = await User.findById(decoded.id).select("tokenVersion");
    if (!user) return res.status(401).json({ message: "User not found" });

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = decodeToken;
