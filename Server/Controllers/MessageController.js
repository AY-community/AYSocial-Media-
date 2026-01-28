const Message = require('../Models/Message');
const User = require('../Models/User');
const cloudinary = require('cloudinary').v2; 

// ==========================================
// CREATE NEW CONVERSATION + FIRST MESSAGE
// ==========================================
const createConversation = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const senderId = req.user.id;

    if (!recipientId || !message?.text) {
      return res.status(400).json({ error: 'Recipient and message text are required' });
    }

    if (recipientId === senderId.toString()) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    if (sender.privacySettings.whoCanDM === 'No One') {
      return res.status(403).json({ error: 'You have disabled sending messages.' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient.blockedUsers.includes(senderId) || recipient.blockedBy.includes(senderId)) {
      return res.status(403).json({ error: 'Cannot send message to this user' });
    }

    if (recipient.privacySettings.whoCanDM === 'No One') {
      return res.status(403).json({ error: 'This user does not accept messages' });
    }

    if (recipient.privacySettings.whoCanDM === 'Friends Only') {
      const isFollowing = recipient.followers.some(
        f => f.follower.toString() === senderId.toString()
      );
      if (!isFollowing) {
        return res.status(403).json({ error: 'You can only message users who follow you' });
      }
    }

    let conversation = await Message.findOne({
      participants: { $all: [senderId, recipientId] }
    }).populate('participants', 'userName name profilePic bio');

    if (conversation) {
      // Existing conversation - add message
      conversation.messages.push({
        senderId,
        type: message.type || 'text',
        text: message.text,
        media: message.media,
        timestamp: new Date()
      });

      const recipientSettings = conversation.settings.find(
        s => s.userId.toString() === recipientId
      );
      if (recipientSettings) {
        recipientSettings.unreadCount += 1;
      }

      await conversation.save();

      // ⭐ CRITICAL: Populate BEFORE emitting
      await conversation.populate('messages.senderId', 'userName profilePic');
      const newMessage = conversation.messages[conversation.messages.length - 1];

      // ⭐ FIXED: Use global emitNewMessage with participants
      global.emitNewMessage(
        conversation._id.toString(), 
        newMessage.toObject(),
        conversation.participants.map(p => p._id)
      );

      return res.status(200).json({
        success: true,
        conversation,
        message: newMessage
      });
    }

    // Determine recipient's status based on follow relationship
    const isFollowing = recipient.followers.some(
      f => f.follower.toString() === senderId.toString()
    );
    const recipientStatus = isFollowing ? 'primary' : 'request';

    // Create new conversation with per-user status
    conversation = await Message.create({
      participants: [senderId, recipientId],
      messages: [{
        senderId,
        type: message.type || 'text',
        text: message.text,
        media: message.media,
        timestamp: new Date()
      }],
      settings: [
        {
          userId: senderId,
          status: 'primary',
          unreadCount: 0
        },
        {
          userId: recipientId,
          status: recipientStatus,
          unreadCount: 1
        }
      ]
    });

    // ⭐ CRITICAL: Populate BEFORE emitting
    await conversation.populate([
      { path: 'participants', select: 'userName name profilePic bio' },
      { path: 'messages.senderId', select: 'userName profilePic' }
    ]);

    const firstMessage = conversation.messages[0];

    // ⭐ FIXED: Use global emitNewMessage with participants
    global.emitNewMessage(
      conversation._id.toString(), 
      firstMessage.toObject(),
      conversation.participants.map(p => p._id)
    );

    res.status(201).json({
      success: true,
      conversation,
      message: firstMessage
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

// ==========================================
// SEND MESSAGE TO EXISTING CONVERSATION
// ==========================================
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { type, text, media, replyTo } = req.body;
    const senderId = req.user.id;

    if (!text && !media) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === senderId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    // ⭐ NEW: Check if users are blocking each other
    const otherParticipantId = conversation.participants.find(
      p => p.toString() !== senderId.toString()
    );

    const sender = await User.findById(senderId);
    const recipient = await User.findById(otherParticipantId);

    if (sender.privacySettings.whoCanDM === 'No One') {
      return res.status(403).json({ error: 'You have disabled sending messages.' });
    }


    if ((sender?.blockedUsers?.includes(otherParticipantId)) || 
        (recipient?.blockedUsers?.includes(senderId)) ||
        (sender?.blockedBy?.includes(otherParticipantId)) ||
        (recipient?.blockedBy?.includes(senderId))) {
      return res.status(403).json({ error: 'Cannot send message - user is blocked or has blocked you' });
    }

    const newMessage = {
      senderId,
      type: type || 'text',
      text,
      media,
      replyTo,
      timestamp: new Date(),
      isDelivered: false,
      deliveredAt: null,
      isRead: false,
      readAt: null
    };

    conversation.messages.push(newMessage);

    const otherSettings = conversation.settings.find(
      s => s.userId.toString() === otherParticipantId.toString()
    );
    if (otherSettings) {
      otherSettings.unreadCount += 1;
      otherSettings.status = 'primary';
    }

    const senderSettings = conversation.settings.find(
      s => s.userId.toString() === senderId.toString()
    );
    if (senderSettings) {
      senderSettings.status = 'primary';
    }

    await conversation.save();

    // ⭐ CRITICAL: Populate sender info BEFORE emitting
    await conversation.populate('messages.senderId', 'userName profilePic');
    const savedMessage = conversation.messages[conversation.messages.length - 1];

    // ⭐ FIXED: Use global emitNewMessage with participants
    global.emitNewMessage(
      conversationId,
      savedMessage.toObject(),
      conversation.participants
    );

    res.status(200).json({
      success: true,
      message: savedMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// ==========================================
// GET ALL CONVERSATIONS FOR USER
// ==========================================
const getConversations = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    
    // ⭐ NEW: Get pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await Message.countDocuments({
      participants: userId
    });

    const conversations = await Message.find({
      participants: userId
    })
      .populate('participants', 'userName name profilePic bio')
      .populate('messages.senderId', 'userName profilePic')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.participants.find(
        p => p._id.toString() !== userId.toString()
      );

      const lastMessage = conv.messages[conv.messages.length - 1];
      const userSettings = conv.settings.find(
        s => s.userId.toString() === userId.toString()
      );

      return {
        _id: conv._id,
        participants: conv.participants,
        status: userSettings?.status || 'primary',
        name: otherUser?.userName || 'Unknown',
        avatar: otherUser?.profilePic || '/default-avatar.png',
        lastMessage: lastMessage,
        time: lastMessage?.timestamp || conv.updatedAt,
        unread: (userSettings?.unreadCount || 0) > 0,
        unreadCount: userSettings?.unreadCount || 0,
        isMuted: userSettings?.isMuted || false
      };
    });

    // ⭐ NEW: Return pagination info
    res.status(200).json({
      success: true,
      conversations: formattedConversations,
      hasMore: skip + limit < totalCount,
      total: totalCount,
      page,
      limit
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// ==========================================
// GET SPECIFIC CONVERSATION WITH MESSAGES (WITH PAGINATION)
// ==========================================
const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    // ⭐ NEW: Get pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversation = await Message.findById(conversationId)
      .populate('participants', 'userName name profilePic bio blockedUsers blockedBy privacySettings followers')
      .populate('messages.senderId', 'userName profilePic');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p._id.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    // ⭐ NEW: Check if users are blocking each other
    const currentUser = conversation.participants.find(p => p._id.toString() === userId.toString());
    const otherUser = conversation.participants.find(p => p._id.toString() !== userId.toString());

    const isBlocked = currentUser?.blockedUsers?.some(id => id.toString() === otherUser._id.toString()) || 
                     otherUser?.blockedUsers?.some(id => id.toString() === currentUser._id.toString()) ||
                     currentUser?.blockedBy?.some(id => id.toString() === otherUser._id.toString()) ||
                     otherUser?.blockedBy?.some(id => id.toString() === currentUser._id.toString());

    const userSettings = conversation.settings.find(
      s => s.userId.toString() === userId.toString()
    );
    const themeColor = userSettings?.themeColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const isMuted = userSettings?.isMuted || false; // ⭐ NEW: Extract mute status

    // Filter out deleted messages
    const allMessages = conversation.messages.filter(msg => 
      !msg.deletedFor || !msg.deletedFor.includes(userId)
    );

    // ⭐ NEW: Paginate messages (get latest first, then reverse for display)
    const totalMessages = allMessages.length;
    const startIndex = Math.max(0, totalMessages - (page * limit));
    const endIndex = Math.max(0, totalMessages - skip);
    
    const paginatedMessages = allMessages.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        messages: allMessages, // Keep for backward compatibility
        themeColor: themeColor,
        isMuted: isMuted, // ⭐ NEW: Include mute status at top level
        isBlocked: isBlocked, // ⭐ NEW: Include blocking status
        otherUser: {
          _id: otherUser._id,
          userName: otherUser.userName,
          name: otherUser.name,
          profilePic: otherUser.profilePic || '/default-avatar.png',
          bio: otherUser.bio
        }
      },
      messages: paginatedMessages, // ⭐ NEW: Paginated messages
      pagination: {
        page,
        limit,
        total: totalMessages,
        hasMore: startIndex > 0
      }
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

// ==========================================
// MARK CONVERSATION AS READ
// ==========================================
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    conversation.messages.forEach(msg => {
      if (msg.senderId.toString() !== userId.toString() && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = new Date();
      }
    });

    const userSettings = conversation.settings.find(
      s => s.userId.toString() === userId.toString()
    );
    const lastSeenTimestamp = new Date();
    if (userSettings) {
      userSettings.unreadCount = 0;
      userSettings.lastSeenAt = lastSeenTimestamp;
    }

    await conversation.save();

    // ⭐ Emit socket event for real-time seen indicator
    console.log(`📤 Emitting messages-seen to room ${conversationId}`);
    global.io.to(conversationId).emit('messages-seen', { 
      userId, 
      timestamp: lastSeenTimestamp 
    });

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// ==========================================
// MARK CONVERSATION AS DELIVERED
// ==========================================
const markAsDelivered = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    // Mark all undelivered messages from other user as delivered
    let updated = false;
    conversation.messages.forEach(msg => {
      if (msg.senderId.toString() !== userId.toString() && !msg.isDelivered) {
        msg.isDelivered = true;
        msg.deliveredAt = new Date();
        updated = true;
      }
    });

    if (updated) {
      await conversation.save();

      // Emit socket event for real-time delivery indicator
      console.log(`📤 Emitting messages-delivered to room ${conversationId}`);
      global.io.to(conversationId).emit('messages-delivered', {
        userId,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as delivered'
    });

  } catch (error) {
    console.error('Mark as delivered error:', error);
    res.status(500).json({ error: 'Failed to mark messages as delivered' });
  }
};

// ==========================================
// DELETE CONVERSATION
// ==========================================
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    await Message.findByIdAndDelete(conversationId);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

const uploadMessageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: "Image is too large. Maximum size is 10MB." 
      });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "ay-social/messages", resource_type: "auto" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await streamUpload();

    return res.status(200).json({ 
      success: true,
      imageUrl: result.secure_url 
    });

  } catch (err) {
    console.error('Upload message image error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// DELETE INDIVIDUAL MESSAGE (hide from your view only)
// ==========================================
const deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const message = conversation.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.deletedFor) {
      message.deletedFor = [];
    }

    if (message.deletedFor.includes(userId)) {
      return res.status(400).json({ error: 'Message already deleted' });
    }

    message.deletedFor.push(userId);
    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted from your view',
      messageId
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// ==========================================
// UNSEND MESSAGE (removes for everyone)
// ==========================================
const unsendMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const messageIndex = conversation.messages.findIndex(
      msg => msg._id.toString() === messageId
    );

    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = conversation.messages[messageIndex];

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only unsend your own messages' });
    }

    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    const maxUnsendTime = 24 * 60 * 60 * 1000;
    
    if (messageAge > maxUnsendTime) {
      return res.status(403).json({ 
        error: 'Cannot unsend messages older than 24 hours' 
      });
    }

    conversation.messages.splice(messageIndex, 1);
    await conversation.save();

    // ⭐ Emit unsend event to room
    console.log(`📤 Emitting message-unsent to room ${conversationId}`);
    global.io.to(conversationId).emit('message-unsent', {
      conversationId,
      messageId
    });

    res.status(200).json({
      success: true,
      message: 'Message unsent successfully',
      messageId
    });

  } catch (error) {
    console.error('Unsend message error:', error);
    res.status(500).json({ error: 'Failed to unsend message' });
  }
};

