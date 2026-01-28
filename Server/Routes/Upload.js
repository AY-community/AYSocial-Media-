const router = require("express").Router();
const upload = require("../Config/multerMemory.js");


const {addProfilePicController , updateCoverPicController , updateProfilePicController , deleteProfilePictureController } = require("../Controllers/UploadController")

router.post("/add-profile-pic" , 
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "token", maxCount: 1 },
  ])
 , addProfilePicController )

 router.put("/update-cover-pic/:userName" ,   upload.fields([
    { name: "coverPic", maxCount: 1 }
  ]) , updateCoverPicController)

  router.put("/update-profile-pic/:userName" ,  upload.fields([
    { name: "profilePic", maxCount: 1 }]) ,updateProfilePicController)

  router.delete("/delete-profile-pic/:userName" , deleteProfilePictureController )


module.exports = router