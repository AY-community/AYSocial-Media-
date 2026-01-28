const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  }],
  
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file'],
      default: 'text'
    },
    
    text: String,
    
    media: {
      url: String,
      thumbnail: String
    },
    
    replyTo: {
      messageId: mongoose.Schema.Types.ObjectId,
      text: String,
      senderName: String
    },
    
    reactions: [{
      emoji: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    }],
    
    isRead: {
      type: Boolean,
      default: false
    },
    
    readAt: {
      type: Date
    },

    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }],
    
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  settings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    status: {
      type: String,
      enum: ['primary', 'request'],
      default: 'primary'
    },
    // ADD THEME COLOR HERE - per user theme preference
    themeColor: {
      type: String,
      default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    unreadCount: {
      type: Number,
      default: 0
    },

    lastSeenAt: {
      type: Date
    },
    isMuted: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

messageSchema.index({ participants: 1 });
messageSchema.index({ 'settings.status': 1 });
messageSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Message', messageSchema);