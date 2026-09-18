// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../Controllers/DashboardController");
const DecodeToken = require("../Middlewares/DecodeToken");
const isAdmin = require("../Middlewares/IsAdmin");

router.get("/dashboard", DecodeToken, isAdmin, dashboardController.getDashboardStats);
router.get("/analytics", DecodeToken, isAdmin, dashboardController.getAnalyticsData);

 
module.exports = router;