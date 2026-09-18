const User = require("../Models/User");

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access. No token payload found." });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    next();
  } catch (error) {
    console.error("IsAdmin Middleware Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = isAdmin;
