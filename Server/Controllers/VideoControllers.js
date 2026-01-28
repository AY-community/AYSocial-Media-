const multer = require("multer");
const cloudinary = require("../Config/Cloudinary");
const User = require("../Models/User");
const Post = require("../Models/Post");
const Video = require("../Models/Video");
const Notification = require("../Models/Notification");
const fs = require('fs');
const path = require('path');


const getVideoController = async (req, res) => {
  try {
    const { userName } = req.params;
    const { currentUserId, page = 0, limit } = req.query;
    const skip = parseInt(page) * parseInt(limit);

    const user = await User.findOne({ userName });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.followers.some(
      follower => follower.follower && follower.follower.toString() === currentUserId
    );

    if (user.privacySettings.isAccountPrivate && user._id.toString() !== currentUserId && !isFollowing) {
      return res.status(200).json({
        videos: [],
        hasMore: false,
        totalVideos: 0,
        currentPage: parseInt(page),
        totalPages: 0,
        isPrivate: true,
      });
    }

    const currentUser = await User.findById(currentUserId);
    const userSavedVideos = currentUser?.savedVideos || [];

    // Block check: if either user blocked the other, hide videos
    if (currentUser && user && (
      (currentUser.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (currentUser.blockedBy || []).some(id => id.toString() === user._id.toString()) ||
      (user.blockedUsers || []).some(id => id.toString() === currentUser._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === currentUser._id.toString())
    )) {
      return res.status(200).json({
        videos: [],
        hasMore: false,
        totalVideos: 0,
        currentPage: parseInt(page),
        totalPages: 0
      });
    }

    const totalVideos = await Video.countDocuments({ user: user._id });

    let videos = await Video.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    videos = videos.map((video) => ({
      ...video.toObject(),
      likesCount: video.likes?.length || 0,
      commentsCount: video.comments?.length || 0,
      isSaved: userSavedVideos.some(savedVideo => savedVideo.video?.toString() === video._id.toString()) || false,
      isLiked: video.likes?.some(like => like.user?.toString() === currentUserId || like.toString() === currentUserId) || false,
    }));

    const hasMore = skip + parseInt(limit) < totalVideos;

    return res.status(200).json({
      videos,
      hasMore,
      totalVideos,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalVideos / parseInt(limit)),
    });
  } catch (err) {
    return res.status(500).json({ message: "internal server error" });
  }
};

const getSavedVideoController = async (req, res) => {
  try {
    const { userName } = req.params;
    const { currentUserId, page = 0, limit } = req.query;
    const skip = parseInt(page) * parseInt(limit);

    const user = await User.findOne({ userName });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = await User.findById(currentUserId);
    const userSavedVideos = currentUser?.savedVideos || [];
    const totalVideos = userSavedVideos.length;

    let savedVideoIds = userSavedVideos.map(savedVideo => savedVideo.video);
    let videos = await Video.find({ _id: { $in: savedVideoIds } })
      .populate('user', 'userName fullName profilePicture verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    videos = videos.map((video) => ({
      ...video.toObject(),
      likesCount: video.likes?.length || 0,
      commentsCount: video.comments?.length || 0,
      isLiked: video.likes?.includes(currentUserId) || false,
      isSaved: true,
      likes: undefined,
      comments: undefined,
    }));

    const hasMore = skip + parseInt(limit) < totalVideos;

    return res.status(200).json({
      videos,
      hasMore,
      totalVideos
    });
  } catch (err) {
    console.error('Error in getSavedVideoController:', err);
    return res.status(500).json({ message: "internal server error" });
  }
};

