const User = require("../Models/User");
const Post = require("../Models/Post");
const Notification = require("../Models/Notification");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const Video = require("../Models/Video");
const Message = require("../Models/Message");
const Report = require("../Models/Report");
const Review = require("../Models/Review");
const cloudinary = require("../Config/Cloudinary");


const isBlockedBetween = (userA, userBId) => {
  if (!userA) return false;
  const aBlocked = (userA.blockedUsers || []).some(id => id.toString() === userBId.toString());
  const aBlockedBy = (userA.blockedBy || []).some(id => id.toString() === userBId.toString());
  return aBlocked || aBlockedBy;
};

const validatePassword = (password) => {

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^\w\s]/.test(password);

  return hasLetter && hasNumber && hasSpecialChar;
};



const getMyProfileController = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: No user data" });
    }

    const { id } = req.user;

    const userData = await User.findById(id).select("-password -followers -savedPosts -savedVideos").populate('following.following', '_id');

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userData.privacySettings) {
      userData.privacySettings = {
        isAccountPrivate: false,
        whoCanDM: "Everyone"
      };
      await userData.save();
    }

    const userWithCounts = await User.findById(id).select("followersCount followingCount contentCount");
    const followersCount = userWithCounts.followersCount;
    const followingCount = userWithCounts.followingCount;
    const contentCount = userWithCounts.contentCount;
    
    const responseData = {
      ...userData.toObject(),
      followersCount,
      followingCount,
      contentCount
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserByIdController = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select(
      'userName name profilePic bio privacySettings followers'
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const updatePrivacySettingsController = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: No user data" });
    }

    const { id } = req.user;
    const { isAccountPrivate, whoCanDM } = req.body;

    if (typeof isAccountPrivate !== 'boolean' && isAccountPrivate !== undefined) {
      return res.status(400).json({ message: "Invalid isAccountPrivate value" });
    }

    if (whoCanDM && !["Everyone", "Friends Only", "No One"].includes(whoCanDM)) {
      return res.status(400).json({ message: "Invalid whoCanDM value" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.privacySettings) {
      user.privacySettings = {
        isAccountPrivate: false,
        whoCanDM: "Everyone"
      };
    }

    if (isAccountPrivate !== undefined) {
      // If the user is making their account public
      if (user.privacySettings.isAccountPrivate && !isAccountPrivate) {
        // Accept all pending follow requests
        for (const request of user.pendingFollowRequests) {
          const requesterUser = await User.findById(request.requester);
          if (requesterUser) {
            // Add to followers/following
            user.followers.push({ follower: request.requester });
            user.followersCount += 1;
            requesterUser.following.push({ following: id });
            requesterUser.followingCount += 1;

            // Remove from requester's sentFollowRequests
            requesterUser.sentFollowRequests = requesterUser.sentFollowRequests.filter(
              req => req.recipient.toString() !== id
            );

            await requesterUser.save();

            // Create notification for the requester
            const newNotification = await Notification.create({
              recipient: request.requester,
              sender: id,
              type: 'follow_request_accepted',
              message: 'accepted your follow request',
              count: 1,
              actors: [id],
              read: false
            });

            const populatedNotification = await Notification.findById(newNotification._id)
              .populate('sender', 'userName profilePic');

            if (global.sendNotificationToUser && populatedNotification) {
              global.sendNotificationToUser(request.requester.toString(), {
                _id: populatedNotification._id,
                type: 'follow_request_accepted',
                message: populatedNotification.message,
                sender: {
                  _id: populatedNotification.sender._id,
                  userName: populatedNotification.sender.userName,
                  profilePic: populatedNotification.sender.profilePic
                },
                count: 1,
                read: false,
                createdAt: populatedNotification.createdAt,
                updatedAt: populatedNotification.updatedAt
              });
            }
          }
        }
        // Clear pending follow requests
        user.pendingFollowRequests = [];
      }
      user.privacySettings.isAccountPrivate = isAccountPrivate;
    }

    if (whoCanDM) {
      user.privacySettings.whoCanDM = whoCanDM;
    }

    await user.save();

    return res.status(200).json({
      message: "Privacy settings updated successfully",
      privacySettings: user.privacySettings
    });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getOtherProfileController = async (req, res) => {
  try {
    const { userName, loggedInUserId } = req.params;
    
    const userData = await User.findOne({ userName })
      .select("-password")
      .populate('followers.follower', '_id userName')
      .populate('following.following', '_id userName');

    
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // If either side has a block, hide profile content
    let viewer = null;
    if (loggedInUserId && mongoose.Types.ObjectId.isValid(loggedInUserId)) {
      viewer = await User.findById(loggedInUserId).select('blockedUsers blockedBy');
    }
    const blockedEitherWay = viewer && (isBlockedBetween(viewer, userData._id) || isBlockedBetween(userData, loggedInUserId));
    if (blockedEitherWay) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Calculate isFollowing and isFollowingBack
    const isFollowing = userData.followers.some(
      follower => follower.follower && follower.follower._id.toString() === loggedInUserId
    );

    const isFollowingBack = userData.following.some(
      following => following.following && following.following._id.toString() === loggedInUserId
    );

    // NEW: Check if logged-in user has sent a follow request to this user
    const hasSentRequest = userData.pendingFollowRequests.some(
      req => req.requester.toString() === loggedInUserId
    );
    
    if (userData.privacySettings.isAccountPrivate && userData._id.toString() !== loggedInUserId && !isFollowing) {
      return res.status(200).json({
        _id: userData._id,
        isPrivate: true,
        userName: userData.userName,
        profilePic: userData.profilePic,
        coverPic: userData.coverPic,
        name: userData.name,
        bio: userData.bio,
        followersCount: userData.followersCount,
        followingCount: userData.followingCount,
        country: userData.country,
        createdAt: userData.createdAt,
        isFollowing: isFollowing,
        isFollowingBack: isFollowingBack,
        hasSentRequest: hasSentRequest, // NEW: Add this
        contentCount: {
          posts: userData.contentCount?.posts || 0,
          videos: userData.contentCount?.videos || 0
        },
        message: "This account is private."
      });
    }
     
    console.log(userData.followers);

    const responseData = {
      ...userData.toObject(),
      followersCount: userData.followersCount,
      followingCount: userData.followingCount,
      isFollowing,
      isFollowingBack,
      hasSentRequest // NEW: Add this to public profiles too
    };

    delete responseData.followers;
    delete responseData.following;
    delete responseData.pendingFollowRequests; // Don't expose pending requests
    delete responseData.sentFollowRequests; // Don't expose sent requests

    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error("Error fetching other user profile:", error);
    return res.status(500).json({ message: error.message });
  }
};
const updateProfileController = async (req, res) => {
  try {
    const { userName: currentUserName } = req.params;
    
    // First, get the current user data from database
    const currentUser = await User.findOne({ userName: currentUserName });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let { 
      userName = null, 
      name = null, 
      bio = null, 
      website = null, 
      jobs = null,
      gender = null
    } = req.body;


    const responseMessage = {
      userName: null,
      name: null,
      bio: null,
      website: null,
      jobs: null,
    };

    // Sanitize inputs
    userName = typeof userName === "string" ? userName.trim().toLowerCase() : null;
    name = typeof name === "string" ? name.trim() : null;
    bio = typeof bio === "string" ? bio.trim() : null;
    website = typeof website === "string" ? website.trim() : null;

    // Validation functions
    const isValidName = (name) =>
      /^[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF\u0400-\u04FF\u0370-\u03FF\u0590-\u05FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\s'-]+$/.test(name);

    const isAlphaNumUnderscore = (user) =>
      /^(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/.test(user);

    const isValidUrl = (url) => {
      try {
        const finalUrl = url.startsWith("http") ? url : "https://" + url;
        const parsed = new URL(finalUrl);
        return (
          (parsed.protocol === "http:" || parsed.protocol === "https:") &&
          parsed.hostname.includes(".")
        );
      } catch {
        return false;
      }
    };

    // Track which fields are being updated (only validate fields that are provided)
    const fieldsToUpdate = {};
    const changedFields = [];

    // Check for changes and validate only changed fields
    if (userName !== null && userName !== currentUser.userName) {
      fieldsToUpdate.userName = userName;
      changedFields.push('userName');
      
      if (!userName) {
        responseMessage.userName = "⚠️ Username is required";
      } else if (userName.length < 3 || userName.length > 20) {
        responseMessage.userName = "⚠️ Username must be between 3 and 20 characters long";
      } else if (!isAlphaNumUnderscore(userName)) {
        responseMessage.userName = "⚠️ Username can only contain letters, numbers, and underscores.";
      } else {
        const userFoundByUserName = await User.findOne({ userName: userName });
        if (userFoundByUserName) {
          responseMessage.userName = "Username already exists";
        }
      }
    }

    if (name !== null && name !== (currentUser.name || "")) {
      fieldsToUpdate.name = name;
      changedFields.push('name');
      
      if (name && (name.length < 3 || name.length > 20)) {
        responseMessage.name = "⚠️ Name must be between 3 and 20 characters long";
      } else if (name && !isValidName(name)) {
        responseMessage.name = "Name can only contain letters, spaces, apostrophes, and hyphens.";
      }
    }

    if (bio !== null && bio !== (currentUser.bio || "")) {
      fieldsToUpdate.bio = bio;
      changedFields.push('bio');
      
      if (bio && bio.length > 150) {
        responseMessage.bio = "⚠️ Bio must be less than 150 characters long";
      }
    }

    if (website !== null && website !== (currentUser.website || "")) {
      fieldsToUpdate.website = website;
      changedFields.push('website');
      
      if (website && !isValidUrl(website)) {
        responseMessage.website = "⚠️ Invalid URL format";
      }
    }

    if (gender !== null && gender !== (currentUser.gender || "")) {
      fieldsToUpdate.gender = gender;
      changedFields.push('gender');
    }

    if (jobs !== null) {
      const currentJobs = currentUser.jobs || [];
      const jobsChanged = JSON.stringify(jobs) !== JSON.stringify(currentJobs);
      if (jobsChanged) {
        fieldsToUpdate.jobs = jobs;
        changedFields.push('jobs');
      }
    }

    // If no changes detected
    if (changedFields.length === 0) {
      return res.status(200).json({ 
        message: "No changes detected",
        noChanges: true
      });
    }

    // Check for validation errors (only for changed fields)
    const hasErrors = Object.values(responseMessage).some(error => error !== null);

    if (hasErrors) {
      return res.status(400).json({ 
        message: responseMessage,
        changedFields: changedFields
      });
    }

    console.log(fieldsToUpdate)

    // Update only the changed fields
    const updatedUser = await User.findOneAndUpdate(
      { userName: currentUserName },
      { $set: fieldsToUpdate },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return success response with only the fields that were actually updated
    return res.status(200).json({ 
      message: "Profile updated successfully",
      updatedFields: changedFields,
      user: updatedUser,
      success: true
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log("Error updating profile:", err);
  }
};

const toggleFollowController = async (req, res) => {
  try {
    const { targetUserId, loggedInUserId } = req.params;
    
    const targetUser = await User.findById(targetUserId);
    const loggedInUser = await User.findById(loggedInUserId);
    
    if (!targetUser || !loggedInUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Block guard: disallow follow in either direction
    const blockedEitherWay = isBlockedBetween(loggedInUser, targetUserId) || isBlockedBetween(targetUser, loggedInUserId);
    if (blockedEitherWay) {
      return res.status(403).json({ message: "Action not allowed" });
    }

    // Check if already following
    const isFollowing = targetUser.followers.some(
      follower => follower.follower && follower.follower.toString() === loggedInUserId
    );

    // Check if a request is pending
    const hasPendingRequest = targetUser.pendingFollowRequests.some(
      req => req.requester.toString() === loggedInUserId
    );

    if (isFollowing) {
      // UNFOLLOW LOGIC
      targetUser.followers = targetUser.followers.filter(
        follower => follower.follower.toString() !== loggedInUserId
      );
      targetUser.followersCount -= 1; 
      
      loggedInUser.following = loggedInUser.following.filter(
        following => following.following.toString() !== targetUserId
      );
      loggedInUser.followingCount -= 1;

      // Remove saved posts/videos if account is private
      if (targetUser.privacySettings.isAccountPrivate) {
        const targetUserPosts = await Post.find({ user: targetUserId }).select('_id');
        const targetUserPostIds = targetUserPosts.map(post => post._id.toString());
        
        loggedInUser.savedPosts = loggedInUser.savedPosts.filter(
          savedPost => !targetUserPostIds.includes(savedPost.post.toString())
        );

        const targetUserVideos = await Video.find({ user: targetUserId }).select('_id');
        const targetUserVideoIds = targetUserVideos.map(video => video._id.toString());
        
        loggedInUser.savedVideos = loggedInUser.savedVideos.filter(
          savedVideo => !targetUserVideoIds.includes(savedVideo.video.toString())
        );
      }

      // Handle notifications (existing code)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingFollowNotification = await Notification.findOne({
        recipient: targetUserId,
        type: 'follow',
        updatedAt: { $gte: twentyFourHoursAgo }
      });

      if (existingFollowNotification) {
        existingFollowNotification.actors = existingFollowNotification.actors.filter(
          actorId => actorId.toString() !== loggedInUserId
        );
        existingFollowNotification.count -= 1;

        if (existingFollowNotification.count === 0) {
          await Notification.deleteOne({ _id: existingFollowNotification._id });
        } else if (existingFollowNotification.count === 1) {
          existingFollowNotification.sender = existingFollowNotification.actors[0];
          existingFollowNotification.message = `started following you`;
          await existingFollowNotification.save();

          const populatedNotification = await Notification.findById(existingFollowNotification._id)
            .populate('sender', 'userName profilePic');

          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(targetUserId.toString(), {
              _id: populatedNotification._id,
              type: 'follow',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              count: populatedNotification.count,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        } else {
          existingFollowNotification.sender = existingFollowNotification.actors[existingFollowNotification.actors.length - 1];
          existingFollowNotification.message = `and ${existingFollowNotification.count - 1} others started following you`;
          await existingFollowNotification.save();

          const populatedNotification = await Notification.findById(existingFollowNotification._id)
            .populate('sender', 'userName profilePic');

          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(targetUserId.toString(), {
              _id: populatedNotification._id,
              type: 'follow',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              count: populatedNotification.count,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        }
      }

      const existingFollowBackNotification = await Notification.findOne({
        recipient: targetUserId,
        sender: loggedInUserId,
        type: 'follow_back'
      });

      if (existingFollowBackNotification) {
        await Notification.deleteOne({ _id: existingFollowBackNotification._id });
      }

      await targetUser.save();
      await loggedInUser.save();

      return res.status(200).json({ 
        message: "Unfollowed successfully",
        isFollowing: false,
        requestStatus: null
      });
      
    } else if (hasPendingRequest) {
      targetUser.pendingFollowRequests = targetUser.pendingFollowRequests.filter(
        req => req.requester.toString() !== loggedInUserId
      );
      
      loggedInUser.sentFollowRequests = loggedInUser.sentFollowRequests.filter(
        req => req.recipient.toString() !== targetUserId
      );

      await targetUser.save();
      await loggedInUser.save();

      return res.status(200).json({ 
        message: "Follow request cancelled",
        isFollowing: false,
        requestStatus: null
      });

    } else {
      
      if (targetUser.privacySettings.isAccountPrivate) {
        // Send follow request
        targetUser.pendingFollowRequests.push({
          requester: loggedInUserId,
          createdAt: new Date()
        });
        
        loggedInUser.sentFollowRequests.push({
          recipient: targetUserId,
          createdAt: new Date()
        });

        await targetUser.save();
        await loggedInUser.save();

        // Create notification for the target user
        const newRequestNotification = await Notification.create({
          recipient: targetUserId,
          sender: loggedInUserId,
          type: 'follow_request',
          message: 'requested to follow you',
          count: 1,
          actors: [loggedInUserId],
          read: false
        });

        const populatedNotification = await Notification.findById(newRequestNotification._id)
          .populate('sender', 'userName profilePic');

        if (global.sendNotificationToUser && populatedNotification) {
          global.sendNotificationToUser(targetUserId.toString(), {
            _id: populatedNotification._id,
            type: 'follow_request',
            message: populatedNotification.message,
            sender: {
              _id: populatedNotification.sender._id,
              userName: populatedNotification.sender.userName,
              profilePic: populatedNotification.sender.profilePic
            },
            count: 1,
            read: false,
            createdAt: populatedNotification.createdAt,
            updatedAt: populatedNotification.updatedAt
          });
        }

        return res.status(200).json({ 
          message: "Follow request sent",
          isFollowing: false,
          requestStatus: "pending"
        });
      } else {
        // Public account - follow directly (existing logic)
        targetUser.followers.push({ 
          follower: loggedInUserId
        });
        targetUser.followersCount += 1; 
        
        loggedInUser.following.push({ 
          following: targetUserId
        });
        loggedInUser.followingCount += 1;

        const isFollowBack = loggedInUser.followers.some(
          follower => follower.follower && follower.follower.toString() === targetUserId
        );

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (isFollowBack) {
          const newFollowBackNotification = await Notification.create({
            recipient: targetUserId,
            sender: loggedInUserId,
            type: 'follow_back',
            message: `followed you back`,
            count: 1,
            actors: [loggedInUserId],
            read: false
          });

          const populatedNotification = await Notification.findById(newFollowBackNotification._id)
            .populate('sender', 'userName profilePic');

          if (global.sendNotificationToUser && populatedNotification) {
            global.sendNotificationToUser(targetUserId.toString(), {
              _id: populatedNotification._id,
              type: 'follow_back',
              message: populatedNotification.message,
              sender: {
                _id: populatedNotification.sender._id,
                userName: populatedNotification.sender.userName,
                profilePic: populatedNotification.sender.profilePic
              },
              count: 1,
              read: false,
              createdAt: populatedNotification.createdAt,
              updatedAt: populatedNotification.updatedAt
            });
          }
        } else {
          const existingNotification = await Notification.findOne({
            recipient: targetUserId,
            type: 'follow',
            updatedAt: { $gte: twentyFourHoursAgo }
          });

          if (existingNotification) {
            if (!existingNotification.actors.includes(loggedInUserId)) {
              existingNotification.actors.push(loggedInUserId);
              existingNotification.count += 1;
              existingNotification.sender = loggedInUserId;
              
              if (existingNotification.count === 2) {
                existingNotification.message = `and 1 other started following you`;
              } else {
                existingNotification.message = `and ${existingNotification.count - 1} others started following you`;
              }
              
              await existingNotification.save();

              const populatedNotification = await Notification.findById(existingNotification._id)
                .populate('sender', 'userName profilePic');

              if (global.sendNotificationToUser && populatedNotification) {
                global.sendNotificationToUser(targetUserId.toString(), {
                  _id: populatedNotification._id,
                  type: 'follow',
                  message: populatedNotification.message,
                  sender: {
                    _id: populatedNotification.sender._id,
                    userName: populatedNotification.sender.userName,
                    profilePic: populatedNotification.sender.profilePic
                  },
                  count: populatedNotification.count,
                  read: false,
                  createdAt: populatedNotification.createdAt,
                  updatedAt: populatedNotification.updatedAt
                });
              }
            }
          } else {
            const newFollowNotification = await Notification.create({
              recipient: targetUserId,
              sender: loggedInUserId,
              type: 'follow',
              message: `started following you`,
              count: 1,
              actors: [loggedInUserId],
              read: false
            });

            const populatedNotification = await Notification.findById(newFollowNotification._id)
              .populate('sender', 'userName profilePic');

            if (global.sendNotificationToUser && populatedNotification) {
              global.sendNotificationToUser(targetUserId.toString(), {
                _id: populatedNotification._id,
                type: 'follow',
                message: populatedNotification.message,
                sender: {
                  _id: populatedNotification.sender._id,
                  userName: populatedNotification.sender.userName,
                  profilePic: populatedNotification.sender.profilePic
                },
                count: 1,
                read: false,
                createdAt: populatedNotification.createdAt,
                updatedAt: populatedNotification.updatedAt
              });
            }
          }
        }

        await targetUser.save();
        await loggedInUser.save();

        return res.status(200).json({ 
          message: "Followed successfully",
          isFollowing: true,
          requestStatus: null
        });
      }
    }
    
  } catch (error) {
    console.error("Error toggling follow status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getFollowersController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, loggedInUserId } = req.query;
    
    const user = await User.findById(userId).populate('followers.follower', '_id userName name bio profilePic');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.followers.some(
      follower => follower.follower && follower.follower._id.toString() === loggedInUserId
    );

    if (user.privacySettings.isAccountPrivate && user._id.toString() !== loggedInUserId && !isFollowing) {
      return res.status(403).json({ 
        message: "This account is private",
        isPrivate: true 
      });
    }

    const allFollowers = user.followers || [];
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedFollowers = allFollowers.slice(startIndex, endIndex);

    let followersWithStatus = paginatedFollowers;
    if (loggedInUserId) {
      const loggedInUser = await User.findById(loggedInUserId);
      const followingIds = loggedInUser?.following?.map(f => f.following.toString()) || [];
      const sentRequestIds = loggedInUser?.sentFollowRequests?.map(r => r.recipient.toString()) || []; // NEW
      
      followersWithStatus = paginatedFollowers.map(follower => ({
        ...follower.toObject(),
        isFollowing: followingIds.includes(follower.follower._id.toString()),
        hasSentRequest: sentRequestIds.includes(follower.follower._id.toString()) // NEW
      }));
    }

    const hasMore = endIndex < allFollowers.length;

    return res.status(200).json({
      followers: followersWithStatus,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total: allFollowers.length,
        hasMore: hasMore,
        totalPages: Math.ceil(allFollowers.length / limit)
      }, 
      totalFollowers: user.followersCount
    });
  }
  catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getFollowingController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, loggedInUserId } = req.query;
    
    const user = await User.findById(userId).populate('following.following', '_id userName name bio profilePic');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.followers.some(
      follower => follower.follower && follower.follower.toString() === loggedInUserId
    );

    if (user.privacySettings.isAccountPrivate && user._id.toString() !== loggedInUserId && !isFollowing) {
      return res.status(403).json({ 
        message: "This account is private",
        isPrivate: true 
      });
    }

    const allFollowing = user.following || [];
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedFollowing = allFollowing.slice(startIndex, endIndex);

    let followingWithStatus = paginatedFollowing;
    if (loggedInUserId) {
      const loggedInUser = await User.findById(loggedInUserId);
      const followingIds = loggedInUser?.following?.map(f => f.following.toString()) || [];
      
      followingWithStatus = paginatedFollowing.map(following => ({
        ...following.toObject(),
        isFollowing: followingIds.includes(following._id.toString())
      }));
    }

    const hasMore = endIndex < allFollowing.length;

    return res.status(200).json({
      following: followingWithStatus,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total: allFollowing.length,
        hasMore: hasMore,
        totalPages: Math.ceil(allFollowing.length / limit)
      }
    });
  }
  catch(error) {
    console.error("Full error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const removeFollowerController = async (req, res) => {
  try {
    const { otherUserId, id } = req.params;
    
    const currentUser = await User.findById(id);
    const otherUser = await User.findById(otherUserId);
    
    if (!currentUser || !otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    currentUser.followers = currentUser.followers.filter(
      follower => follower.follower.toString() !== otherUserId
    );
    currentUser.followersCount -= 1; // ← ADD THIS

    otherUser.following = otherUser.following.filter(
      following => following.following.toString() !== id
    );
    otherUser.followingCount -= 1; // ← ADD THIS

    await currentUser.save();
    await otherUser.save();

    return res.status(200).json({ 
      message: "Follower removed successfully",
      removedFollower: otherUserId
    });

  } catch (error) {
    console.error("Error removing follower:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getSuggestedUsersController = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { excludeIds } = req.query;

    const me = await User.findById(userId)
      .select("followers following country sentFollowRequests blockedUsers blockedBy") // include block arrays
      .lean();
    
    if (!me) return res.status(404).json({ message: "User not found" });

    const myFollowingIds = me.following.map(f => f.following.toString());
    const myFollowersIds = me.followers.map(f => f.follower.toString());
    const mySentRequestIds = me.sentFollowRequests?.map(r => r.recipient.toString()) || []; // NEW
    
    const clientExcludedIds = excludeIds 
      ? excludeIds.split(',').filter(id => id) 
      : [];
    
    const myBlockedIds = (me.blockedUsers || []).map(id => id.toString());
    const myBlockedByIds = (me.blockedBy || []).map(id => id.toString());

    const excludedIds = [
      ...new Set([...myFollowingIds, ...myFollowersIds, userId, ...clientExcludedIds, ...myBlockedIds, ...myBlockedByIds])
    ];

    const [mutualFollowers, friendsOfFriends, sameCountry, popularUsers] = await Promise.all([
      User.aggregate([
        { $match: { _id: { $in: myFollowersIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $unwind: "$following" },
        { $group: { _id: "$following.following", count: { $sum: 1 } } },
        { $match: { _id: { $nin: excludedIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $sample: { size: 10 } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $project: { _id: "$user._id", userName: "$user.userName", profilePic: "$user.profilePic", country: "$user.country", name: "$user.name" } },
      ]),
      
      User.aggregate([
        { $match: { _id: { $in: myFollowingIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $unwind: "$following" },
        { $group: { _id: "$following.following" } },
        { $match: { _id: { $nin: excludedIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $sample: { size: 10 } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $project: { _id: "$user._id", userName: "$user.userName", profilePic: "$user.profilePic", country: "$user.country", name: "$user.name" } },
      ]),
      
      me.country ? User.aggregate([
        { $match: { _id: { $nin: excludedIds.map(id => new mongoose.Types.ObjectId(id)) }, country: me.country } },
        { $sample: { size: 10 } },
        { $project: { _id: 1, userName: 1, profilePic: 1, country: 1, name: 1 } }
      ]) : Promise.resolve([]),
      
      User.aggregate([
        { $match: { _id: { $nin: excludedIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $sample: { size: 10 } },
        { $project: { _id: 1, userName: 1, profilePic: 1, country: 1, name: 1 } }
      ])
    ]);

    const suggestions = [
      ...mutualFollowers,
      ...friendsOfFriends,
      ...sameCountry,
      ...popularUsers
    ];

    const shuffled = suggestions.sort(() => Math.random() - 0.5);

    const merged = [];
    const map = new Map();

    for (let user of shuffled) {
      if (!map.has(user._id.toString()) && merged.length < 10) {
        map.set(user._id.toString(), true);
        // NEW: Add hasSentRequest and isFollower flags to each user
        merged.push({
          ...user,
          hasSentRequest: mySentRequestIds.includes(user._id.toString()),
          isFollower: myFollowersIds.includes(user._id.toString()) // Check if they follow you
        });
      }
    }

    res.status(200).json(merged);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getPendingRequestsController = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .populate('pendingFollowRequests.requester', 'userName name profilePic bio')
      .select('pendingFollowRequests');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const sortedRequests = user.pendingFollowRequests.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    return res.status(200).json({
      requests: sortedRequests,
      count: sortedRequests.length
    });
  } catch (error) {
    console.error("Error fetching follow requests:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const acceptRequestController = async (req, res) => {
  try {
    const { userId, requesterId } = req.params;
    
    const currentUser = await User.findById(userId);
    const requesterUser = await User.findById(requesterId);
    
    if (!currentUser || !requesterUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if request exists
    const requestExists = currentUser.pendingFollowRequests.some(
      req => req.requester.toString() === requesterId
    );
    
    if (!requestExists) {
      return res.status(404).json({ message: "Follow request not found" });
    }
    
    // Remove from pendingFollowRequests
    currentUser.pendingFollowRequests = currentUser.pendingFollowRequests.filter(
      req => req.requester.toString() !== requesterId
    );
    
    // Remove from requester's sentFollowRequests
    requesterUser.sentFollowRequests = requesterUser.sentFollowRequests.filter(
      req => req.recipient.toString() !== userId
    );
    
    // Add to followers/following
    currentUser.followers.push({ follower: requesterId });
    currentUser.followersCount += 1;
    
    requesterUser.following.push({ following: userId });
    requesterUser.followingCount += 1;
    
    await currentUser.save();
    await requesterUser.save();
    
    // Create notification for the requester
    const newNotification = await Notification.create({
      recipient: requesterId,
      sender: userId,
      type: 'follow_request_accepted',
      message: 'accepted your follow request',
      count: 1,
      actors: [userId],
      read: false
    });
    
    const populatedNotification = await Notification.findById(newNotification._id)
      .populate('sender', 'userName profilePic');
    
    if (global.sendNotificationToUser && populatedNotification) {
      global.sendNotificationToUser(requesterId.toString(), {
        _id: populatedNotification._id,
        type: 'follow_request_accepted',
        message: populatedNotification.message,
        sender: {
          _id: populatedNotification.sender._id,
          userName: populatedNotification.sender.userName,
          profilePic: populatedNotification.sender.profilePic
        },
        count: 1,
        read: false,
        createdAt: populatedNotification.createdAt,
        updatedAt: populatedNotification.updatedAt
      });
    }
    
    return res.status(200).json({ 
      message: "Follow request accepted",
      success: true
    });
  } catch (error) {
    console.error("Error accepting follow request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const declineRequestController = async (req, res) => {
  try {
    const { userId, requesterId } = req.params;
    
    const currentUser = await User.findById(userId);
    const requesterUser = await User.findById(requesterId);
    
    if (!currentUser || !requesterUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if request exists
    const requestExists = currentUser.pendingFollowRequests.some(
      req => req.requester.toString() === requesterId
    );
    
    if (!requestExists) {
      return res.status(404).json({ message: "Follow request not found" });
    }
    
    // Remove from pendingFollowRequests
    currentUser.pendingFollowRequests = currentUser.pendingFollowRequests.filter(
      req => req.requester.toString() !== requesterId
    );
    
    // Remove from requester's sentFollowRequests
    requesterUser.sentFollowRequests = requesterUser.sentFollowRequests.filter(
      req => req.recipient.toString() !== userId
    );
    
    await currentUser.save();
    await requesterUser.save();
    
    return res.status(200).json({ 
      message: "Follow request declined",
      success: true
    });
  } catch (error) {
    console.error("Error declining follow request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const changePasswordController = async(req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id; // ✅ This comes from decodeToken middleware

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "All password fields are required." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  if (newPassword.length < 6 || newPassword.length > 20) {
    return res.status(400).json({ error: "Password must be between 6 and 20 characters." });
  }
  
  if (!validatePassword(newPassword)) {
    return res.status(400).json({ 
      error: "Password must contain at least one letter, one number, and one special character." 
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must be different from current password." });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    user.password = newPasswordHash;
    await user.save();
    
    return res.status(200).json({ message: "Password updated successfully." });

  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ error: "Failed to update password. Please try again later." });
  }
};


// Block controllers
const blockUserController = async (req, res) => {
  try {
    const blockerId = req.user?.id;
    const { targetUserId } = req.params;

    if (!blockerId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid user id' });
    if (blockerId.toString() === targetUserId.toString()) return res.status(400).json({ message: 'Cannot block yourself' });

    const blocker = await User.findById(blockerId);
    const blocked = await User.findById(targetUserId);
    
    if (!blocker || !blocked) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyBlocked = (blocker.blockedUsers || []).some(id => id.toString() === targetUserId.toString());
    if (!alreadyBlocked) blocker.blockedUsers.push(blocked._id);

    const alreadyListed = (blocked.blockedBy || []).some(id => id.toString() === blockerId.toString());
    if (!alreadyListed) blocked.blockedBy.push(blocker._id);

    blocker.following = (blocker.following || []).filter(f => f.following.toString() !== targetUserId);
    blocked.followers = (blocked.followers || []).filter(f => f.follower.toString() !== blockerId);

    blocked.following = (blocked.following || []).filter(f => f.following.toString() !== blockerId);
    blocker.followers = (blocker.followers || []).filter(f => f.follower.toString() !== targetUserId);

    blocker.followersCount = blocker.followers?.length || 0;
    blocker.followingCount = blocker.following?.length || 0;
    blocked.followersCount = blocked.followers?.length || 0;
    blocked.followingCount = blocked.following?.length || 0;

    blocker.sentFollowRequests = (blocker.sentFollowRequests || []).filter(r => r.recipient.toString() !== targetUserId);
    blocker.pendingFollowRequests = (blocker.pendingFollowRequests || []).filter(r => r.requester.toString() !== targetUserId);
    blocked.sentFollowRequests = (blocked.sentFollowRequests || []).filter(r => r.recipient.toString() !== blockerId);
    blocked.pendingFollowRequests = (blocked.pendingFollowRequests || []).filter(r => r.requester.toString() !== blockerId);

    const blockedUserPosts = await Post.find({ user: targetUserId }).select('_id');
    const blockedUserPostIds = blockedUserPosts.map(post => post._id.toString());

    blocker.savedPosts = (blocker.savedPosts || []).filter(
      savedPost => !blockedUserPostIds.includes(savedPost.post.toString())
    );

    const blockedUserVideos = await Video.find({ user: targetUserId }).select('_id');
    const blockedUserVideoIds = blockedUserVideos.map(video => video._id.toString());

    blocker.savedVideos = (blocker.savedVideos || []).filter(
      savedVideo => !blockedUserVideoIds.includes(savedVideo.video.toString())
    );

    const blockerPosts = await Post.find({ user: blockerId }).select('_id');
    const blockerPostIds = blockerPosts.map(post => post._id.toString());

    blocked.savedPosts = (blocked.savedPosts || []).filter(
      savedPost => !blockerPostIds.includes(savedPost.post.toString())
    );

    const blockerVideos = await Video.find({ user: blockerId }).select('_id');
    const blockerVideoIds = blockerVideos.map(video => video._id.toString());

    blocked.savedVideos = (blocked.savedVideos || []).filter(
      savedVideo => !blockerVideoIds.includes(savedVideo.video.toString())
    );

    await blocker.save();
    await blocked.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const unblockUserController = async (req, res) => {
  try {
    const blockerId = req.user?.id;
    const { targetUserId } = req.params;

    if (!blockerId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid user id' });
    if (blockerId.toString() === targetUserId.toString()) return res.status(400).json({ message: 'Invalid request' });

    const blocker = await User.findById(blockerId);
    const blocked = await User.findById(targetUserId);
    if (!blocker || !blocked) return res.status(404).json({ message: 'User not found' });

    blocker.blockedUsers = (blocker.blockedUsers || []).filter(id => id.toString() !== targetUserId);
    blocked.blockedBy = (blocked.blockedBy || []).filter(id => id.toString() !== blockerId);

    await blocker.save();
    await blocked.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getBlocksController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId)
      .populate('blockedUsers', '_id userName name profilePic')
      .populate('blockedBy', '_id userName name profilePic')
      .select('blockedUsers blockedBy');

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({
      blockedUsers: user.blockedUsers || [],
      blockedBy: user.blockedBy || []
    });
  } catch (error) {
    console.error('Error getting blocks:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};





// ========================================
// ADMIN: Ban/Delete User Account
// ========================================
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    console.log("Attempting to delete from Cloudinary:", imageUrl);

    // Only delete if it's OUR media (contains 'ay-social/')
    if (!imageUrl.includes("ay-social/")) {
      console.log("Skipping external media:", imageUrl);
      return;
    }

    const parts = imageUrl.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      console.log("Invalid Cloudinary URL format");
      return;
    }

    const pathAfterUpload = parts.slice(uploadIndex + 2);
    const fileWithExtension = pathAfterUpload.join("/");
    const publicId = fileWithExtension.substring(
      0,
      fileWithExtension.lastIndexOf(".")
    );

    console.log("Extracted public_id:", publicId);

    // Determine resource type based on folder
    let resourceType = "image";
    if (publicId.includes("ay-social/videos")) {
      resourceType = "video";
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log("Cloudinary deletion result:", result);

    if (result.result !== "ok" && result.result !== "not found") {
      console.log("Failed to delete from Cloudinary:", result);
    }
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error.message);
  }
};

// ========================================
// ADMIN: Ban/Delete User Account
// ========================================
const banUserController = async (req, res) => {
  try {
    // The parameter name must match your route definition
    // If route is /account/:userId, use userId
    // If route is /account/:userName, use userName
    const { userNameId } = req.params; // Change this to match your route parameter name
    
    console.log('🔍 Received params:', req.params);
    console.log('🔍 Searching for userName:', userNameId);

    // Find the user by userName instead of ID
    const user = await User.findOne({ userName: userNameId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const actualUserId = user._id;
    const userName = user.userName;
    console.log(`Starting account deletion for user: ${userName} (${actualUserId})`);

    // ========================================
    // STEP 1: Collect All Media URLs to Delete
    // ========================================
    const mediaToDelete = [];

    // Profile Picture
    if (user.profilePic) {
      mediaToDelete.push(user.profilePic);
    }

    // Cover Picture
    if (user.coverPic?.type === "image" && user.coverPic?.image) {
      mediaToDelete.push(user.coverPic.image);
    }

    // All Post Images
    const userPosts = await Post.find({ user: actualUserId });
    userPosts.forEach((post) => {
      if (post.images && post.images.length > 0) {
        mediaToDelete.push(...post.images);
      }
    });

    // All Videos
    const userVideos = await Video.find({ user: actualUserId });
    userVideos.forEach((video) => {
      if (video.videoUrl) {
        mediaToDelete.push(video.videoUrl);
      }
    });

    // All Message Media
    const userMessages = await Message.find({
      participants: actualUserId,
    });

    userMessages.forEach((conversation) => {
      conversation.messages.forEach((msg) => {
        if (msg.senderId.toString() === actualUserId.toString()) {
          if (msg.media?.url) {
            mediaToDelete.push(msg.media.url);
          }
          if (msg.media?.thumbnail) {
            mediaToDelete.push(msg.media.thumbnail);
          }
        }
      });
    });

    console.log(`Found ${mediaToDelete.length} media files to delete`);

    // ========================================
    // STEP 2: Delete from Cloudinary
    // ========================================
    console.log("Deleting media from Cloudinary...");
    await Promise.all(
      mediaToDelete.map((url) => deleteFromCloudinary(url))
    );

    // ========================================
    // STEP 3: Database Cleanup
    // ========================================

    // 3.1 Delete User's Posts
    console.log("Deleting user's posts...");
    await Post.deleteMany({ user: actualUserId });

    // 3.2 Delete User's Videos
    console.log("Deleting user's videos...");
    await Video.deleteMany({ user: actualUserId });

    // 3.3 Delete User's Reviews
    console.log("Deleting user's reviews...");
    await Review.deleteMany({ userId: actualUserId });

    // 3.4 Delete ALL Reports related to this user
    console.log("Deleting all reports related to user...");
    await Report.deleteMany({
      $or: [{ reporterId: actualUserId }, { reportedUserId: actualUserId }],
    });

    // 3.5 Delete Notifications (sent & received)
    console.log("Deleting notifications...");
    await Notification.deleteMany({
      $or: [{ recipient: actualUserId }, { sender: actualUserId }],
    });

    // Remove user from actors array in remaining notifications
    await Notification.updateMany(
      { actors: actualUserId },
      { $pull: { actors: actualUserId } }
    );

    // 3.6 Clean up Messages
    console.log("Cleaning up messages...");
    // For 1-on-1 conversations, delete the entire conversation
    await Message.deleteMany({
      participants: { $size: 2, $all: [actualUserId] },
    });

    // For group conversations, just remove the user
    await Message.updateMany(
      { participants: actualUserId },
      {
        $pull: {
          participants: actualUserId,
          settings: { userId: actualUserId },
        },
      }
    );

    // 3.7 Remove user's comments, likes, and replies from all posts
    console.log("Cleaning up posts interactions...");
    
    // Remove likes from the main post
    await Post.updateMany(
      { "likes.user": actualUserId },
      { $pull: { likes: { user: actualUserId } } }
    );

    // Remove likes from comments
    await Post.updateMany(
      { "comments.likes.user": actualUserId },
      { $pull: { "comments.$[].likes": { user: actualUserId } } }
    );

    // Remove likes from replies
    await Post.updateMany(
      { "comments.replies.likes.user": actualUserId },
      { $pull: { "comments.$[].replies.$[].likes": { user: actualUserId } } }
    );

    // Remove entire replies made by the user
    await Post.updateMany(
      { "comments.replies.user": actualUserId },
      { $pull: { "comments.$[].replies": { user: actualUserId } } }
    );

    // Remove entire comments made by the user
    await Post.updateMany(
      { "comments.user": actualUserId },
      { $pull: { comments: { user: actualUserId } } }
    );

    // Recalculate counts for posts
    const allPosts = await Post.find({});
    for (const post of allPosts) {
      post.likesCount = post.likes.length;
      post.commentsCount = post.comments.length;
      post.comments.forEach((comment) => {
        comment.likesCount = comment.likes.length;
      });
      await post.save();
    }

    // 3.8 Remove user's comments, likes, and replies from all videos
    console.log("Cleaning up videos interactions...");
    
    // Remove likes from the main video
    await Video.updateMany(
      { "likes.user": actualUserId },
      { $pull: { likes: { user: actualUserId } } }
    );

    // Remove likes from comments
    await Video.updateMany(
      { "comments.likes.user": actualUserId },
      { $pull: { "comments.$[].likes": { user: actualUserId } } }
    );

    // Remove likes from replies
    await Video.updateMany(
      { "comments.replies.likes.user": actualUserId },
      { $pull: { "comments.$[].replies.$[].likes": { user: actualUserId } } }
    );

    // Remove entire replies made by the user
    await Video.updateMany(
      { "comments.replies.user": actualUserId },
      { $pull: { "comments.$[].replies": { user: actualUserId } } }
    );

    // Remove entire comments made by the user
    await Video.updateMany(
      { "comments.user": actualUserId },
      { $pull: { comments: { user: actualUserId } } }
    );

    // Recalculate counts for videos
    const allVideos = await Video.find({});
    for (const video of allVideos) {
      video.likesCount = video.likes.length;
      video.commentsCount = video.comments.length;
      video.comments.forEach((comment) => {
        comment.likesCount = comment.likes.length;
      });
      await video.save();
    }

    // 3.9 Remove user from saved posts/videos of other users
    console.log("Removing from saved collections...");
    await User.updateMany(
      {},
      {
        $pull: {
          savedPosts: { post: { $in: userPosts.map((p) => p._id) } },
          savedVideos: { video: { $in: userVideos.map((v) => v._id) } },
        },
      }
    );

    // 3.10 Clean up social connections
    console.log("Cleaning up social connections...");

    // Remove user from followers arrays
    await User.updateMany(
      { "followers.follower": actualUserId },
      {
        $pull: { followers: { follower: actualUserId } },
        $inc: { followersCount: -1 },
      }
    );

    // Remove user from following arrays
    await User.updateMany(
      { "following.following": actualUserId },
      {
        $pull: { following: { following: actualUserId } },
        $inc: { followingCount: -1 },
      }
    );

    // Remove user from pending follow requests
    await User.updateMany(
      { "pendingFollowRequests.requester": actualUserId },
      { $pull: { pendingFollowRequests: { requester: actualUserId } } }
    );

    // Remove user from sent follow requests
    await User.updateMany(
      { "sentFollowRequests.recipient": actualUserId },
      { $pull: { sentFollowRequests: { recipient: actualUserId } } }
    );

    // Remove user from blocked users
    await User.updateMany(
      { blockedUsers: actualUserId },
      { $pull: { blockedUsers: actualUserId } }
    );

    // Remove user from blockedBy arrays
    await User.updateMany(
      { blockedBy: actualUserId },
      { $pull: { blockedBy: actualUserId } }
    );

    // ========================================
    // STEP 4: Delete User Account
    // ========================================
    console.log("Deleting user account...");
    await User.findByIdAndDelete(actualUserId);

    console.log(`Account deletion completed for user: ${userName}`);

    return res.status(200).json({
      success: true,
      message: "User account banned and deleted successfully",
      userName: userName,
      deletedMedia: mediaToDelete.length,
    });
  } catch (err) {
    console.error("Error in banUserController:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      search,
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by role if provided (you might need to add a role field to your schema)
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Search by username or email
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Determine sort order
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password -otp -resetToken -verificationToken -profileToken') // Exclude sensitive fields
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Format users data
    const formattedUsers = users.map(user => ({
      id: user._id,
      username: user.userName,
      email: user.email,
      name: user.name,
      role: user.role || 'user', // Default to 'user' if no role field
      profilePic: user.profilePic,
      verification: user.verification,
      posts: user.contentCount?.posts || 0,
      videos: user.contentCount?.videos || 0,
      reports: user.reportedNumber || 0,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      joinedAt: user.createdAt,
      isPrivate: user.privacySettings?.isAccountPrivate || false,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
};


const searchUsers = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    // If no query provided, return empty array
    if (!query || query.trim() === '') {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    // Search for users whose username starts with or contains the query
    const users = await User.find({
      userName: { $regex: `^${query}`, $options: 'i' } // Starts with query (case-insensitive)
    })
      .select('_id userName name profilePic verification followersCount') // Only return needed fields
      .limit(parseInt(limit))
      .lean();

    // If no results with "starts with", try "contains"
    let alternativeUsers = [];
    if (users.length === 0) {
      alternativeUsers = await User.find({
        userName: { $regex: query, $options: 'i' } // Contains query anywhere
      })
        .select('_id userName name profilePic verification followersCount')
        .limit(parseInt(limit))
        .lean();
    }

    const resultUsers = users.length > 0 ? users : alternativeUsers;

    // Format response
    const formattedUsers = resultUsers.map(user => ({
      id: user._id,
      username: user.userName,
      name: user.name,
      profilePic: user.profilePic,
      verified: user.verification,
      followers: user.followersCount || 0,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search users',
      message: error.message,
    });
  }
};

const getHighRoleUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      search,
    } = req.query;

    // Build filter object - only get users with elevated roles
    const filter = {
      role: { $in: ['moderator', 'admin', 'superadmin'] }
    };

    // Filter by specific role if provided
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Search by username or email
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Determine sort order
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password -otp -resetToken -verificationToken -profileToken') // Exclude sensitive fields
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Get role statistics
    const roleStats = await User.aggregate([
      { $match: { role: { $in: ['moderator', 'admin', 'superadmin'] } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const stats = {
      superadmin: roleStats.find(r => r._id === 'superadmin')?.count || 0,
      admin: roleStats.find(r => r._id === 'admin')?.count || 0,
      moderator: roleStats.find(r => r._id === 'moderator')?.count || 0,
      total: roleStats.reduce((sum, r) => sum + r.count, 0)
    };

    // Format users data
    const formattedUsers = users.map(user => ({
      id: user._id,
      username: user.userName,
      email: user.email,
      name: user.name,
      role: user.role,
      profilePic: user.profilePic,
      verification: user.verification,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      lastLogin: user.updatedAt, // You can add a lastLogin field to schema if needed
      joinedAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      stats,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error fetching high role users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch high role users',
      message: error.message,
    });
  }
};



// PATCH /api/admin/promote-user - Promote a user to moderator or admin
const promoteUser = async (req, res) => {
  try {
    const { username, role } = req.body;

    // Validate input
    if (!username || !role) {
      return res.status(400).json({
        success: false,
        error: 'Username and role are required',
      });
    }

    // Only allow promotion to moderator or admin (not superadmin)
    if (!['moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Can only promote to moderator or admin role',
      });
    }

    // Find user by username
    const user = await User.findOne({ userName: username });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user already has this role or higher
    if (user.role === role) {
      return res.status(400).json({
        success: false,
        error: `User is already a ${role}`,
      });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify superadmin role',
      });
    }

    // Update user role
    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${username} promoted to ${role} successfully`,
      user: {
        id: user._id,
        username: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error promoting user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to promote user',
      message: error.message,
    });
  }
};

// PATCH /api/admin/demote-user/:username - Demote a user to lower role
const demoteUser = async (req, res) => {
  try {
    const { username } = req.params;
    const { newRole } = req.body;

    // Validate input
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      });
    }

    if (!newRole) {
      return res.status(400).json({
        success: false,
        error: 'New role is required',
      });
    }

    // Validate new role
    if (!['user', 'moderator', 'admin'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be user, moderator, or admin',
      });
    }

    // Find user by username
    const user = await User.findOne({ userName: username });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent demotion of superadmin
    if (user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot demote superadmin',
      });
    }

    // Check if demotion is valid
    const currentRole = user.role;
    if (currentRole === 'user') {
      return res.status(400).json({
        success: false,
        error: 'User already has the lowest role',
      });
    }

    // Update user role
    user.role = newRole;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${username} demoted from ${currentRole} to ${newRole}`,
      user: {
        id: user._id,
        username: user.userName,
        email: user.email,
        role: user.role,
        previousRole: currentRole,
      },
    });
  } catch (error) {
    console.error('Error demoting user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to demote user',
      message: error.message,
    });
  }
};

module.exports = { promoteUser, demoteUser };

module.exports = {
  getMyProfileController,
  updatePrivacySettingsController,
  getOtherProfileController,
  updateProfileController,
  toggleFollowController,
  getFollowersController,
  getFollowingController,
  removeFollowerController,
  getSuggestedUsersController,
  getPendingRequestsController,
  acceptRequestController,
  declineRequestController,
  changePasswordController,
  blockUserController,
  unblockUserController,
  getBlocksController,
  getUserByIdController,
  banUserController,
  getAllUsers,
  searchUsers,
  getHighRoleUsers ,
  promoteUser,
  demoteUser
};