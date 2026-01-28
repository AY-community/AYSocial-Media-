// controllers/DashboardController.js
const User = require("../Models/User");
const Post = require("../Models/Post");
const Video = require("../Models/Video");
const Report = require("../Models/Report");
const Review = require("../Models/Review");

exports.getDashboardStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // Active users (posted or uploaded video in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersPosts = await Post.distinct("user", {
      createdAt: { $gte: thirtyDaysAgo },
    });

    const activeUsersVideos = await Video.distinct("user", {
      createdAt: { $gte: thirtyDaysAgo },
    });

    const activeUsersSet = new Set([
      ...activeUsersPosts.map((id) => id.toString()),
      ...activeUsersVideos.map((id) => id.toString()),
    ]);
    const activeUsers = activeUsersSet.size;

    // Total posts
    const totalPosts = await Post.countDocuments();

    // Total videos
    const totalVideos = await Video.countDocuments();

    // Pending reports
    const pendingReports = await Report.countDocuments({ 
      status: { $in: ["pending", "reviewing"] } 
    });

    // Total reviews
    const totalReviews = await Review.countDocuments();

    // Today's signups
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySignups = await User.countDocuments({
      createdAt: { $gte: todayStart },
    });

    // Today's posts
    const todayPosts = await Post.countDocuments({
      createdAt: { $gte: todayStart },
    });

    // ====== NEW CODE: GET RECENT ACTIVITY ======
    
    // Get recent reports (last 20)
    const recentReports = await Report.find()
      .populate("reporterId", "userName")
      .populate("reportedUserId", "userName")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get recent reviews (last 20)
    const recentReviews = await Review.find()
      .populate("userId", "userName")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Combine and format activities
    const reportActivities = recentReports.map(report => ({
      type: "report",
      message: `${report.reporterId?.userName || "User"} reported ${
        report.reportType === "user" 
          ? `user ${report.reportedUserId?.userName || "someone"}`
          : `a ${report.contentType}`
      }`,
      time: report.createdAt,
      reason: report.reason,
    }));

    const reviewActivities = recentReviews.map(review => ({
      type: "review",
      message: `${review.userId?.userName || "User"} reviewed your app with ${review.rating}/10 rating`,
      time: review.createdAt,
      rating: review.rating,
    }));

    // Combine both and sort by time (most recent first)
    const allActivities = [...reportActivities, ...reviewActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 20);

    // Format time to relative
    const formatTimeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      
      if (seconds < 60) return `${seconds} seconds ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const recentActivity = allActivities.map(activity => ({
      ...activity,
      time: formatTimeAgo(activity.time),
    }));

    // ====== END NEW CODE ======

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalReviews,
        totalPosts,
        totalVideos,
        pendingReports,
        todaySignups,
        todayPosts,
      },
      recentActivity, // <-- ADD THIS LINE!
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};


exports.getAnalyticsData = async (req, res) => {
  try {
    // ====== STATS CARDS ======
    
    // Total users
    const totalUsers = await User.countDocuments();
    
    // Last week users for percentage calculation
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const usersLastWeek = await User.countDocuments({
      createdAt: { $lt: oneWeekAgo }
    });
    const userGrowthPercent = usersLastWeek > 0 
      ? (((totalUsers - usersLastWeek) / usersLastWeek) * 100).toFixed(1)
      : 0;

    // Active users (posted or uploaded in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsersPosts = await Post.distinct("user", {
      createdAt: { $gte: thirtyDaysAgo },
    });
    const activeUsersVideos = await Video.distinct("user", {
      createdAt: { $gte: thirtyDaysAgo },
    });
    const activeUsersSet = new Set([
      ...activeUsersPosts.map((id) => id.toString()),
      ...activeUsersVideos.map((id) => id.toString()),
    ]);
    const activeUsers = activeUsersSet.size;

    // Active users last week for percentage
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const activeUsersPostsLastWeek = await Post.distinct("user", {
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
    });
    const activeUsersVideosLastWeek = await Video.distinct("user", {
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
    });
    const activeUsersLastWeekSet = new Set([
      ...activeUsersPostsLastWeek.map((id) => id.toString()),
      ...activeUsersVideosLastWeek.map((id) => id.toString()),
    ]);
    const activeUsersLastWeek = activeUsersLastWeekSet.size;
    const activeUserGrowthPercent = activeUsersLastWeek > 0
      ? (((activeUsers - activeUsersLastWeek) / activeUsersLastWeek) * 100).toFixed(1)
      : 0;

    // New signups today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newSignupsToday = await User.countDocuments({
      createdAt: { $gte: todayStart },
    });

    // Pending reports this week
    const pendingReportsThisWeek = await Report.countDocuments({
      status: { $in: ["pending", "reviewing"] },
      createdAt: { $gte: oneWeekAgo },
    });

    // ====== CHARTS DATA ======

    // User Growth Daily (last 7 days)
    const userGrowthDaily = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const signups = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });
      
      userGrowthDaily.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups,
      });
    }

    // Content Per Day (last 7 days)
    const contentPerDay = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const posts = await Post.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });
      
      const videos = await Video.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });
      
      contentPerDay.push({
        date: daysOfWeek[date.getDay()],
        posts,
        videos,
      });
    }

    // Reports Breakdown by Type
    const userReports = await Report.countDocuments({ reportType: "user" });
    const contentReports = await Report.countDocuments({ reportType: "content" });
    
    // Break down content reports by contentType
    const postReports = await Report.countDocuments({ 
      reportType: "content",
      contentType: "post" 
    });
    const videoReports = await Report.countDocuments({ 
      reportType: "content",
      contentType: "video" 
    });

    const reportsByType = [
      { name: 'User Reports', value: userReports },
      { name: 'Post Reports', value: postReports },
      { name: 'Video Reports', value: videoReports },
    ];

    // Active Users Over Time (last 5 weeks)
    const activeUsersOverTime = [];
    for (let i = 4; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      
      const postsInWeek = await Post.distinct("user", {
        createdAt: { $gte: weekStart, $lte: weekEnd },
      });
      const videosInWeek = await Video.distinct("user", {
        createdAt: { $gte: weekStart, $lte: weekEnd },
      });
      const activeInWeek = new Set([
        ...postsInWeek.map((id) => id.toString()),
        ...videosInWeek.map((id) => id.toString()),
      ]).size;
      
      activeUsersOverTime.push({
        date: `Week ${5 - i}`,
        active: activeInWeek,
      });
    }

    // ====== RESPONSE ======
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        userGrowthPercent,
        activeUsers,
        activeUserGrowthPercent,
        newSignupsToday,
        pendingReportsThisWeek,
      },
      charts: {
        userGrowthDaily,
        contentPerDay,
        reportsByType,
        activeUsersOverTime,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics data",
      error: error.message,
    });
  }
};