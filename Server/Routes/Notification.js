const router = require("express").Router();

const { getNotifications  , deleteNotification , markAllAsRead } = require("../Controllers/NotificationControllers");


router.get("/get-notifications/:userId", getNotifications)

router.delete("/delete-notification/:notificationId", deleteNotification)

router.put("/mark-all-as-read/:userId", markAllAsRead);

module.exports = router;