const addVideoController = async (req, res) => {
  try {
    const { videoText } = req.body;
    const { userName } = req.params;

    const user = await User.findOne({ userName: userName });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded." });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "ay-social/videos",
            resource_type: "video",
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const uploadResult = await streamUpload();
    const videoLink = uploadResult.secure_url;

    const duration = Math.floor(uploadResult.duration || 0);

    if (duration > 90) {
      try {
        await cloudinary.uploader.destroy(uploadResult.public_id, {
          resource_type: "video",
        });
      } catch (deleteError) {
        console.log("Error deleting video", deleteError.message);
      }

      return res.status(400).json({
        message: "Video duration is more than 1 minute and 30 seconds",
      });
    }

    const newVideo = new Video({
      description: videoText || null,
      videoUrl: videoLink,
      duration: duration,
      user: user._id,
    });
    user.contentCount.videos += 1;


    await user.save();
    await newVideo.save();

    return res.status(200).json({ message: "Video uploaded successfully" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};

const deleteVideoController = async (req, res) => {
  try {
    const { videoId , userId } = req.params;
    const user = await User.findById(userId);

    const videoFoundById = await Video.findById(videoId);

    if (!videoFoundById) {
      return res.status(404).json({ message: "video not found" });
    }

    if (videoFoundById.videoUrl) {
      const cloudinary = require("cloudinary").v2;
      const user = await User.findById(userId);
      const videoUrl = videoFoundById.videoUrl;

      const urlParts = videoUrl.split("/");
      const fileName = urlParts.pop().split(".")[0];
      const publicId = `ay-social/videos/${fileName}`;

      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {}
    }

    user.contentCount.videos -= 1;

    await Video.findByIdAndDelete(videoId);
        await user.save();


    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const editVideoController = async (req, res) => {
  try {
    const { videoId } = req.params;
    let { videoText } = req.body;

    videoText = videoText?.trim();

    const videoFoundById = await Video.findById(videoId);

    if (!videoFoundById) {
      return res.status(404).json({ message: "video not found" });
    }

    await Video.findByIdAndUpdate(videoId, {
      $set: { description: videoText },
    });

    return res.status(200).json({ message: "video updated succesfully" });
  } catch (err) {
    return res.status(500).json({ message: "internal server error" });
  }
};

const addVideoCommentController = async (req, res) => {
  try {
    const { videoId, userId, content } = req.body;

    if (!videoId) {
      return res.status(404).json({ message: "video not found" });
    }

    if (!userId) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!content) {
      return res.status(400).json({ message: "no comment added" });
    }

    const video = await Video.findById(videoId).populate('user', 'userName');
    if (!video) {
      return res.status(404).json({ message: "video not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Block check: disallow comment if either direction is blocked
    const videoAuthorForComment = await User.findById(video.user._id).select('blockedUsers blockedBy');
    const commentBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === videoAuthorForComment._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === videoAuthorForComment._id.toString()) ||
      (videoAuthorForComment.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (videoAuthorForComment.blockedBy || []).some(id => id.toString() === user._id.toString())
    );
    if (commentBlocked) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $push: {
          comments: {
            user: userId,
            content: content,
            createdAt: new Date(),
            likes: [],
            likesCount: 0,
            replies: [],
          },
        },
      },
      { new: true }
    );

    const newCommentId = updatedVideo.comments[updatedVideo.comments.length - 1]._id;

    if (video.user._id.toString() !== userId) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingNotification = await Notification.findOne({
        recipient: video.user._id,
        type: 'video_comment',
        video: videoId,
        updatedAt: { $gte: twentyFourHoursAgo }
      });

      if (existingNotification) {
        if (!existingNotification.actors.some(actorId => actorId.toString() === userId)) {
          existingNotification.actors.push(userId);
          existingNotification.count += 1;
          existingNotification.sender = userId;
          
          if (existingNotification.count === 2) {
            existingNotification.message = `and 1 other commented on your video`;
          } else {
            existingNotification.message = `and ${existingNotification.count - 1} others commented on your video`;
          }
          
          await existingNotification.save();
        }

        const populatedNotification = await Notification.findById(existingNotification._id)
          .populate('sender', 'userName profilePic');
        
        if (global.sendNotificationToUser && populatedNotification) {
          global.sendNotificationToUser(video.user._id.toString(), {
            _id: populatedNotification._id,
            type: 'video_comment',
            message: populatedNotification.message,
            sender: {
              _id: populatedNotification.sender._id,
              userName: populatedNotification.sender.userName,
              profilePic: populatedNotification.sender.profilePic
            },
            video: videoId,
            commentId: newCommentId.toString(),
            count: populatedNotification.count,
            read: false,
            createdAt: populatedNotification.createdAt,
            updatedAt: populatedNotification.updatedAt
          });
        }
      } else {
        const newNotification = await Notification.create({
          recipient: video.user._id,
          sender: userId,
          type: 'video_comment',
          video: videoId,
          commentId: newCommentId.toString(),
          message: `commented on your video`,
          count: 1,
          actors: [userId],
          read: false
        });

        const populatedNotification = await Notification.findById(newNotification._id)
          .populate('sender', 'userName profilePic');

        if (global.sendNotificationToUser && populatedNotification) {
          global.sendNotificationToUser(video.user._id.toString(), {
            _id: populatedNotification._id,
            type: 'video_comment',
            message: populatedNotification.message,
            sender: {
              _id: populatedNotification.sender._id,
              userName: populatedNotification.sender.userName,
              profilePic: populatedNotification.sender.profilePic
            },
            video: videoId,
            commentId: newCommentId.toString(),
            count: 1,
            read: false,
            createdAt: populatedNotification.createdAt,
            updatedAt: populatedNotification.updatedAt
          });
        }
      }
    }

    return res.status(200).json({
      message: "comment added successfully",
      commentId: newCommentId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getVideoCommentsController = async (req, res) => {
  try {
    const { videoId, userId } = req.params;
    const { page = 0 } = req.query;

    const limit = 10;
    const skip = parseInt(page) * limit;

    const videoFoundById = await Video.findById(videoId).populate({
      path: "comments.user",
      select: "userName profilePic",
    }).populate({
      path: "comments.replies.user",
      select: "userName profilePic",
    });

    if (!videoFoundById) {
      return res.status(404).json({ message: "Video not found" });
    }

    const totalComments = videoFoundById.comments.length;

    const paginatedComments = videoFoundById.comments
      .reverse()
      .slice(skip, skip + limit);

    const commentsWithLikedStatus = paginatedComments.map((comment) => {
      const commentObj = comment.toObject();
      return {
        ...commentObj,
        likesCount: comment.likesCount || comment.likes?.length || 0,
        isLiked: comment.likes && comment.likes.some(
          (like) => like.user && like.user.toString() === userId.toString()
        ),
        replies: commentObj.replies ? commentObj.replies.map(reply => ({
          ...reply,
          likesCount: reply.likesCount || reply.likes?.length || 0,
          isLiked: reply.likes && reply.likes.some(like => 
            like.user && like.user.toString() === userId.toString()
          )
        })) : []
      };
    });

    const hasMore = skip + limit < totalComments;

    return res.status(200).json({
      data: commentsWithLikedStatus,
      hasMore,
      totalComments,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalComments / limit),
    });
  } catch (err) {
    console.error("Error fetching video comments:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const toggleVideoLikeCommentController = async (req, res) => {
  try {
    const { commentId } = req.body;
    const { userId } = req.params;

    const video = await Video.findOne({ "comments._id": commentId }).populate('user', 'userName');
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const comment = video.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const alreadyLiked = comment.likes.some(
      (like) => like.user && like.user.toString() === userId.toString()
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (like) => !like.user || like.user.toString() !== userId.toString()
      );
      comment.likesCount--;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingNotification = await Notification.findOne({
        recipient: comment.user,
        type: 'comment_like',
        video: video._id,
        commentId: commentId.toString(),
        updatedAt: { $gte: twentyFourHoursAgo }
      });

      if (existingNotification) {
        existingNotification.actors = existingNotification.actors.filter(
          actorId => actorId.toString() !== userId
        );
        existingNotification.count -= 1;

        if (existingNotification.count === 0) {
          await Notification.deleteOne({ _id: existingNotification._id });
        } else if (existingNotification.count === 1) {
          existingNotification.sender = existingNotification.actors[0];
          existingNotification.message = `liked your comment`;
          await existingNotification.save();

          const populatedNotification = await Notification.findById(existingNotification._id)
            .populate('sender', 'userName profilePic');

          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(comment.user.toString(), {
              _id: populatedNotification._id,
              type: 'comment_like',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              video: video._id,
              commentId: commentId.toString(),
              count: populatedNotification.count,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        } else {
          existingNotification.sender = existingNotification.actors[existingNotification.actors.length - 1];
          existingNotification.message = `and ${existingNotification.count - 1} others liked your comment`;
          await existingNotification.save();

          const populatedNotification = await Notification.findById(existingNotification._id)
            .populate('sender', 'userName profilePic');

          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(comment.user.toString(), {
              _id: populatedNotification._id,
              type: 'comment_like',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              video: video._id,
              commentId: commentId.toString(),
              count: populatedNotification.count,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        }
      }
    } else {
      comment.likes.push({ user: userId, createdAt: new Date() });
      comment.likesCount++;

      if (comment.user.toString() !== userId) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const existingNotification = await Notification.findOne({
          recipient: comment.user,
          type: 'comment_like',
          video: video._id,
          commentId: commentId.toString(),
          updatedAt: { $gte: twentyFourHoursAgo }
        });

        if (existingNotification) {
          if (!existingNotification.actors.some(actorId => actorId.toString() === userId)) {
            existingNotification.actors.push(userId);
            existingNotification.count += 1;
            existingNotification.sender = userId;
            
            if (existingNotification.count === 2) {
              existingNotification.message = `and 1 other liked your comment`;
            } else {
              existingNotification.message = `and ${existingNotification.count - 1} others liked your comment`;
            }
            
            await existingNotification.save();

            const populatedNotification = await Notification.findById(existingNotification._id)
              .populate('sender', 'userName profilePic');

            if (global.sendNotificationToUser && populatedNotification) {
              global.sendNotificationToUser(comment.user.toString(), {
                _id: populatedNotification._id,
                type: 'comment_like',
                message: populatedNotification.message,
                sender: {
                  _id: populatedNotification.sender._id,
                  userName: populatedNotification.sender.userName,
                  profilePic: populatedNotification.sender.profilePic
                },
                video: video._id,
                commentId: commentId.toString(),
                count: populatedNotification.count,
                read: false,
                createdAt: populatedNotification.createdAt,
                updatedAt: populatedNotification.updatedAt
              });
            }
          }
        } else {
          const newNotification = await Notification.create({
            recipient: comment.user,
            sender: userId,
            type: 'comment_like',
            video: video._id,
            commentId: commentId.toString(),
            message: `liked your comment`,
            count: 1,
            actors: [userId],
            read: false
          });

          const populatedNotification = await Notification.findById(newNotification._id)
            .populate('sender', 'userName profilePic');

          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(comment.user.toString(), {
              _id: populatedNotification._id,
              type: 'comment_like',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              video: video._id,
              commentId: commentId.toString(),
              count: 1,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        }
      }
    }

    await video.save();

    return res.status(200).json({
      message: "Toggled comment like successfully",
      likesCount: comment.likes.length,
      isLiked: !alreadyLiked,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deleteVideoCommentController = async (req, res) => {
  try {
    const { videoId, commentId } = req.params;

    const videoFoundById = await Video.findById(videoId);

    if (!videoFoundById) {
      return res.status(404).json({ message: "Video not found" });
    }

    const comment = videoFoundById.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    videoFoundById.comments.pull(commentId);

    videoFoundById.commentsCount = videoFoundById.commentsCount - 1;

    await videoFoundById.save();

    return res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};

const addVideoReplyController = async (req, res) => {
  try {
    const { videoId, commentId } = req.params;
    const { userId, content } = req.body;

    if (!videoId) {
      return res.status(404).json({ message: "Video not found" });
    }

    if (!commentId) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (!userId) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Reply content is required" });
    }

    const video = await Video.findById(videoId).populate('user', 'userName');
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = video.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Block check
    const videoAuthorForReply = await User.findById(video.user._id).select('blockedUsers blockedBy');
    const replyBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === videoAuthorForReply._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === videoAuthorForReply._id.toString()) ||
      (videoAuthorForReply.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (videoAuthorForReply.blockedBy || []).some(id => id.toString() === user._id.toString())
    );
    if (replyBlocked) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const newReply = {
      user: userId,
      content: content,
      createdAt: new Date(),
      likes: [],
      likesCount: 0
    };

    comment.replies.push(newReply);
    await video.save();

    const addedReply = comment.replies[comment.replies.length - 1];

    return res.status(200).json({ 
      message: "Reply added successfully",
      replyId: addedReply._id 
    });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};

const deleteVideoReplyController = async (req, res) => {
  try {
    const { videoId, commentId, replyId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const comment = video.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    comment.replies.pull(replyId);
    await video.save();

    return res.status(200).json({ 
      message: "Reply deleted successfully" 
    });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};

const toggleVideoLikeReplyController = async (req, res) => {
  try {
    const { videoId, commentId, replyId } = req.params;
    const { userId } = req.body;

    const video = await Video.findById(videoId).populate('user', 'userName');
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const comment = video.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Block check
    const videoAuthorForReplyLike = await User.findById(video.user._id).select('blockedUsers blockedBy');
    const replyOwnerForLike = await User.findById(reply.user).select('blockedUsers blockedBy');
    const replyLikeBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === videoAuthorForReplyLike._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === videoAuthorForReplyLike._id.toString()) ||
      (videoAuthorForReplyLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (videoAuthorForReplyLike.blockedBy || []).some(id => id.toString() === user._id.toString()) ||
      (user.blockedUsers || []).some(id => id.toString() === replyOwnerForLike._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === replyOwnerForLike._id.toString()) ||
      (replyOwnerForLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (replyOwnerForLike.blockedBy || []).some(id => id.toString() === user._id.toString())
    );
    if (replyLikeBlocked) {
      return res.status(403).json({ error: 'Action not allowed' });
    }

    const alreadyLiked = reply.likes.some(like => 
      like.user && like.user.toString() === userId.toString()
    );

    if (alreadyLiked) {
      reply.likes = reply.likes.filter(like => 
        !like.user || like.user.toString() !== userId.toString()
      );
      reply.likesCount = Math.max(0, (reply.likesCount || 0) - 1);
    } else {
      reply.likes.push({ user: userId, createdAt: new Date() });
      reply.likesCount = (reply.likesCount || 0) + 1;
    }

    await video.save();

    const isNowLiked = reply.likes.some(like => 
      like.user && like.user.toString() === userId.toString()
    );

    return res.status(200).json({ 
      message: "Reply like toggled successfully",
      likesCount: reply.likesCount,
      isLiked: isNowLiked
    });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};


const toggleVideoLikeController = async (req, res) => {
  try {
    const { videoId } = req.body;
    const { userId } = req.params;

    const video = await Video.findById(videoId).populate('user', 'userName');
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Block check: disallow like if blocked in either direction
    const videoAuthorForLike = await User.findById(video.user._id).select('blockedUsers blockedBy');
    const videoLikeBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === videoAuthorForLike._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === videoAuthorForLike._id.toString()) ||
      (videoAuthorForLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (videoAuthorForLike.blockedBy || []).some(id => id.toString() === user._id.toString())
    );
    if (videoLikeBlocked) {
      return res.status(403).json({ error: 'Action not allowed' });
    }

    if (!video.likesCount) {
      video.likesCount = video.likes?.length || 0;
    }

    const alreadyLiked = video.likes.some(like => 
      like.user?.toString() === userId || like.toString() === userId
    );

    if (alreadyLiked) {
      video.likes = video.likes.filter(like => 
        !(like.user?.toString() === userId || like.toString() === userId)
      );
      video.likesCount = Math.max(0, video.likesCount - 1);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingNotification = await Notification.findOne({
        recipient: video.user._id,
        type: 'video_like',
        video: videoId,
        updatedAt: { $gte: twentyFourHoursAgo }
      });

      if (existingNotification) {
        existingNotification.actors = existingNotification.actors.filter(
          actorId => actorId.toString() !== userId
        );
        existingNotification.count -= 1;

        if (existingNotification.count === 0) {
          await Notification.deleteOne({ _id: existingNotification._id });
        } else if (existingNotification.count === 1) {
          existingNotification.sender = existingNotification.actors[0];
          existingNotification.message = `liked your video`;
          await existingNotification.save();

          const populatedNotification = await Notification.findById(existingNotification._id)
            .populate('sender', 'userName profilePic');
          
          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(video.user._id.toString(), {
              _id: populatedNotification._id,
              type: 'video_like',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              video: videoId,
              count: populatedNotification.count,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        } else {
          existingNotification.sender = existingNotification.actors[existingNotification.actors.length - 1];
          existingNotification.message = `and ${existingNotification.count - 1} others liked your video`;
          await existingNotification.save();

          const populatedNotification = await Notification.findById(existingNotification._id)
            .populate('sender', 'userName profilePic');
          
          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(video.user._id.toString(), {
              _id: populatedNotification._id,
              type: 'video_like',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              video: videoId,
              count: populatedNotification.count,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        }
      }
    } else {
      video.likes.push({ user: userId, createdAt: new Date() });
      video.likesCount++;

      if (video.user._id.toString() !== userId) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const existingNotification = await Notification.findOne({
          recipient: video.user._id,
          type: 'video_like',
          video: videoId,
          updatedAt: { $gte: twentyFourHoursAgo }
        });

        if (existingNotification) {
          if (!existingNotification.actors.some(actorId => actorId.toString() === userId)) {
            existingNotification.actors.push(userId);
            existingNotification.count += 1;
            existingNotification.sender = userId;
            
            if (existingNotification.count === 2) {
              existingNotification.message = `and 1 other liked your video`;
            } else {
              existingNotification.message = `and ${existingNotification.count - 1} others liked your video`;
            }
            
            await existingNotification.save();

            const populatedNotification = await Notification.findById(existingNotification._id)
              .populate('sender', 'userName profilePic');
            
            if (global.sendNotificationToUser && populatedNotification) {
              global.sendNotificationToUser(video.user._id.toString(), {
                _id: populatedNotification._id,
                type: 'video_like',
                message: populatedNotification.message,
                sender: {
                  _id: populatedNotification.sender._id,
                  userName: populatedNotification.sender.userName,
                  profilePic: populatedNotification.sender.profilePic
                },
                video: videoId,
                count: populatedNotification.count,
                read: false,
                createdAt: populatedNotification.createdAt,
                updatedAt: populatedNotification.updatedAt
              });
            }
          }
        } else {
          const newNotification = await Notification.create({
            recipient: video.user._id,
            sender: userId,
            type: 'video_like',
            video: videoId,
            message: `liked your video`,
            count: 1,
            actors: [userId],
            read: false
          });

          const populatedNotification = await Notification.findById(newNotification._id)
            .populate('sender', 'userName profilePic');
          
          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(video.user._id.toString(), {
              _id: populatedNotification._id,
              type: 'video_like',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              video: videoId,
              count: 1,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        }
      }
    }

    await video.save();
    return res.status(200).json({
      message: "Toggled like successfully",
      updatedLikesCount: video.likes.length,
      isLiked: !alreadyLiked,
    });
  } catch (err) {
    console.error("Toggle video like error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const fetchLikeStatusController = async (req, res) => {
  try {
    const { videoId, userId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const alreadyLiked = video.likes.includes(userId);

    return res.status(200).json({ isLiked: alreadyLiked });
  } catch (err) {
    return res.status(500).json({ message: "internal server error" });
  }
};

const toggleSaveController = async (req, res) => {
      try{
    const { userId } = req.params;
    const { videoId } = req.body;

    const userFoundById = await User.findById(userId);

    if(!userFoundById){
      return res.status(404).json({error:"User not found"})
    }
   

const alreadySaved = userFoundById.savedVideos.some(savedVideos => savedVideos.video.toString() === videoId);
    if(alreadySaved){
      userFoundById.savedVideos.pull({ video: videoId })
    }
    else{
      userFoundById.savedVideos.push({ video: videoId })
    }

    await userFoundById.save();

    return res.status(200).json({
      message: "Toggled save successfully",
      })


  }
  catch(err){
    return res.status(500).json({error:"server internal error"})
  }
}

const getSharedVideoController = async (req, res) => {
  try {
    const { videoId, userId } = req.params;
    
    const videoFoundById = await Video.findById(videoId);

    if (!videoFoundById) {
      return res.status(404).json({ error: "Video not found" });
    }

    const currentUser = await User.findById(userId);

    // Block check: if blocked either way between viewer and video owner, hide
    const videoOwner = await User.findById(videoFoundById.user).select('blockedUsers blockedBy');
    if (currentUser && videoOwner) {
      const blockedEitherWay = (
        (currentUser.blockedUsers || []).some(id => id.toString() === videoOwner._id.toString()) ||
        (currentUser.blockedBy || []).some(id => id.toString() === videoOwner._id.toString()) ||
        (videoOwner.blockedUsers || []).some(id => id.toString() === currentUser._id.toString()) ||
        (videoOwner.blockedBy || []).some(id => id.toString() === currentUser._id.toString())
      );
      if (blockedEitherWay) {
        return res.status(404).json({ error: 'Video not found' });
      }
    }

    const userSavedVideos = currentUser?.savedVideos || [];

    const videoWithSaveStatus = {
      ...videoFoundById.toObject(),
      likesCount: videoFoundById.likes?.length || 0,
      commentsCount: videoFoundById.comments?.length || 0,
      isSaved: userSavedVideos.some(savedVideo => 
        savedVideo.video?.toString() === videoId.toString()
      ) || false,
      likes: undefined, 
      comments: undefined, 
    };

    return res.status(200).json(videoWithSaveStatus);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: "internal server error" });
  }
};

const uploadChunk = async (req, res) => {
    try {
        const { chunkIndex, totalChunks, uploadId, fileName } = req.body;
        const chunk = req.files.videoChunk[0];
        
        const chunkDir = path.join(__dirname, '..', 'Uploads', uploadId);
        if (!fs.existsSync(chunkDir)) {
            fs.mkdirSync(chunkDir, { recursive: true });
        }
        
        const chunkPath = path.join(chunkDir, `${chunkIndex}`);
        fs.writeFileSync(chunkPath, chunk.buffer);
        
        res.status(200).json({ message: "Chunk uploaded successfully" });
    } catch (error) {
        console.error("Error uploading chunk:", error);
        res.status(500).json({ message: "Error uploading chunk" });
    }
};

const completeUpload = async (req, res) => {
    try {
        const { fileName, uploadId, videoText, userName } = req.body;
        
        const chunkDir = path.join(__dirname, '..', 'Uploads', uploadId);
        const mergedFilePath = path.join(__dirname, '..', 'Uploads', fileName);
        
        const chunkPaths = fs.readdirSync(chunkDir).sort((a, b) => parseInt(a) - parseInt(b));
        
        const writeStream = fs.createWriteStream(mergedFilePath);
        for (const chunkIndex of chunkPaths) {
            const chunkPath = path.join(chunkDir, chunkIndex);
            const chunkBuffer = fs.readFileSync(chunkPath);
            writeStream.write(chunkBuffer);
            fs.unlinkSync(chunkPath);
        }
        writeStream.end();
        
        fs.rmdirSync(chunkDir);
        
        const result = await cloudinary.uploader.upload(mergedFilePath, {
            resource_type: "video",
            folder: "ay-social/videos",
        });
        
        fs.unlinkSync(mergedFilePath);
        
        const user = await User.findOne({ userName });
        
        const video = new Video({
            user: user._id,
            videoUrl: result.secure_url,
            description: videoText,
            duration: Math.floor(result.duration || 0), // ✅ FIXED!
        });
        
        await video.save();
        
        res.status(200).json({ message: "Video uploaded successfully" });
    } catch (error) {
        console.error("Error completing upload:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = {
  addVideoController,
  getVideoController,
  getSavedVideoController,
  deleteVideoController,
  editVideoController,
  addVideoCommentController,
  getVideoCommentsController,
  toggleVideoLikeCommentController,
  deleteVideoCommentController,
  addVideoReplyController,
  deleteVideoReplyController,
  toggleVideoLikeReplyController,
  toggleVideoLikeController,
  fetchLikeStatusController,
  toggleSaveController,
  getSharedVideoController,
  uploadChunk,
  completeUpload
};
