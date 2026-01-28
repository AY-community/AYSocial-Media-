// ============================================
// FEED CONTROLLER - IMPROVED VERSION
// ============================================

const Post = require("../Models/Post");
const Video = require("../Models/Video");
const User = require("../Models/User");

const calculateEngagementScore = (item, currentUserId) => {
  const ageInHours = (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60);
  
  const likes = item.likes?.length || 0;
  const comments = item.comments?.length || 0;
  const totalEngagement = likes + (comments * 2);
  
  const recencyScore = Math.max(0, 100 - ageInHours);
  const engagementRate = ageInHours > 0 ? totalEngagement / ageInHours : totalEngagement;
  const hasMediaBonus = item.images?.length > 0 || item.videoUrl ? 10 : 0;
  
  const userLiked = item.likes?.some(like => like.user?.toString() === currentUserId.toString());
  const alreadyEngagedPenalty = userLiked ? -20 : 0;
  
  const score = (engagementRate * 10) + recencyScore + hasMediaBonus + alreadyEngagedPenalty;
  
  return score;
};

const formatContent = (item, currentUserId, currentUser, type = "post") => {
  const userLiked = item.likes?.some(like => like.user?.toString() === currentUserId.toString());
  const userSaved = currentUser?.savedPosts?.some(saved => saved.post?.toString() === item._id.toString()) ||
                    currentUser?.savedVideos?.some(saved => saved.video?.toString() === item._id.toString());
  const isFollowing = currentUser?.following.some(f => f.following.toString() === item.user._id.toString());
  
  return {
    _id: item._id,
    type,
    description: item.description,
    images: item.images || [],
    videoUrl: item.videoUrl || null,
    duration: item.duration || null,
    likesCount: item.likes?.length || 0,
    commentsCount: item.comments?.length || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    user: {
      _id: item.user._id,
      userName: item.user.userName,
      name: item.user.name,
      profilePic: item.user.profilePic,
      verification: item.user.verification,
      privacySettings: item.user.privacySettings,
    },
    userLiked,
    userSaved,
    isFollowing,
  };
};

exports.getForYouFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(userId).select("following blockedUsers blockedBy savedPosts savedVideos");
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const followingIds = currentUser.following.map(f => f.following);
    const blockedUserIds = [...currentUser.blockedUsers, ...currentUser.blockedBy];

    // Fetch more posts initially to have better content for ranking
    const posts = await Post.find({
      user: { 
        $nin: blockedUserIds
      }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .limit(limit * 3) // Fetch 3x to ensure enough after scoring
    .lean();

    const videos = await Video.find({
      user: { 
        $nin: blockedUserIds 
      }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .limit(Math.ceil(limit * 0.5)) // Fetch more videos
    .lean();

    // Score and rank posts
    const scoredPosts = posts.map(post => ({
      ...post,
      score: calculateEngagementScore(post, userId),
      isFollowing: followingIds.some(id => id.toString() === post.user._id.toString())
    }));

    // Boost posts from followed users
    scoredPosts.forEach(post => {
      if (post.isFollowing) {
        post.score += 30;
      }
    });

    // Sort by score and apply pagination
    const rankedPosts = scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit);

    // Dynamic post/video ratio
    const postsToInclude = Math.ceil(limit * 0.7);
    const videosToInclude = Math.floor(limit * 0.3);

    const selectedPosts = rankedPosts.slice(0, postsToInclude);
    const selectedVideos = videos.slice(0, videosToInclude);

    // Format content
    const formattedPosts = selectedPosts.map(post => formatContent(post, userId, currentUser, "post"));
    const formattedVideos = selectedVideos.map(video => formatContent(video, userId, currentUser, "video"));

    // Shuffle feed for variety
    const feed = [...formattedPosts, ...formattedVideos].sort(() => Math.random() - 0.5);

    res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        hasMore: posts.length > skip + limit,
        totalPosts: posts.length
      }
    });

  } catch (error) {
    console.error("Error fetching For You feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feed",
      error: error.message
    });
  }
};

