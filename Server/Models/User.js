const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    userName: {
      type: String,
      required: true,
      unique: true,
    },

    // Block system
    blockedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user" }
    ],
    blockedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user" }
    ],

    name: { type: String },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    verification: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    resetToken: { type: String },
    resetTokenExpire: { type: Date },
    profileToken: { type: String },
    birthday: { type: Number },
    country: { type: String },
    profilePic: { type: String, default: "" },

    coverPic: {
      type: { type: String, enum: ["color", "image"] },
      color: {
        type: String,
        default: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);",
      },
      image: { type: String, default: null },
    },

    // ✅ Followers & Following with timestamps
    followers: [
      {
        follower: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    following: [
      {
        following: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    contentCount: {
      posts: { type: Number, default: 0 },
      videos: { type: Number, default: 0 },
    },

    pendingFollowRequests: [
      {
        requester: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    sentFollowRequests: [
      {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    bio: { type: String },
    gender: { type: String },
    website: { type: String },

    savedPosts: [
      {
        post: { type: mongoose.Schema.Types.ObjectId, ref: "post" },
      },
    ],

    savedVideos: [
      {
        video: { type: mongoose.Schema.Types.ObjectId, ref: "video" },
      },
    ],

    jobs: [
      {
        value: String,
        label: String,
        _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      },
    ],

    privacySettings: {
      isAccountPrivate: { type: Boolean, default: false },
      whoCanDM: {
        type: String,
        enum: ["Everyone", "Friends Only", "No One"],
        default: "Everyone",
      },
    },

    role: {
  type: String,
  enum: ['user', 'moderator', 'admin' , 'superadmin'],
  default: 'user'
} , 

    searchHistory: [
      {
        text: { type: String, required: true },
        searchedAt: { type: Date, default: Date.now },
      },
    ],

    // ✅ Track how many times this user has been reported
    reportedNumber: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ verificationTokenExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.user || mongoose.model("user", userSchema);