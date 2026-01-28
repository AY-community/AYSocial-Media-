const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    description: { type: String },
    videoUrl: { type: String },
    duration: { type: Number, required: true },

    // ✅ Likes array with timestamp
    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: Date.now }, // timestamp for analytics
      },
    ],

    // ✅ Comments array
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        content: { type: String, required: true, maxLength: 100 },
        createdAt: { type: Date, default: Date.now },
        likes: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            createdAt: { type: Date, default: Date.now },
          },
        ],
        replies: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
            content: { type: String, required: true, maxLength: 500 },
            createdAt: { type: Date, default: Date.now },
            likes: [
              {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
                createdAt: { type: Date, default: Date.now },
              },
            ],
            likesCount: { type: Number, default: 0 },
          },
        ],
        likesCount: { type: Number, default: 0 }, // keep counts
      },
    ],

    likesCount: { type: Number, default: 0 }, // total video likes
    commentsCount: { type: Number, default: 0 }, // total comments

    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true } // createdAt / updatedAt for video
);

const Video = mongoose.model("video", videoSchema);

module.exports = Video;