exports.getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(userId).select("following blockedUsers blockedBy savedPosts savedVideos");
    
    const followingIds = currentUser.following.map(f => f.following);
    const blockedUserIds = [...currentUser.blockedUsers, ...currentUser.blockedBy];

    if (followingIds.length === 0) {
      return res.status(200).json({
        success: true,
        feed: [],
        message: "You're not following anyone yet",
        pagination: { page, limit, hasMore: false }
      });
    }

    // Fetch posts
    const posts = await Post.find({
      user: { 
        $in: followingIds,
        $nin: blockedUserIds 
      }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    // Fetch videos
    const videos = await Video.find({
      user: { 
        $in: followingIds,
        $nin: blockedUserIds 
      }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.floor(limit * 0.3))
    .lean();

    const formattedPosts = posts.map(post => formatContent(post, userId, currentUser, "post"));
    const formattedVideos = videos.map(video => formatContent(video, userId, currentUser, "video"));

    const feed = [...formattedPosts, ...formattedVideos]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });

  } catch (error) {
    console.error("Error fetching Following feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feed",
      error: error.message
    });
  }
};

exports.getPopularFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const timeframe = req.query.timeframe || "week";

    const now = new Date();
    let dateThreshold;
    switch(timeframe) {
      case "day":
        dateThreshold = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case "week":
        dateThreshold = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        dateThreshold = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateThreshold = new Date(0);
    }

    const currentUser = await User.findById(userId).select("following blockedUsers blockedBy savedPosts savedVideos");
    const blockedUserIds = [...currentUser.blockedUsers, ...currentUser.blockedBy];

    const posts = await Post.find({
      createdAt: { $gte: dateThreshold },
      user: { $nin: blockedUserIds }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .limit(limit * 2)
    .lean();

    const videos = await Video.find({
      createdAt: { $gte: dateThreshold },
      user: { $nin: blockedUserIds }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .limit(Math.floor(limit * 0.5))
    .lean();

    const formattedPosts = posts.map(post => formatContent(post, userId, currentUser, "post"));
    const formattedVideos = videos.map(video => formatContent(video, userId, currentUser, "video"));

    const allContent = [...formattedPosts, ...formattedVideos];
    
    // Sort by engagement (likes + comments)
    const feed = allContent
      .sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
      .slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        hasMore: allContent.length > skip + limit
      },
      timeframe
    });

  } catch (error) {
    console.error("Error fetching Popular feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feed",
      error: error.message
    });
  }
};

// ============================================
// EXPLORE FEED CONTROLLER - INSTAGRAM STYLE
// ============================================

const formatExploreContent = (item, type = "post") => {
  // For explore grid, we only need thumbnail/image info
  return {
    _id: item._id,
    type,
    thumbnail: type === "post" 
      ? (item.images && item.images[0]) 
      : item.videoUrl, // For videos, you might want to generate thumbnails
    likesCount: item.likes?.length || 0,
    commentsCount: item.comments?.length || 0,
    isVideo: type === "video",
    user: {
      _id: item.user._id,
      userName: item.user.userName,
      profilePic: item.user.profilePic
    }
  };
};

