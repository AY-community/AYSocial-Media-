const User = require("../Models/User");
const Post = require("../Models/Post");
const Video = require("../Models/Video");

const getDashboardAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    
    const last30DaysStart = new Date(now);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    
    const previous30DaysStart = new Date(now);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 60);
    const previous30DaysEnd = new Date(now);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 30);

    const posts = await Post.find({ user: userId });
    const videos = await Video.find({ user: userId });

    const currentFollowers = user.followers?.filter(
      (f) => f.createdAt >= last30DaysStart
    ).length || 0;
    
    const previousFollowers = user.followers?.filter(
      (f) => f.createdAt >= previous30DaysStart && f.createdAt < previous30DaysEnd
    ).length || 0;

    const currentPosts = posts.filter(p => p.createdAt >= last30DaysStart).length;
    const previousPosts = posts.filter(
      p => p.createdAt >= previous30DaysStart && p.createdAt < previous30DaysEnd
    ).length;

    const currentVideos = videos.filter(v => v.createdAt >= last30DaysStart).length;
    const previousVideos = videos.filter(
      v => v.createdAt >= previous30DaysStart && v.createdAt < previous30DaysEnd
    ).length;

    let currentLikes = 0;
    let previousLikes = 0;

    posts.forEach(p => {
      if (p.likes) {
        currentLikes += p.likes.filter(like => like.createdAt >= last30DaysStart).length;
        previousLikes += p.likes.filter(
          like => like.createdAt >= previous30DaysStart && like.createdAt < previous30DaysEnd
        ).length;
      }
    });

    videos.forEach(v => {
      if (v.likes) {
        currentLikes += v.likes.filter(like => like.createdAt >= last30DaysStart).length;
        previousLikes += v.likes.filter(
          like => like.createdAt >= previous30DaysStart && like.createdAt < previous30DaysEnd
        ).length;
      }
    });

    let currentComments = 0;
    let previousComments = 0;

    posts.forEach(p => {
      if (p.comments) {
        currentComments += p.comments.filter(c => c.createdAt >= last30DaysStart).length;
        previousComments += p.comments.filter(
          c => c.createdAt >= previous30DaysStart && c.createdAt < previous30DaysEnd
        ).length;
      }
    });

    videos.forEach(v => {
      if (v.comments) {
        currentComments += v.comments.filter(c => c.createdAt >= last30DaysStart).length;
        previousComments += v.comments.filter(
          c => c.createdAt >= previous30DaysStart && c.createdAt < previous30DaysEnd
        ).length;
      }
    });

    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? "+100%" : "0%";
      }
      const change = ((current - previous) / previous) * 100;
      return change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
    };

    const totalPostLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
    const totalVideoLikes = videos.reduce((sum, v) => sum + (v.likes?.length || 0), 0);
    const totalLikes = totalPostLikes + totalVideoLikes;

    const totalPostComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
    const totalVideoComments = videos.reduce((sum, v) => sum + (v.comments?.length || 0), 0);
    const totalComments = totalPostComments + totalVideoComments;

    const topPosts = posts
      .map((p) => ({
        _id: p._id,
        title: p.description || "Untitled",
        likes: p.likes?.length || 0,
        comments: p.comments?.length || 0,
        image: p.image || p.images?.[0] || p.media?.[0] || null,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3);

    const topVideos = videos
      .map((v) => ({
        _id: v._id,
        title: v.description || "Untitled",
        likes: v.likes?.length || 0,
        comments: v.comments?.length || 0,
        videoUrl: v.videoUrl,
        createdAt: v.createdAt,
      }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3);

    console.log("Top Posts with images check:", topPosts.map(p => ({ id: p._id, image: p.image })));
    console.log("Top Videos with videoUrl check:", topVideos.map(v => ({ id: v._id, videoUrl: v.videoUrl })));

    const chartData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      let dayLikes = 0;
      
      posts.forEach(p => {
        if (p.likes) {
          dayLikes += p.likes.filter(like => {
            const likeDate = new Date(like.createdAt);
            return likeDate >= date && likeDate < nextDate;
          }).length;
        }
      });

      videos.forEach(v => {
        if (v.likes) {
          dayLikes += v.likes.filter(like => {
            const likeDate = new Date(like.createdAt);
            return likeDate >= date && likeDate < nextDate;
          }).length;
        }
      });

      chartData.push({
        day: 30 - i,
        value: dayLikes,
      });
    }

    const summary = {
      followers: user.followers?.length || 0,
      posts: posts.length,
      videos: videos.length,
      likes: totalLikes,
      comments: totalComments,
      changes: {
        followers: calculateChange(currentFollowers, previousFollowers),
        posts: calculateChange(currentPosts, previousPosts),
        videos: calculateChange(currentVideos, previousVideos),
        likes: calculateChange(currentLikes, previousLikes),
        comments: calculateChange(currentComments, previousComments),
      }
    };

    res.status(200).json({
      summary,
      topPosts,
      topVideos,
      chartData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = { getDashboardAnalytics };
