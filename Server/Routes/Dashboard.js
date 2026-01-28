// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../Controllers/DashboardController");
const DecodeToken = require("../Middlewares/DecodeToken");

router.get("/dashboard", DecodeToken , dashboardController.getDashboardStats);
router.get("/analytics", DecodeToken, dashboardController.getAnalyticsData);

 
module.exports = router;