const multer = require("multer");
const cloudinary = require("../Config/Cloudinary");
const User = require("../Models/User");
const Post = require("../Models/Post");
const Video = require("../Models/Video")
const Notification = require("../Models/Notification");


const addPostController = async (req, res) => {
  try {
    const { postText, imageCount } = req.body;
    const {userName} = req.params; 

    const user = await User.findOne({ userName: userName });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded." });
    } 
    if (req.files.length > 4) {
      return res.status(400).json({ error: "You can upload a maximum of 4 images." });
    }

    const maxSize = 10 * 1024 * 1024; 
    for (const file of req.files) {
      if (file.size > maxSize) {
        return res.status(400).json({ 
          error: `Image is too large. Maximum size is 10MB.` 
        });
      }
    }

    const imageUrls = [
      ...req.files.map(file => {
        const streamUpload = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "ay-social/posts", resource_type: "auto" },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            stream.end(file.buffer);
          });
        };
        return streamUpload();
      })
    ];

    const uploadResults = await Promise.all(imageUrls);
    const imageLinks = uploadResults.map(result => result.secure_url);

    const newPost = new Post({
      description: postText || null,
      images: imageLinks,
      user: user._id
    });

    user.contentCount.posts += 1;

    await newPost.save();
    await user.save();

    return res.status(200).json({ message: "Post created successfully" });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};