exports.getExploreFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30; // Instagram loads ~30 items
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(userId).select("following blockedUsers blockedBy");
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const followingIds = currentUser.following.map(f => f.following);
    const blockedUserIds = [...currentUser.blockedUsers, ...currentUser.blockedBy];

    // Fetch posts from users NOT followed (explore new content)
    const posts = await Post.find({
      user: { 
        $nin: [...followingIds, ...blockedUserIds, userId]
      },
      images: { $exists: true, $ne: [] }, // Only posts with images
    })
    .populate("user", "userName profilePic")
    .lean();

    // Fetch videos
    const videos = await Video.find({
      user: { 
        $nin: [...followingIds, ...blockedUserIds, userId]
      },
      videoUrl: { $exists: true, $ne: null },
    })
    .populate("user", "userName profilePic")
    .lean();

    // Score content for exploration (mix of popular + fresh + random)
    const scoreContent = (item) => {
      const ageInHours = (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60);
      const engagement = (item.likes?.length || 0) + ((item.comments?.length || 0) * 2);
      
      // Fresh content bonus (less than 24h gets boost)
      const recencyBonus = ageInHours < 24 ? 50 : (ageInHours < 168 ? 20 : 0);
      
      // Logarithmic scaling prevents viral posts from dominating
      const engagementScore = Math.log(engagement + 1) * 10;
      
      // Randomness for variety (30% random factor)
      const randomness = Math.random() * 30;
      
      return engagementScore + recencyBonus + randomness;
    };

    // Combine and score all content
    const allContent = [
      ...posts.map(p => ({ ...p, type: 'post', score: scoreContent(p) })),
      ...videos.map(v => ({ ...v, type: 'video', score: scoreContent(v) }))
    ];

    // Sort by score and apply pagination
    const sortedContent = allContent
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit);

    // Format for explore grid
    const feed = sortedContent.map(item => 
      formatExploreContent(item, item.type)
    );

    res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        hasMore: allContent.length > skip + limit,
        total: allContent.length
      }
    });

  } catch (error) {
    console.error("Error fetching Explore feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch explore feed",
      error: error.message
    });
  }
};

const calculateReelsScore = (video, currentUserId, userInteractions = {}) => {
  const now = Date.now();
  const ageInHours = (now - new Date(video.createdAt)) / (1000 * 60 * 60);
  
  const likes = video.likes?.length || 0;
  const comments = video.comments?.length || 0;
  const shares = video.sharesCount || 0;
  const views = video.viewsCount || 1;
  
  const engagementRate = ((likes + (comments * 3) + (shares * 5)) / views) * 100;
  const completionRate = video.completionRate || 50;
  
  const avgWatchTime = video.avgWatchTime || video.duration * 0.5;
  const watchTimeScore = (avgWatchTime / video.duration) * 100;
  
  const engagementVelocity = ageInHours > 0 
    ? (likes + comments + shares) / ageInHours 
    : (likes + comments + shares);
  
  let recencyMultiplier = 1;
  if (ageInHours < 2) recencyMultiplier = 2.5;
  else if (ageInHours < 12) recencyMultiplier = 2;
  else if (ageInHours < 24) recencyMultiplier = 1.5;
  else if (ageInHours < 72) recencyMultiplier = 1.2;
  
  const durationScore = video.duration >= 15 && video.duration <= 60 ? 20 : 10;
  const hasGoodThumbnail = video.thumbnail ? 10 : 0;
  const hasCaption = video.description && video.description.length > 10 ? 5 : 0;
  
  const alreadyWatched = userInteractions.watched ? -10 : 0;
  const userLiked = video.likes?.some(like => like.user?.toString() === currentUserId.toString()) ? -15 : 0;
  const userCommented = userInteractions.commented ? -10 : 0;
  
  const baseScore = (
    (engagementRate * 3) +
    (completionRate * 2) +
    (watchTimeScore * 2) +
    (engagementVelocity * 5) +
    durationScore +
    hasGoodThumbnail +
    hasCaption +
    alreadyWatched +
    userLiked +
    userCommented
  );
  
  const finalScore = baseScore * recencyMultiplier;
  
  return {
    score: finalScore,
    breakdown: {
      engagementRate,
      completionRate,
      watchTimeScore,
      engagementVelocity,
      recencyMultiplier,
      ageInHours: ageInHours.toFixed(2)
    }
  };
};