// ==========================================
// SEND REPLY TO A MESSAGE
// ==========================================
const sendReply = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { replyToMessageId, text, type, media } = req.body;
    const senderId = req.user.id;

    if (!text && !media) {
      return res.status(400).json({ error: 'Reply text or media is required' });
    }

    const conversation = await Message.findById(conversationId)
      .populate('messages.senderId', 'userName');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === senderId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const originalMessage = conversation.messages.id(replyToMessageId);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    const originalSender = await User.findById(originalMessage.senderId).select('userName');

    const replyMessage = {
      senderId,
      type: type || 'text',
      text,
      media,
      replyTo: {
        messageId: replyToMessageId,
        text: originalMessage.text || '[Image]',
        senderName: originalSender?.userName || 'Unknown'
      },
      timestamp: new Date()
    };

    conversation.messages.push(replyMessage);

    const otherParticipantId = conversation.participants.find(
      p => p.toString() !== senderId.toString()
    );

    const otherSettings = conversation.settings.find(
      s => s.userId.toString() === otherParticipantId.toString()
    );
    if (otherSettings) {
      otherSettings.unreadCount += 1;
      otherSettings.status = 'primary';
    }

    const senderSettings = conversation.settings.find(
      s => s.userId.toString() === senderId.toString()
    );
    if (senderSettings) {
      senderSettings.status = 'primary';
    }

    await conversation.save();

    // ⭐ CRITICAL: Populate BEFORE emitting
    await conversation.populate('messages.senderId', 'userName profilePic');
    const newReplyMessage = conversation.messages[conversation.messages.length - 1];

    // ⭐ FIXED: Use global emitNewMessage with participants
    global.emitNewMessage(
      conversationId,
      newReplyMessage.toObject(),
      conversation.participants
    );

    res.status(200).json({
      success: true,
      message: newReplyMessage
    });

  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};