const toggleLikeController = async (req, res) => {
    try{
        const {postId} = req.body;
        const {userId} = req.params;

        const post = await Post.findById(postId).populate('user', 'userName');
        if(!post){
            return res.status(404).json({error:"Post not found"});
        }

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({error:"User not found"});
        }

        // Block check: disallow like if either direction is blocked
        const postAuthorForLike = await User.findById(post.user._id).select('blockedUsers blockedBy');
        const likeBlocked = (
          (user.blockedUsers || []).some(id => id.toString() === postAuthorForLike._id.toString()) ||
          (user.blockedBy || []).some(id => id.toString() === postAuthorForLike._id.toString()) ||
          (postAuthorForLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
          (postAuthorForLike.blockedBy || []).some(id => id.toString() === user._id.toString())
        );
        if (likeBlocked) {
            return res.status(403).json({ error: 'Action not allowed' });
        }

        if (!post.likesCount) {
            post.likesCount = post.likes?.length || 0;
        }

        const alreadyLiked = post.likes.some(like => 
            like.user?.toString() === userId || like.toString() === userId
        );

        if(alreadyLiked){
            post.likes = post.likes.filter(like => 
                like.user?.toString() !== userId && like.toString() !== userId
            );
            post.likesCount = Math.max(0, post.likesCount - 1);

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const existingNotification = await Notification.findOne({
                recipient: post.user._id,
                type: 'post_like',
                post: postId,
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
                    existingNotification.message = `liked your post`;
                    await existingNotification.save();

                    const populatedNotification = await Notification.findById(existingNotification._id)
                        .populate('sender', 'userName profilePic');
                    
                    if (global.sendNotificationToUser && populatedNotification) {
                        global.sendNotificationToUser(post.user._id.toString(), {
                            _id: populatedNotification._id,
                            type: 'post_like',
                            message: populatedNotification.message,
                            sender: {
                                _id: populatedNotification.sender._id,
                                userName: populatedNotification.sender.userName,
                                profilePic: populatedNotification.sender.profilePic
                            },
                            post: postId,
                            count: populatedNotification.count,
                            read: false,
                            createdAt: populatedNotification.createdAt,
                            updatedAt: populatedNotification.updatedAt
                        });
                    }
                } else {
                    existingNotification.sender = existingNotification.actors[existingNotification.actors.length - 1];
                    existingNotification.message = `and ${existingNotification.count - 1} others liked your post`;
                    await existingNotification.save();

                    const populatedNotification = await Notification.findById(existingNotification._id)
                        .populate('sender', 'userName profilePic');
                    
                    if (global.sendNotificationToUser && populatedNotification) {
                        global.sendNotificationToUser(post.user._id.toString(), {
                            _id: populatedNotification._id,
                            type: 'post_like',
                            message: populatedNotification.message,
                            sender: {
                                _id: populatedNotification.sender._id,
                                userName: populatedNotification.sender.userName,
                                profilePic: populatedNotification.sender.profilePic
                            },
                            post: postId,
                            count: populatedNotification.count,
                            read: false,
                            createdAt: populatedNotification.createdAt,
                            updatedAt: populatedNotification.updatedAt
                        });
                    }
                }
            }
        }
        else{
            post.likes.push({ user: userId, createdAt: new Date() });
            post.likesCount++;

            if (post.user._id.toString() !== userId) {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

                const existingNotification = await Notification.findOne({
                    recipient: post.user._id,
                    type: 'post_like',
                    post: postId,
                    updatedAt: { $gte: twentyFourHoursAgo }
                });

                if (existingNotification) {
                    if (!existingNotification.actors.some(actorId => actorId.toString() === userId)) {
                        existingNotification.actors.push(userId);
                        existingNotification.count += 1;
                        existingNotification.sender = userId;
                        
                        if (existingNotification.count === 2) {
                            existingNotification.message = `and 1 other liked your post`;
                        } else {
                            existingNotification.message = `and ${existingNotification.count - 1} others liked your post`;
                        }
                        
                        await existingNotification.save();

                        const populatedNotification = await Notification.findById(existingNotification._id)
                            .populate('sender', 'userName profilePic');
                        
                        if (global.sendNotificationToUser && populatedNotification) {
                            global.sendNotificationToUser(post.user._id.toString(), {
                                _id: populatedNotification._id,
                                type: 'post_like',
                                message: populatedNotification.message,
                                sender: {
                                    _id: populatedNotification.sender._id,
                                    userName: populatedNotification.sender.userName,
                                    profilePic: populatedNotification.sender.profilePic
                                },
                                post: postId,
                                count: populatedNotification.count,
                                read: false,
                                createdAt: populatedNotification.createdAt,
                                updatedAt: populatedNotification.updatedAt
                            });
                        }
                    }
                } else {
                    const newNotification = await Notification.create({
                        recipient: post.user._id,
                        sender: userId,
                        type: 'post_like',
                        post: postId,
                        message: `liked your post`,
                        count: 1,
                        actors: [userId],
                        read: false
                    });

                    const populatedNotification = await Notification.findById(newNotification._id)
                        .populate('sender', 'userName profilePic');
                    
                    if (global.sendNotificationToUser && populatedNotification) {
                        global.sendNotificationToUser(post.user._id.toString(), {
                            _id: populatedNotification._id,
                            type: 'post_like',
                            message: populatedNotification.message,
                            sender: {
                                _id: populatedNotification.sender._id,
                                userName: populatedNotification.sender.userName,
                                profilePic: populatedNotification.sender.profilePic
                            },
                            post: postId,
                            count: 1,
                            read: false,
                            createdAt: populatedNotification.createdAt,
                            updatedAt: populatedNotification.updatedAt
                        });
                    }
                }
            }
        }

        await post.save();
        
        return res.status(200).json({
            message: "Toggled like successfully",
            updatedLikesCount: post.likes.length,
            isLiked: !alreadyLiked
        });
    }
    catch(err){
        console.error("Toggle post like error:", err);
        return res.status(500).json({ error: err.message });
    }
}

