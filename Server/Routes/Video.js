const router = require("express").Router();
const upload = require("../Config/multerMemory.js");

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


 router.post("/videos/toggle-like/:userId", toggleVideoLikeController);


router.delete("/videos/:videoId/:userId" , deleteVideoController);

router.put("/edit-video/:videoId" , editVideoController)

 router.post("/videos/add-comment" , addVideoCommentController)

router.get("/videos/get-comments/:videoId/:userId" , getVideoCommentsController)

router.post("/videos/toggle-like-comment/:userId" , toggleVideoLikeCommentController )

 router.delete("/videos/delete-comment/:videoId/:commentId" , deleteVideoCommentController)

 router.post("/videos/add-reply/:videoId/:commentId" , addVideoReplyController)

 router.delete("/videos/delete-reply/:videoId/:commentId/:replyId" , deleteVideoReplyController)

 router.post("/videos/toggle-like-reply/:videoId/:commentId/:replyId" , toggleVideoLikeReplyController)


 router.get("/videos/like-status/:videoId/:userId" , fetchLikeStatusController)

router.post("/videos/toggle-save/:userId" , toggleSaveController)

router.get("/shared-video/:videoId/:userId" , getSharedVideoController)

  router.post("/chunk", upload.fields([{ name: 'videoChunk', maxCount: 1 }]), uploadChunk);
router.post("/complete", completeUpload);
 


module.exports = router;
