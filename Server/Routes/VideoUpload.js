const router = require("express").Router();
const upload = require("../Config/multerMemory.js");
const { uploadChunk, completeUpload } = require("../Controllers/UploadController");

router.post("/chunk", upload.fields([{ name: 'videoChunk', maxCount: 1 }]), uploadChunk);
router.post("/complete", completeUpload);

module.exports = router;