// ==========================================
// ADD/REMOVE REACTION TO MESSAGE
// ==========================================
const toggleReaction = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const message = conversation.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId.toString()
    );

    let action;
    if (existingReactionIndex !== -1) {
      const existingReaction = message.reactions[existingReactionIndex];
      
      if (existingReaction.emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
        action = 'removed';
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
        action = 'changed';
      }
    } else {
      message.reactions.push({ emoji, userId });
      action = 'added';
    }

    await conversation.save();

    // ⭐ Emit reaction update to room
    console.log(`📤 Emitting message-reaction to room ${conversationId}`);
    global.io.to(conversationId).emit('message-reaction', {
      conversationId,
      messageId,
      emoji,
      userId,
      action,
      reactions: message.reactions
    });

    res.status(200).json({
      success: true,
      action,
      messageId,
      emoji,
      reactions: message.reactions
    });

  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
};

// ==========================================
// GET REACTIONS FOR A MESSAGE
// ==========================================
const getMessageReactions = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const message = conversation.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await conversation.populate('messages.reactions.userId', 'userName profilePic');

    res.status(200).json({
      success: true,
      reactions: message.reactions || []
    });

  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Failed to get reactions' });
  }
};

// ==========================================
// UPDATE CONVERSATION THEME COLOR
// ==========================================
const updateConversationTheme = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { themeColor } = req.body;
    const userId = req.user.id;

    if (!themeColor) {
      return res.status(400).json({ 
        success: false, 
        error: 'Theme color is required' 
      });
    }

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation not found' 
      });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not part of this conversation' 
      });
    }

    const userSettings = conversation.settings.find(
      s => s.userId.toString() === userId.toString()
    );

    if (userSettings) {
      userSettings.themeColor = themeColor;
    } else {
      conversation.settings.push({
        userId: userId,
        themeColor: themeColor,
        status: 'primary',
        unreadCount: 0,
        isMuted: false
      });
    }

    await conversation.save();

    res.status(200).json({ 
      success: true, 
      message: 'Theme updated successfully',
      themeColor: themeColor
    });

  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update theme' 
    });
  }
};

