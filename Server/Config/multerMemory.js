const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow video chunks (they don't have proper mimetype)
  if (file.fieldname === 'videoChunk') {
    return cb(null, true);
  }
  
  // For other files, check mimetype
  if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
    return cb(new Error("Only image and video files are allowed!"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, 
  },
});

module.exports = upload;