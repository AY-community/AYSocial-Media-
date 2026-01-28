// ============================================
// Review Model (Models/Review.js)
// ============================================

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    feedback: {
      type: String,
      required: true,
      minLength: 10,
      maxLength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// ✅ Index to ensure one review per user every 3 days
reviewSchema.index({ userId: 1, createdAt: 1 });

// ✅ Static method to check for recent reviews (within 3 days)
reviewSchema.statics.hasRecentReview = async function (userId) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const recentReview = await this.findOne({
    userId: userId,
    createdAt: { $gte: threeDaysAgo },
  });

  return !!recentReview;
};

const Review = mongoose.model("review", reviewSchema);

module.exports = Review;