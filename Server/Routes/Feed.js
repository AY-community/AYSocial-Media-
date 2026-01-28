const express = require("express");
const router = express.Router();
const DecodeToken = require("../Middlewares/DecodeToken");

const { 
  getForYouFeed,
  getFollowingFeed,
  getPopularFeed,
  getExploreFeed,
  getReelsFeed,
  getFollowingReelsFeed,
  trackReelView,
  getFeedItem , 
  getSearchHistory,
  addSearchToHistory,
  clearSearchHistory,
  removeSearchItem, 
  searchAll,
  searchPosts,
  searchVideos,
  searchUsers,
} = require("../Controllers/FeedController");

router.use(DecodeToken);

router.get("/for-you", getForYouFeed);
router.get("/following", getFollowingFeed);
router.get("/popular", getPopularFeed);
router.get("/explore", getExploreFeed);

router.get("/reels", getReelsFeed);
router.get("/reels/following", getFollowingReelsFeed);
router.post("/reels/:videoId/view", trackReelView);

router.get('/search-history', getSearchHistory);
router.post('/search-history', addSearchToHistory);
router.delete('/search-history', clearSearchHistory);
router.delete('/search-history/:searchId', removeSearchItem);

// Search routes - BEFORE the /:id route
router.get("/search/all/:query", searchAll);
router.get("/search/posts/:query", searchPosts);
router.get("/search/videos/:query", searchVideos);
router.get("/search/users/:query", searchUsers);

// Generic /:id route - MUST BE LAST
router.get("/:id", getFeedItem);

module.exports = router;