const deletePostController = async(req, res) => {
  try {
    const { postId , userId } = req.params;

    const postFoundById = await Post.findById(postId);
    const user = await User.findById(userId);

    if(!user){
      return res.status(404).json({message:"User not found"})
    }

    if (!postFoundById) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (postFoundById.images && postFoundById.images.length > 0) {
      const cloudinary = require('cloudinary').v2;
      
      for (let i = 0; i < postFoundById.images.length; i++) {
        const imageUrl = postFoundById.images[i];
        
        const urlParts = imageUrl.split('/');
        const fileName = urlParts.pop().split('.')[0];
        const publicId = `ay-social/posts/${fileName}`;
        
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
        }
      }
    }



    user.contentCount.posts -= 1;

    await Post.findByIdAndDelete(postId);
        await user.save();


    return res.status(200).json({ message: "Post and images deleted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const editPostController = async(req ,res) => {

  try{
  const {postId} = req.params
  let {postText} = req.body

  postText = postText?.trim();


  const postFoundById = await Post.findById(postId)

  if(!postFoundById){
    return res.status(404).json({message:"Post not found"})
  }

  await Post.findByIdAndUpdate(
  postId,                       
  { $set: { description: postText } }, 
); 



return res.status(200).json({message:"post updated succesfully"})
  }
  catch(err){
    return res.status(500).json({message:"internal server error"})
  }
}

const addCommentController = async(req, res) => {
  try {
    const { postId, userId, content } = req.body;

    if (!postId) {
      return res.status(404).json({ message: "post not found" });
    }

    if (!userId) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!content) {
      return res.status(400).json({ message: "no comment added" });
    }

    const post = await Post.findById(postId).populate('user', 'userName');
    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Block check: disallow comment if either direction is blocked
    const postAuthorForComment = await User.findById(post.user._id).select('blockedUsers blockedBy');
    const commentBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === postAuthorForComment._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === postAuthorForComment._id.toString()) ||
      (postAuthorForComment.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (postAuthorForComment.blockedBy || []).some(id => id.toString() === user._id.toString())
    );
    if (commentBlocked) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $push: {
          comments: {
            user: userId,
            content: content,
            createdAt: new Date(),
            likes: [],
            likesCount: 0,
            replies: []
          }
        }
      },
      { new: true }
    );

    const newCommentId = updatedPost.comments[updatedPost.comments.length - 1]._id;

    if (post.user._id.toString() !== userId) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingNotification = await Notification.findOne({
        recipient: post.user._id,
        type: 'post_comment',
        post: postId,
        updatedAt: { $gte: twentyFourHoursAgo }
      });

      if (existingNotification) {
        if (!existingNotification.actors.some(actorId => actorId.toString() === userId)) {
          existingNotification.actors.push(userId);
          existingNotification.count += 1;
          existingNotification.sender = userId;
          
          if (existingNotification.count === 2) {
            existingNotification.message = `and 1 other commented on your post`;
          } else {
            existingNotification.message = `and ${existingNotification.count - 1} others commented on your post`;
          }
          
          await existingNotification.save();
        }

        const populatedNotification = await Notification.findById(existingNotification._id)
          .populate('sender', 'userName profilePic');
          
        if (global.sendNotificationToUser && populatedNotification) {
          global.sendNotificationToUser(post.user._id.toString(), {
            _id: populatedNotification._id,
            type: 'post_comment',
            message: populatedNotification.message,
            sender: {
              _id: populatedNotification.sender._id,
              userName: populatedNotification.sender.userName,
              profilePic: populatedNotification.sender.profilePic
            },
            post: postId,
            commentId: newCommentId.toString(),
            count: populatedNotification.count,
            read: false,
            createdAt: populatedNotification.createdAt,
            updatedAt: populatedNotification.updatedAt
          });
        }
      } else {
        const newNotification = await Notification.create({
          recipient: post.user._id,
          sender: userId,
          type: 'post_comment',
          post: postId,
          commentId: newCommentId.toString(),
          message: `commented on your post`,
          count: 1,
          actors: [userId],
          read: false
        });

        const populatedNotification = await Notification.findById(newNotification._id)
          .populate('sender', 'userName profilePic');
        
        if (global.sendNotificationToUser && populatedNotification) {
          global.sendNotificationToUser(post.user._id.toString(), {
            _id: populatedNotification._id,
            type: 'post_comment',
            message: populatedNotification.message,
            sender: {
              _id: populatedNotification.sender._id,
              userName: populatedNotification.sender.userName,
              profilePic: populatedNotification.sender.profilePic
            },
            post: postId,
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
      commentId: newCommentId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const getCommentsController = async (req, res) => {
  try{
  const { postId, userId } = req.params;
  const {page} = req.query
   

      const limit = 10; 
    const skip = parseInt(page) * limit; 

  const postFoundById = await Post.findById(postId).populate({
    path: 'comments.user',
    select: 'userName profilePic' 
  }).populate({
    path: 'comments.replies.user',
    select: 'userName profilePic'
  });

  if (!postFoundById) {
    return res.status(404).json({ message: "Post not found" });
  }

      const totalComments = postFoundById.comments.length;

          const paginatedComments = postFoundById.comments
      .reverse()
      .slice(skip, skip + limit);

    const commentsWithLikedStatus = paginatedComments.map(comment => {
      const commentObj = comment.toObject();
      return {
        ...commentObj,
        likesCount: comment.likesCount || comment.likes?.length || 0,
        isLiked: comment.likes && comment.likes.some(like => 
          like.user?.toString() === userId.toString() || like.toString() === userId.toString()
        ),
        replies: commentObj.replies ? commentObj.replies.map(reply => ({
          ...reply,
          likesCount: reply.likesCount || reply.likes?.length || 0,
          isLiked: reply.likes && reply.likes.some(like => 
            like.user?.toString() === userId.toString() || like.toString() === userId.toString()
          )
        })) : []
      };
    });

        const hasMore = (skip + limit) < totalComments;


            return res.status(200).json({ 
      data: commentsWithLikedStatus,
      hasMore,
      totalComments,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalComments / limit)
    });



}
catch(err){
  return res.status(500).json({error:"internal server error"})
}
};

const toggleLikeCommentController = async (req, res) => {
    try {
        const { commentId } = req.body;
        const { userId } = req.params;

        const post = await Post.findOne({ "comments._id": commentId }).populate('user', 'userName');
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Block check: disallow like on comment if blocked either way with post author or comment owner
        const postAuthorForCommentLike = await User.findById(post.user._id).select('blockedUsers blockedBy');
        const commentOwnerForLike = await User.findById(comment.user).select('blockedUsers blockedBy');
        const commentLikeBlocked = (
          (user.blockedUsers || []).some(id => id.toString() === postAuthorForCommentLike._id.toString()) ||
          (user.blockedBy || []).some(id => id.toString() === postAuthorForCommentLike._id.toString()) ||
          (postAuthorForCommentLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
          (postAuthorForCommentLike.blockedBy || []).some(id => id.toString() === user._id.toString()) ||
          (user.blockedUsers || []).some(id => id.toString() === commentOwnerForLike._id.toString()) ||
          (user.blockedBy || []).some(id => id.toString() === commentOwnerForLike._id.toString()) ||
          (commentOwnerForLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
          (commentOwnerForLike.blockedBy || []).some(id => id.toString() === user._id.toString())
        );
        if (commentLikeBlocked) {
            return res.status(403).json({ error: 'Action not allowed' });
        }

        const alreadyLiked = comment.likes.some(like => 
            like.user && like.user.toString() === userId.toString()
        ); 

        if (alreadyLiked) {
            comment.likes = comment.likes.filter(like => 
                !like.user || like.user.toString() !== userId.toString()
            );
            comment.likesCount--;

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const existingNotification = await Notification.findOne({
                recipient: comment.user,
                type: 'comment_like',
                post: post._id,
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
                            post: post._id,
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
                            post: post._id,
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
                    post: post._id,
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
                                post: post._id,
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
                        post: post._id,
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
                            post: post._id,
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

        await post.save();

        return res.status(200).json({
            message: "Toggled comment like successfully",
            likesCount: comment.likes.length, 
            isLiked: !alreadyLiked
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const deleteCommentController = async (req , res) => {
  try{
    const {postId , commentId} = req.params;

    const postFoundById = await Post.findById(postId)

    if(!postFoundById){
      return res.status(404).json({message:"Post not found"})
    }

    const comment = postFoundById.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    postFoundById.comments.pull(commentId);
    postFoundById.commentsCount = postFoundById.commentsCount - 1;

    await postFoundById.save();

    return res.status(200).json({ 
      message: "Comment deleted successfully" 
    });

  }
  catch(err){
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
}

const addReplyController = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId, content } = req.body;

    if (!postId) {
      return res.status(404).json({ message: "Post not found" });
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

    const post = await Post.findById(postId).populate('user', 'userName');
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Block check
    const postAuthorForReply = await User.findById(post.user._id).select('blockedUsers blockedBy');
    const replyBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === postAuthorForReply._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === postAuthorForReply._id.toString()) ||
      (postAuthorForReply.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (postAuthorForReply.blockedBy || []).some(id => id.toString() === user._id.toString())
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
    await post.save();

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

const deleteReplyController = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    comment.replies.pull(replyId);
    await post.save();

    return res.status(200).json({ 
      message: "Reply deleted successfully" 
    });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err.message });
  }
};
const toggleLikeReplyController = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId).populate('user', 'userName');
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(commentId);
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
    const postAuthorForReplyLike = await User.findById(post.user._id).select('blockedUsers blockedBy');
    const replyOwnerForLike = await User.findById(reply.user).select('blockedUsers blockedBy');
    const replyLikeBlocked = (
      (user.blockedUsers || []).some(id => id.toString() === postAuthorForReplyLike._id.toString()) ||
      (user.blockedBy || []).some(id => id.toString() === postAuthorForReplyLike._id.toString()) ||
      (postAuthorForReplyLike.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
      (postAuthorForReplyLike.blockedBy || []).some(id => id.toString() === user._id.toString()) ||
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

    await post.save();

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


const getPostController = async(req, res) => {
  try {
    const {userName} = req.params;
    const {currentUserId, page = 0, limit} = req.query;

    const skip = parseInt(page) * parseInt(limit); 

    const user = await User.findOne({userName}); 
    if(!user){
      return res.status(404).json({message: "User not found"});
    } 

    const isFollowing = user.followers.some(
      follower => follower.follower && follower.follower.toString() === currentUserId
    );

    if (user.privacySettings.isAccountPrivate && user._id.toString() !== currentUserId && !isFollowing) {
      return res.status(200).json({
        posts: [],
        hasMore: false,
        totalPosts: 0,
        currentPage: parseInt(page),
        totalPages: 0,
        isPrivate: true
      });
    }

    const currentUser = await User.findById(currentUserId);
    // Block check: if either user blocked the other, hide posts
    if (currentUser && user && (
    (currentUser.blockedUsers || []).some(id => id.toString() === user._id.toString()) ||
    (currentUser.blockedBy || []).some(id => id.toString() === user._id.toString()) ||
    (user.blockedUsers || []).some(id => id.toString() === currentUser._id.toString()) ||
    (user.blockedBy || []).some(id => id.toString() === currentUser._id.toString())
    )) {
    return res.status(200).json({
    posts: [],
    hasMore: false,
    totalPosts: 0,
    currentPage: parseInt(page),
    totalPages: 0
    });
    }
    const userSavedPosts = currentUser?.savedPosts || [];
    
    const totalPosts = await Post.countDocuments({ user: user._id });

    let posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    posts = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      isLiked: post.likes?.some(like => like.user?.toString() === currentUserId || like.toString() === currentUserId) || false,
      isSaved: userSavedPosts.some(savedPost => savedPost.post?.toString() === post._id.toString()) || false,
    }));

    const hasMore = (skip + parseInt(limit)) < totalPosts;

    return res.status(200).json({
      posts,
      hasMore,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / parseInt(limit))
    });

  } catch(err) {
    return res.status(500).json({message: "internal server error"});
  }
};
const getSavedPostController = async(req, res) => {
  try {
    const {userName} = req.params;
    const {currentUserId, page = 0, limit} = req.query;
    const skip = parseInt(page) * parseInt(limit);
    const user = await User.findOne({userName});
    if(!user){
      return res.status(404).json({message: "User not found"});
    } 
    const currentUser = await User.findById(currentUserId);
    const userSavedPosts = currentUser?.savedPosts || [];
    const totalPosts = userSavedPosts.length; 

  
    let savedPostIds = userSavedPosts.map(savedPost => savedPost.post);
    let posts = await Post.find({ _id: { $in: savedPostIds } })
      .populate('user', 'userName  profilePic') 
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    posts = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes?.length || 0,  
      commentsCount: post.comments?.length || 0,
      isLiked: post.likes?.includes(currentUserId) || false,
      isSaved: true,
      likes: undefined,
      comments: undefined
    }));
    
    const hasMore = (skip + parseInt(limit)) < totalPosts;
    return res.status(200).json({
      posts,
      hasMore,
      totalPosts
    });
  }
  catch(err) {
    console.error('Error in getSavedPostController:', err); 
    return res.status(500).json({message: "internal server error"});
  }
}


const fetchLikeStatusController = async (req ,res) => {

  try{
   const {postId ,userId} = req.params;

    const post = await Post.findById(postId);
        if(!post){
            return res.status(404).json({error:"Post not found"});
        }

      const alreadyLiked = post.likes.includes(userId);
      const likeNumber = post.likesCount

      return res.status(200).json({isLiked:alreadyLiked , likeNumber})

  }
  catch(err){
    return res.status(500).json({message:"internal server error"})
  }

}

const toggleSaveController = async (req, res) => {
  try{
    const { userId } = req.params;
    const { postId } = req.body;

    const userFoundById = await User.findById(userId);

    if(!userFoundById){
      return res.status(404).json({error:"User not found"})
    }
   

const alreadySaved = userFoundById.savedPosts.some(savedPost => savedPost.post.toString() === postId);
    if(alreadySaved){
      userFoundById.savedPosts.pull({ post: postId })
    }
    else{
      userFoundById.savedPosts.push({ post: postId })
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

const getSharedPostController = async (req, res) => {
  try {
    const { postId, userId } = req.params;
    
    const postFoundById = await Post.findById(postId);

    if (!postFoundById) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Get current user's saved posts
    const postOwnerBlockCheck = await User.findById(postFoundById.user).select('blockedUsers blockedBy');
    const viewerBlockCheck = await User.findById(userId).select('blockedUsers blockedBy');
    if (postOwnerBlockCheck && viewerBlockCheck) {
      const blockedEitherWay = (
        (viewerBlockCheck.blockedUsers || []).some(id => id.toString() === postOwnerBlockCheck._id.toString()) ||
        (viewerBlockCheck.blockedBy || []).some(id => id.toString() === postOwnerBlockCheck._id.toString()) ||
        (postOwnerBlockCheck.blockedUsers || []).some(id => id.toString() === viewerBlockCheck._id.toString()) ||
        (postOwnerBlockCheck.blockedBy || []).some(id => id.toString() === viewerBlockCheck._id.toString())
      );
      if (blockedEitherWay) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }
    const currentUser = await User.findById(userId);
    const userSavedPosts = currentUser?.savedPosts || [];

    const postWithSaveStatus = {
      ...postFoundById.toObject(),
      likesCount: postFoundById.likes?.length || 0,
      commentsCount: postFoundById.comments?.length || 0,
      isSaved: userSavedPosts.some(savedPost => 
        savedPost.post?.toString() === postId.toString()
      ) || false,
      likes: undefined,
      comments: undefined,
    };

    return res.status(200).json(postWithSaveStatus);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: "internal server error" });
  }
};



module.exports = { addPostController ,
   toggleLikeController ,
    deletePostController ,
     editPostController ,
      addCommentController ,
       getCommentsController ,
        toggleLikeCommentController ,
         deleteCommentController  ,
         addReplyController ,
         deleteReplyController ,
         toggleLikeReplyController ,
         getPostController ,
         getSavedPostController,
   fetchLikeStatusController,
  toggleSaveController ,
getSharedPostController} ;