// FIXED: This function was preventing videos from same creator
const diversifyFeed = (videos, userId) => {
  const diversified = [];
  const creatorCount = {};
  const viralityBuckets = { high: [], medium: [], low: [] };
  
  // Categorize videos by virality
  videos.forEach(video => {
    const viralityScore = (video.likes?.length || 0) + ((video.comments?.length || 0) * 2);
    if (viralityScore > 1000) viralityBuckets.high.push(video);
    else if (viralityScore > 100) viralityBuckets.medium.push(video);
    else viralityBuckets.low.push(video);
  });
  
  const maxLength = Math.max(
    viralityBuckets.high.length,
    viralityBuckets.medium.length,
    viralityBuckets.low.length
  );
  
  for (let i = 0; i < maxLength; i++) {
    // Always add high virality videos
    if (viralityBuckets.high[i]) {
      diversified.push(viralityBuckets.high[i]);
    }
    
    // Add medium virality videos with light creator diversity check
    if (viralityBuckets.medium[i]) {
      const mediumVideo = viralityBuckets.medium[i];
      const creatorId = mediumVideo.user._id.toString();
      const count = creatorCount[creatorId] || 0;
      
      // Allow up to 3 videos per creator in medium bucket
      if (count < 3) {
        diversified.push(mediumVideo);
        creatorCount[creatorId] = count + 1;
      }
    }
    
    // Add low virality videos occasionally
    if (viralityBuckets.low[i] && Math.random() > 0.5) {
      diversified.push(viralityBuckets.low[i]);
    }
  }
  
  return diversified;
};

const formatReelsContent = (video, currentUserId, currentUser) => {
  const userLiked = video.likes?.some(like => like.user?.toString() === currentUserId.toString());
  const userSaved = currentUser?.savedVideos?.some(saved => saved.video?.toString() === video._id.toString());
  
  const isFollowing = currentUser?.following?.some(
    f => f.following?.toString() === video.user._id.toString()
  );
  
  const hasSentRequest = currentUser?.sentFollowRequests?.some(
    req => req.recipient?.toString() === video.user._id.toString()
  );
  
  return {
    _id: video._id,
    videoUrl: video.videoUrl,
    thumbnail: video.thumbnail,
    description: video.description,
    duration: video.duration,
    likesCount: video.likes?.length || 0,
    commentsCount: video.comments?.length || 0,
    sharesCount: video.sharesCount || 0,
    viewsCount: video.viewsCount || 0,
    createdAt: video.createdAt,
    user: {
      _id: video.user._id,
      userName: video.user.userName,
      name: video.user.name,
      profilePic: video.user.profilePic,
      verification: video.user.verification,
      privacySettings: video.user.privacySettings,
      isFollowing,
      hasSentRequest
    },
    userLiked,
    userSaved,
    _meta: video._meta
  };
};

exports.getReelsFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const seed = req.query.seed || Date.now();

    const currentUser = await User.findById(userId).select(
      "following blockedUsers blockedBy savedVideos interests watchHistory sentFollowRequests"
    );
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const followingIds = currentUser.following.map(f => f.following);
    const blockedUserIds = [...currentUser.blockedUsers, ...currentUser.blockedBy];
    const watchedVideoIds = currentUser.watchHistory?.map(w => w.video) || [];

    // INCREASED from limit * 5 to limit * 10 for more pool
    const videoPool = await Video.find({
      user: { $nin: blockedUserIds },
      videoUrl: { $exists: true, $ne: null }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .limit(limit * 10) // CHANGED HERE
    .lean();

    if (videoPool.length === 0) {
      return res.status(200).json({
        success: true,
        feed: [],
        message: "No more reels available",
        pagination: { page, limit, hasMore: false }
      });
    }

    const scoredVideos = videoPool.map(video => {
      const scoreData = calculateReelsScore(video, userId, {
        watched: watchedVideoIds.includes(video._id)
      });
      
      const isFollowing = followingIds.some(id => id.toString() === video.user._id.toString());
      const followingBoost = isFollowing ? 40 : 0;
      
      return {
        ...video,
        _meta: {
          ...scoreData.breakdown,
          finalScore: scoreData.score + followingBoost,
          isFollowing
        },
        finalScore: scoreData.score + followingBoost
      };
    });

    const rankedVideos = scoredVideos.sort((a, b) => b.finalScore - a.finalScore);
    
    // OPTION 1: Disable diversification completely (shows all videos)
    // const paginatedVideos = rankedVideos.slice(skip, skip + limit);
    
    // OPTION 2: Use diversification but with better logic
    const diversifiedVideos = diversifyFeed(rankedVideos, userId);
    const paginatedVideos = diversifiedVideos.slice(skip, skip + limit);
    
    const feed = paginatedVideos.map(video => 
      formatReelsContent(video, userId, currentUser)
    );

    console.log(`Page ${page}: Returning ${feed.length} reels, Total in pool: ${videoPool.length}`);

    res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        hasMore: diversifiedVideos.length > skip + limit,
        totalInPool: videoPool.length,
        totalDiversified: diversifiedVideos.length,
        seed
      }
    });

  } catch (error) {
    console.error("Error fetching Reels feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reels feed",
      error: error.message
    });
  }
};

