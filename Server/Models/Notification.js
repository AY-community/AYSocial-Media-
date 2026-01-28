const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    type: {
      type: String,
      enum: [
        'default',
        'post_like',
        'video_like',
        'post_comment',
        'video_comment',
        'comment_like',
        'reply',
        'reply_like',
        'follow',
        'follow_back',
        'follow_request',           // NEW: When someone requests to follow you
        'follow_request_accepted',  // NEW: When your follow request is accepted
        'new_post',
        'new_video'
      ],
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      default: null,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "video",
      default: null,
    },
    commentId: {
      type: String,
      default: null,
    },
    replyId: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    actors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    }],
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, updatedAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, type: 1, post: 1, video: 1 });

const Notification = mongoose.model("notification", notificationSchema);

module.exports = Notification;