const router = require("express").Router();
const {getDashboardAnalytics} = require("../Controllers/AnalyticController");


router.get("/analytics/dashboard/:userId" ,   getDashboardAnalytics )

module.exports = router;
