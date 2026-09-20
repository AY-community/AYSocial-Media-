const router = require("express").Router();
const upload = require("../Config/multerMemory.js");
const decodeToken = require("../Middlewares/DecodeToken.js");

const {
  addVideoController,
  getVideoController,
  getSavedVideoController,
  deleteVideoController,
  editVideoController,
  addVideoCommentController,
  getVideoCommentsController,
  toggleVideoLikeCommentController,
  deleteVideoCommentController,
  addVideoReplyController,
  deleteVideoReplyController,
  toggleVideoLikeReplyController,
  toggleVideoLikeController,
  fetchLikeStatusController,
  toggleSaveController,
  getSharedVideoController,
  uploadChunk,
  completeUpload
} = require("../Controllers/VideoControllers");

router.post("/add-video/:userName", upload.single("video"), addVideoController);

router.get("/videos/:userName", getVideoController);
router.get("/videos/saved/:userName", getSavedVideoController);


 router.post("/videos/toggle-like/:userId", decodeToken, toggleVideoLikeController);


router.delete("/videos/:videoId/:userId" , decodeToken, deleteVideoController);

router.put("/edit-video/:videoId" , decodeToken, editVideoController)

 router.post("/videos/add-comment" , decodeToken, addVideoCommentController)

router.get("/videos/get-comments/:videoId/:userId" , getVideoCommentsController)

router.post("/videos/toggle-like-comment/:userId" , decodeToken, toggleVideoLikeCommentController )

 router.delete("/videos/delete-comment/:videoId/:commentId" , decodeToken, deleteVideoCommentController)

 router.post("/videos/add-reply/:videoId/:commentId" , decodeToken, addVideoReplyController)

 router.delete("/videos/delete-reply/:videoId/:commentId/:replyId" , decodeToken, deleteVideoReplyController)

 router.post("/videos/toggle-like-reply/:videoId/:commentId/:replyId" , decodeToken, toggleVideoLikeReplyController)


 router.get("/videos/like-status/:videoId/:userId" , fetchLikeStatusController)

router.post("/videos/toggle-save/:userId" , decodeToken, toggleSaveController)

router.get("/shared-video/:videoId/:userId" , getSharedVideoController)

  router.post("/chunk", upload.fields([{ name: 'videoChunk', maxCount: 1 }]), uploadChunk);
router.post("/complete", completeUpload);
 


module.exports = router;
