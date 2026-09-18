const router = require("express").Router();
const upload = require("../Config/multerMemory.js");
const decodeToken = require("../Middlewares/DecodeToken.js");


const { addPostController 
    , toggleLikeController
     , deletePostController 
     , editPostController
      , addCommentController
       , getCommentsController
        , toggleLikeCommentController
         , deleteCommentController
           , addReplyController
           , deleteReplyController
           , toggleLikeReplyController
           , getPostController,
           getSavedPostController,
           fetchLikeStatusController,
           toggleSaveController,
           getSharedPostController
     } = require("../Controllers/PostControllers");


 router.post("/add-post/:userName" , decodeToken, upload.array("images", 4)  , addPostController)

 router.get('/posts/:userName', getPostController);

  router.get('/posts/saved/:userName', getSavedPostController);




 router.post("/posts/toggle-like/:userId/", decodeToken, toggleLikeController);

 router.delete("/posts/:postId/:userId" , decodeToken, deletePostController)

 router.put("/edit-post/:postId" , decodeToken, editPostController)

 router.post("/posts/add-comment" , decodeToken, addCommentController)

 router.get("/posts/get-comments/:postId/:userId" , getCommentsController)

 router.post("/posts/toggle-like-comment/:userId" , decodeToken, toggleLikeCommentController )

 router.delete("/posts/delete-comment/:postId/:commentId" , decodeToken, deleteCommentController)

 router.post("/posts/add-reply/:postId/:commentId" , decodeToken, addReplyController)

 router.delete("/posts/delete-reply/:postId/:commentId/:replyId" , decodeToken, deleteReplyController)

 router.post("/posts/toggle-like-reply/:postId/:commentId/:replyId" , decodeToken, toggleLikeReplyController)

  router.get("/posts/like-status/:postId/:userId" , fetchLikeStatusController)

  router.post("/posts/toggle-save/:userId" , decodeToken, toggleSaveController)

  router.get("/shared-post/:postId/:userId" , getSharedPostController)

 module.exports = router