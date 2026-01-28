// ============================================
// Reviews Controller (Controllers/ReviewsController.js)
// ============================================

const Review = require("../Models/Review");
const User = require("../Models/User");

// Submit Review Controller
exports.submitReview = async (req, res) => {
  try {
    // Get the user ID from decoded token
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "You must be logged in to submit a review",
      });
    }

    const { rating, feedback } = req.body;

    // Validate required fields
    if (!rating || !feedback) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 10) {
      return res.status(400).json({
        success: false,
        error: "Rating must be between 1 and 10",
      });
    }

    // Validate feedback length
    const trimmedFeedback = feedback.trim();
    if (trimmedFeedback.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Feedback must be at least 10 characters",
      });
    }

    if (trimmedFeedback.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Feedback must not exceed 2000 characters",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // ✅ Check for recent reviews (within 3 days)
    const hasRecent = await Review.hasRecentReview(userId);

    if (hasRecent) {
      return res.status(400).json({
        success: false,
        error: "You can only submit one review every 3 days. Please try again later.",
      });
    }

    // Create the review
    const newReview = new Review({
      userId,
      rating,
      feedback: trimmedFeedback,
      status: "pending",
    });

    await newReview.save();

    // Optional: Send notification to admins
    // await notifyAdmins(newReview);

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully! Thank you for your feedback.",
      reviewId: newReview._id,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while submitting the review. Please try again.",
    });
  }
};

// Get User's Last Review (optional - to show when they can submit again)
exports.getUserLastReview = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const lastReview = await Review.findOne({ userId })
      .sort({ createdAt: -1 })
      .select("createdAt rating");

    if (!lastReview) {
      return res.status(200).json({
        success: true,
        canSubmit: true,
        lastReview: null,
      });
    }

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const canSubmit = lastReview.createdAt < threeDaysAgo;

    // Calculate when they can submit again
    const nextSubmitDate = new Date(
      lastReview.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000
    );

    return res.status(200).json({
      success: true,
      canSubmit,
      lastReview: {
        date: lastReview.createdAt,
        rating: lastReview.rating,
      },
      nextSubmitDate: canSubmit ? null : nextSubmitDate,
    });
  } catch (error) {
    console.error("Error fetching last review:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred",
    });
  }
};

// ============================================
// ADMIN CONTROLLERS
// ============================================

// Get all reviews with pagination
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, status, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    const limit = 20;
    const skip = (parseInt(page) - 1) * limit;

    // Build filter query
    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Build sort object
    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Get reviews with pagination
    const reviews = await Review.find(filter)
      .populate('userId', 'userName profilePic')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalReviews = await Review.countDocuments(filter);
    const totalPages = Math.ceil(totalReviews / limit);

    // Get counts by status
    const pendingCount = await Review.countDocuments({ status: 'pending' });
    const approvedCount = await Review.countDocuments({ status: 'approved' });
    const rejectedCount = await Review.countDocuments({ status: 'rejected' });

    return res.status(200).json({
      success: true,
      reviews: reviews.map(review => ({
        id: review._id,
        userId: review.userId._id,
        userName: review.userId.userName,
        userProfilePic: review.userId.profilePic,
        rating: review.rating,
        feedback: review.feedback,
        status: review.status,
        createdAt: review.createdAt,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReviews,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      counts: {
        all: totalReviews,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while fetching reviews",
    });
  }
};

// Approve a review
exports.approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    review.status = 'approved';
    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review approved successfully",
      review: {
        id: review._id,
        status: review.status,
      },
    });
  } catch (error) {
    console.error("Error approving review:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while approving the review",
    });
  }
};

// Reject a review
exports.rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    review.status = 'rejected';
    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review rejected successfully",
      review: {
        id: review._id,
        status: review.status,
      },
    });
  } catch (error) {
    console.error("Error rejecting review:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while rejecting the review",
    });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndDelete(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while deleting the review",
    });
  }
};

