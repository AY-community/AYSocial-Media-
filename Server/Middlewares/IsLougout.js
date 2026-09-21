
const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const isLogout = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("tokenVersion");

    if (!user || decoded.tokenVersion !== user.tokenVersion) {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      return next();
    }

    return res.status(403).json({ message: "Already logged in" });
  } catch (err) {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return next();
  }
};

module.exports = isLogout;
