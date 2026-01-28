const router = require("express").Router();
const decodeToken = require("../Middlewares/DecodeToken.js");
const {getMyProfileController , getOtherProfileController , updateProfileController , toggleFollowController , getFollowersController, getFollowingController , removeFollowerController , getSuggestedUsersController , changePasswordController , updatePrivacySettingsController ,getPendingRequestsController,acceptRequestController,declineRequestController, blockUserController, unblockUserController, getBlocksController  , getUserByIdController ,  banUserController
    , getAllUsers , searchUsers , getHighRoleUsers , promoteUser , demoteUser}  = require("../Controllers/UserControllers");

router.get("/me", decodeToken , getMyProfileController)

router.get("/user/:userName/:loggedInUserId" , getOtherProfileController)

router.get("/user/:userId", getUserByIdController);


router.get("/edit/:userName" , getOtherProfileController);

router.put("/edit/:userName", updateProfileController );

router.post("/toggle-follow-status/:targetUserId/:loggedInUserId" , toggleFollowController)

router.get("/get-followers/:userId",  getFollowersController )

router.get("/get-following/:userId",  getFollowingController )

router.delete('/remove-follower/:otherUserId/:id', removeFollowerController);

router.get('/suggested-users/:userId', getSuggestedUsersController);

router.put("/change-password" , decodeToken , changePasswordController);

router.put("/update-privacy-settings" , decodeToken , updatePrivacySettingsController);

// Block routes
router.put('/user/block/:targetUserId', decodeToken ,blockUserController);
router.post('/unblock/:targetUserId' , decodeToken, unblockUserController);
router.get('/blocks', decodeToken, getBlocksController);

router.get("/follow-requests/:userId" , getPendingRequestsController )

router.post("/follow-requests/accept/:userId/:requesterId", acceptRequestController);

router.post("/follow-requests/decline/:userId/:requesterId", declineRequestController);

router.delete('/account/:userNameId', banUserController);

router.get('/all-users', getAllUsers);

router.get('/search-users', searchUsers);

router.get('/admin/high-role-users', getHighRoleUsers);

router.patch( '/admin/promote-user', promoteUser);

router.patch( '/admin/demote-user/:username', demoteUser);


module.exports = router;