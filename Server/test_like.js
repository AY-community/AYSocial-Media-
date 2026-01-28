
    const User = require("./Models/User");
    const Post = require("./Models/Post");
    const Video = require("./Models/Video");
    const mongoose = require("mongoose");
    const { getFeedItem } = require("./Controllers/FeedController");
    
    require('dotenv').config({ path: './.env' });
    
    
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
    
    const testGetFeedItem = async () => {
      try {
    
        
    
            
    
            await mongoose.connect(process.env.DATA_BASE);
    
            console.log(process.env.DATA_BASE)
    
        
    
        
    
            const post = await Post.findOne().populate("user");
        if (!post) {
          console.log("No post found to test.");
          return;
        }
    
        const user = await User.findOne();
        if (!user) {
          console.log("No user found to test.");
          return;
        }
    
        post.likes.push({ user: user._id });
        await post.save();
    
    
        const req = {
          params: { id: post._id.toString() },
          user: { id: user._id.toString() },
        };
    
        const res = {
          status: (code) => {
            console.log(`Status: ${code}`);
            return {
              json: (data) => {
                console.log("Response:", JSON.stringify(data, null, 2));
              },
            };
          },
        };
    
        const currentUser = await User.findById(req.user.id).select("savedPosts savedVideos following");
        const formattedItem = formatContent(post, req.user.id, currentUser, "post");
    
        console.log("Manually formatted item:", JSON.stringify(formattedItem, null, 2));
    
        console.assert(formattedItem.userLiked === true, "userLiked should be true");
    
      } catch (error) {
        console.error("Error during test:", error);
      } finally {
        await mongoose.disconnect();
      }
    };
    
    testGetFeedItem();
    
    module.exports = {
        testGetFeedItem
    }
    
    