exports.getFollowingReelsFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(userId).select(
      "following blockedUsers blockedBy savedVideos sentFollowRequests"
    );
    
    const followingIds = currentUser.following.map(f => f.following);
    const blockedUserIds = [...currentUser.blockedUsers, ...currentUser.blockedBy];

    if (followingIds.length === 0) {
      return res.status(200).json({
        success: true,
        feed: [],
        message: "Follow creators to see their reels",
        pagination: { page, limit, hasMore: false }
      });
    }

    const videos = await Video.find({
      user: { 
        $in: followingIds,
        $nin: blockedUserIds 
      },
      videoUrl: { $exists: true, $ne: null }
    })
    .populate("user", "userName name profilePic verification privacySettings")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const feed = videos.map(video => formatReelsContent(video, userId, currentUser));

    res.status(200).json({
      success: true,
      feed,
      pagination: {
        page,
        limit,
        hasMore: videos.length === limit
      }
    });

  } catch (error) {
    console.error("Error fetching Following Reels feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch following reels feed",
      error: error.message
    });
  }
};

exports.trackReelView = async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId, watchTime, completed } = req.body;

    await Video.findByIdAndUpdate(videoId, {
      $inc: { viewsCount: 1 },
      $push: {
        views: {
          user: userId,
          watchTime,
          completed,
          timestamp: new Date()
        }
      }
    });

    await User.findByIdAndUpdate(userId, {
      $push: {
        watchHistory: {
          video: videoId,
          watchTime,
          completed,
          timestamp: new Date()
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "View tracked"
    });

  } catch (error) {
    console.error("Error tracking reel view:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track view",
      error: error.message
    });
  }
};


exports.getFeedItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const currentUser = await User.findById(userId).select("savedPosts savedVideos following");

    let item = await Post.findById(id).populate("user", "userName name profilePic verification privacySettings").lean();
    let itemType = "post";

    if (!item) {
      item = await Video.findById(id).populate("user", "userName name profilePic verification privacySettings").lean();
      itemType = "video";
    }

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const formattedItem = formatContent(item, userId, currentUser, itemType);

    res.status(200).json({
      success: true,
      item: formattedItem,
    });
  } catch (error) {
    console.error("Error fetching feed item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch item",
      error: error.message,
    });
  }
};

exports.addSearchToHistory = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Search text is required",
      });
    }

    const user = await User.findById(req.user.id);
    
    // Prevent duplicate consecutive searches
    if (user.searchHistory.length > 0 && user.searchHistory[0].text === text) {
      return res.status(200).json({
        success: true,
        message: "Search already at top of history",
      });
    }

    // Remove existing entry to move it to the top
    user.searchHistory = user.searchHistory.filter(item => item.text !== text);

    // Add new search to the beginning
    user.searchHistory.unshift({ text });

    // Limit history to 20 items
    if (user.searchHistory.length > 20) {
      user.searchHistory = user.searchHistory.slice(0, 20);
    }

    await user.save();

    res.status(201).json({
      success: true,
      history: user.searchHistory,
    });
  } catch (error) {
    console.warn("Error adding to search history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add to search history",
      error: error.message,
    });
  }
};

exports.getSearchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('searchHistory');
    const sortedHistory = user.searchHistory.sort((a, b) => b.searchedAt - a.searchedAt);
    res.status(200).json({
      success: true,
      history: sortedHistory,
    });
  } catch (error) {
    console.error("Error fetching search history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch search history",
      error: error.message,
    });
  }
};