// ==========================================
// GET CONVERSATION THEME COLOR
// ==========================================
const getConversationTheme = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation not found' 
      });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not part of this conversation' 
      });
    }

    const userSettings = conversation.settings.find(
      s => s.userId.toString() === userId.toString()
    );

    const themeColor = userSettings?.themeColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    res.status(200).json({ 
      success: true, 
      themeColor: themeColor
    });

  } catch (error) {
    console.error('Get theme error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get theme' 
    });
  }
};

// ==========================================
// CHECK IF USERS ARE BLOCKING EACH OTHER
// ==========================================
const checkBlockingStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId)
      .populate('participants', '_id blockedUsers blockedBy');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p._id.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const currentUser = conversation.participants.find(p => p._id.toString() === userId.toString());
    const otherUser = conversation.participants.find(p => p._id.toString() !== userId.toString());

    const isUserBlockedByOther = currentUser?.blockedUsers?.some(id => id.toString() === otherUser._id.toString());
    const isUserBlockingOther = otherUser?.blockedUsers?.some(id => id.toString() === currentUser._id.toString());
    const isUserBlockedByOtherUser = currentUser?.blockedBy?.some(id => id.toString() === otherUser._id.toString());
    const isOtherBlockedByUser = otherUser?.blockedBy?.some(id => id.toString() === currentUser._id.toString());

    const isBlocked = isUserBlockedByOther || isUserBlockingOther || isUserBlockedByOtherUser || isOtherBlockedByUser;

    res.status(200).json({
      success: true,
      isBlocked: isBlocked,
      blockReason: isUserBlockedByOther ? 'You have blocked this user' :
                   isUserBlockingOther ? 'This user has blocked you' :
                   isUserBlockedByOtherUser ? 'This user has blocked you' :
                   isOtherBlockedByUser ? 'You have blocked this user' :
                   null
    });

  } catch (error) {
    console.error('Check blocking status error:', error);
    res.status(500).json({ error: 'Failed to check blocking status' });
  }
};

// ==========================================
// TOGGLE MUTE/UNMUTE CONVERSATION
// ==========================================
const toggleMute = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Message.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const userSettings = conversation.settings.find(
      s => s.userId.toString() === userId.toString()
    );

    if (userSettings) {
      userSettings.isMuted = !userSettings.isMuted;
      await conversation.save();

      res.status(200).json({
        success: true,
        isMuted: userSettings.isMuted,
        message: userSettings.isMuted ? 'Conversation muted' : 'Conversation unmuted'
      });
    } else {
      return res.status(404).json({ error: 'User settings not found' });
    }

  } catch (error) {
    console.error('Toggle mute error:', error);
    res.status(500).json({ error: 'Failed to toggle mute' });
  }
};

module.exports = {
  createConversation,
  sendMessage,
  getConversations,
  getConversation,
  markAsRead,
  markAsDelivered,
  deleteConversation,
  uploadMessageImage,
  deleteMessage,
  unsendMessage,
  sendReply,
  toggleReaction,
  getMessageReactions,
  updateConversationTheme,
  getConversationTheme,
  checkBlockingStatus,
  toggleMute
};