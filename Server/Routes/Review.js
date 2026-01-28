
const express = require("express");
const router = express.Router();
const reviewController = require("../Controllers/ReviewsController");
const  decodeToken  = require("../Middlewares/DecodeToken"); 

// Submit a review
router.post("/submit", decodeToken, reviewController.submitReview);

// Get user's last review info (optional)
router.get("/last", decodeToken, reviewController.getUserLastReview);

router.get("/", decodeToken , reviewController.getAllReviews);

// Approve a review
router.put("/approve/:reviewId", decodeToken , reviewController.approveReview);

// Reject a review
router.put("/reject/:reviewId", decodeToken , reviewController.rejectReview);

// Delete a review
router.delete("/delete/:reviewId", decodeToken  , reviewController.deleteReview);

module.exports = router;