exports.clearSearchHistory = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { searchHistory: [] },
    });
    res.status(200).json({
      success: true,
      message: "Search history cleared",
    });
  } catch (error) {
    console.error("Error clearing search history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear search history",
      error: error.message,
    });
  }
};

exports.removeSearchItem = async (req, res) => {
  try {
    const { searchId } = req.params;
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { searchHistory: { _id: searchId } },
    });
    res.status(200).json({
      success: true,
      message: "Search item removed",
    });
  } catch (error) {
    console.error("Error removing search item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove search item",
      error: error.message,
    });
  }
};


exports.searchAll = async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?._id;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, "i");

    // Get user's blocked users and users who blocked them
    let blockedUserIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select("blockedUsers blockedBy");
      if (currentUser) {
        blockedUserIds = [
          ...currentUser.blockedUsers.map((id) => id.toString()),
          ...currentUser.blockedBy.map((id) => id.toString()),
        ];
      }
    }

    // Search Posts
    const posts = await Post.find({
      $or: [
        { description: searchRegex },
      ],
      user: { $nin: blockedUserIds },
    })
      .populate("user", "userName name profilePic")
      .sort({ createdAt: -1 })
      .limit(Math.floor(parseInt(limit) / 3))
      .lean();

    // Search Videos
    const videos = await Video.find({
      $or: [
        { description: searchRegex },
      ],
      user: { $nin: blockedUserIds },
    })
      .populate("user", "userName name profilePic")
      .sort({ createdAt: -1 })
      .limit(Math.floor(parseInt(limit) / 3))
      .lean();

    // Search Users
    const users = await User.find({
      $or: [
        { userName: searchRegex },
        { name: searchRegex },
        { bio: searchRegex },
      ],
      _id: { $nin: blockedUserIds },
    })
      .select("userName name profilePic bio followersCount")
      .sort({ followersCount: -1 })
      .limit(Math.floor(parseInt(limit) / 3))
      .lean();

    // Format posts
    const formattedPosts = posts.map((post) => ({
      _id: post._id,
      type: "post",
      description: post.description,
      images: post.images,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      userLiked: userId ? post.likes.some((like) => like.user.toString() === userId.toString()) : false,
      userSaved: userId ? false : false, // Will check saved posts if needed
      createdAt: post.createdAt,
      user: post.user,
    }));

    // Format videos
    const formattedVideos = videos.map((video) => ({
      _id: video._id,
      type: "video",
      description: video.description,
      videoUrl: video.videoUrl,
      duration: video.duration,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      userLiked: userId ? video.likes.some((like) => like.user.toString() === userId.toString()) : false,
      userSaved: userId ? false : false, // Will check saved videos if needed
      createdAt: video.createdAt,
      user: video.user,
    }));

    // Check if user has saved posts/videos
    if (userId) {
      const currentUser = await User.findById(userId).select("savedPosts savedVideos");
      
      formattedPosts.forEach((post) => {
        post.userSaved = currentUser.savedPosts.some((saved) => saved.post.toString() === post._id.toString());
      });

      formattedVideos.forEach((video) => {
        video.userSaved = currentUser.savedVideos.some((saved) => saved.video.toString() === video._id.toString());
      });
    }

    // Combine and sort by createdAt
    const combinedResults = [...formattedPosts, ...formattedVideos].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      results: {
        posts: formattedPosts,
        videos: formattedVideos,
        users: users,
        combined: combinedResults,
      },
      counts: {
        posts: formattedPosts.length,
        videos: formattedVideos.length,
        users: users.length,
        total: formattedPosts.length + formattedVideos.length + users.length,
      },
    });
  } catch (error) {
    console.error("Error in searchAll:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching",
    });
  }
};

