const User = require("../Models/User")
const Notification = require("../Models/Notification");


const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalNotifications = await Notification.countDocuments({ recipient: userId });

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'userName profilePic')
      .populate('recipient', 'userName')
      .populate('post')
      .populate('video')
      .populate('actors', 'userName profilePic')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const hasMore = skip + notifications.length < totalNotifications;

    // NEW: Get follow requests count
    const user = await User.findById(userId).select('pendingFollowRequests');
    const followRequestsCount = user?.pendingFollowRequests?.length || 0;

    return res.status(200).json({ 
      notifications,
      totalNotifications,
      followRequestsCount, // NEW: Include this
      pagination: {
        currentPage: page,
        hasMore,
        totalPages: Math.ceil(totalNotifications / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const markAllAsRead = async (req, res) => {
    try{
        const { userId } = req.params;
        await Notification.updateMany({ recipient: userId, read: false }, { read: true });
        return res.status(200).json({ message: "All notifications marked as read" });
        
    }
    catch(err){
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
  getNotifications,
  deleteNotification,
  markAllAsRead
};