// Search Posts Only
exports.searchPosts = async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?._id;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, "i");

    // Get blocked users
    let blockedUserIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select("blockedUsers blockedBy savedPosts");
      if (currentUser) {
        blockedUserIds = [
          ...currentUser.blockedUsers.map((id) => id.toString()),
          ...currentUser.blockedBy.map((id) => id.toString()),
        ];
      }
    }

    const posts = await Post.find({
      $or: [
        { description: searchRegex },
      ],
      user: { $nin: blockedUserIds },
    })
      .populate("user", "userName name profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalPosts = await Post.countDocuments({
      $or: [
        { description: searchRegex },
      ],
      user: { $nin: blockedUserIds },
    });

    // Format posts
    const formattedPosts = posts.map((post) => ({
      _id: post._id,
      type: "post",
      description: post.description,
      images: post.images,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      userLiked: userId ? post.likes.some((like) => like.user.toString() === userId.toString()) : false,
      userSaved: false,
      createdAt: post.createdAt,
      user: post.user,
    }));

    // Check saved posts
    if (userId) {
      const currentUser = await User.findById(userId).select("savedPosts");
      formattedPosts.forEach((post) => {
        post.userSaved = currentUser.savedPosts.some((saved) => saved.post.toString() === post._id.toString());
      });
    }

    res.status(200).json({
      success: true,
      posts: formattedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / parseInt(limit)),
        totalPosts,
        hasMore: skip + posts.length < totalPosts,
      },
    });
  } catch (error) {
    console.error("Error in searchPosts:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching posts",
    });
  }
};

// Search Videos Only
exports.searchVideos = async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?._id;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, "i");

    // Get blocked users
    let blockedUserIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select("blockedUsers blockedBy savedVideos");
      if (currentUser) {
        blockedUserIds = [
          ...currentUser.blockedUsers.map((id) => id.toString()),
          ...currentUser.blockedBy.map((id) => id.toString()),
        ];
      }
    }

    const videos = await Video.find({
      $or: [
        { description: searchRegex },
      ],
      user: { $nin: blockedUserIds },
    })
      .populate("user", "userName name profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalVideos = await Video.countDocuments({
      $or: [
        { description: searchRegex },
      ],
      user: { $nin: blockedUserIds },
    });

    // Format videos
    const formattedVideos = videos.map((video) => ({
      _id: video._id,
      type: "video",
      description: video.description,
      videoUrl: video.videoUrl,
      duration: video.duration,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      userLiked: userId ? video.likes.some((like) => like.user.toString() === userId.toString()) : false,
      userSaved: false,
      createdAt: video.createdAt,
      user: video.user,
    }));

    // Check saved videos
    if (userId) {
      const currentUser = await User.findById(userId).select("savedVideos");
      formattedVideos.forEach((video) => {
        video.userSaved = currentUser.savedVideos.some((saved) => saved.video.toString() === video._id.toString());
      });
    }

    res.status(200).json({
      success: true,
      videos: formattedVideos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVideos / parseInt(limit)),
        totalVideos,
        hasMore: skip + videos.length < totalVideos,
      },
    });
  } catch (error) {
    console.error("Error in searchVideos:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching videos",
    });
  }
};

// Search Users Only
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?._id;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, "i");

    // Get blocked users
    let blockedUserIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select("blockedUsers blockedBy");
      if (currentUser) {
        blockedUserIds = [
          ...currentUser.blockedUsers.map((id) => id.toString()),
          ...currentUser.blockedBy.map((id) => id.toString()),
          userId.toString(), // Exclude current user from results
        ];
      }
    }

    const users = await User.find({
      $or: [
        { userName: searchRegex },
        { name: searchRegex },
        { bio: searchRegex },
      ],
      _id: { $nin: blockedUserIds },
    })
      .select("userName name profilePic bio followersCount country")
      .sort({ followersCount: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalUsers = await User.countDocuments({
      $or: [
        { userName: searchRegex },
        { name: searchRegex },
        { bio: searchRegex },
      ],
      _id: { $nin: blockedUserIds },
    });

    res.status(200).json({
      success: true,
      users: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasMore: skip + users.length < totalUsers,
      },
    });
  } catch (error) {
    console.error("Error in searchUsers:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching users",
    });
  }
};




