const cloudinary = require("../config/Cloudinary");
const User = require("../Models/User");
const Video = require("../Models/Video");
 const deleteFromCloudinary = async (imageUrl) => {
      if (!imageUrl) return;
      
      try {
        console.log("Attempting to delete image:", imageUrl);
        
        // Extract public_id from Cloudinary URL
        const parts = imageUrl.split('/');
        const uploadIndex = parts.findIndex(part => part === 'upload');
        
        if (uploadIndex === -1) {
          console.log("Invalid Cloudinary URL format");
          return;
        }
        
        // Get everything after 'upload/v{version}/'
        const pathAfterUpload = parts.slice(uploadIndex + 2); // Skip 'upload' and version
        const fileWithExtension = pathAfterUpload.join('/');
        
        // Remove file extension
        const publicId = fileWithExtension.substring(0, fileWithExtension.lastIndexOf('.'));
        
        console.log("Extracted public_id:", publicId);
        
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Cloudinary deletion result:", result);
        
        if (result.result !== 'ok') {
          console.log("Failed to delete image from Cloudinary:", result);
        }
      } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
      }
    };

const addProfilePicController = async (req, res) => {
  try {
    const file = req.files?.profilePic?.[0];
    const token = req.body?.token;
    if (!file || !token) {
      return res.status(400).json({ message: "File or token missing" });
    }
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "ay-social/profile-pics" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(file.buffer);
      });
    };
    const result = await streamUpload();

    const userFoundByToken = await User.findOne({
      profileToken: token,
    });

    userFoundByToken.profilePic = result.secure_url;
    userFoundByToken.profileToken = undefined;
    await userFoundByToken.save();

    res.status(200).json({
      message: "Profile picture uploaded successfully!",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateCoverPicController = async (req, res) => {
  try {
    const { type } = req.body;
    let { color } = req.body;

    if (color === "null" || color === "" || !color) {
      color = null;
    }

    const { userName } = req.params;
    let image = null;

    const currentUser = await User.findOne({ userName });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }



    if (currentUser.coverPic?.image) {
      console.log("Current user has image, attempting to delete:", currentUser.coverPic.image);
      await deleteFromCloudinary(currentUser.coverPic.image);
    }

    if (type === 'color') {
      if (color === null) {
        return res.status(400).json({
          message: "No color selected"
        });
      }
      
      image = null; // Clear image when setting color
    }

    if (type === 'image') {
      if (!req.files || !req.files.coverPic) {
        return res.status(400).json({
          message: "No image selected"
        });
      }

      const file = req.files.coverPic[0];
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: "ay-social/cover-pics",
              resource_type: "auto" // Automatically detect file type
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          stream.end(file.buffer);
        });
      };

      const result = await streamUpload();
      image = result.secure_url;
      color = null; // Clear color when setting image
      
      console.log("New image uploaded:", image);
    }

    const updatedUser = await User.findOneAndUpdate(
      { userName },
      {
        coverPic: {
          type: type,
          color: color,
          image: image
        }
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Cover updated successfully",
      coverPic: updatedUser.coverPic
    });

  } catch (err) {
    console.error("Error in updateCoverPicController:", err);
    return res.status(500).json({ message: err.message });
  }
};

const updateProfilePicController = async (req, res) => {
  try {
    const { userName } = req.params;

    const currentUser = await User.findOne({ userName });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }



    // Check if image file is provided
    if (!req.files || !req.files.profilePic) {
      return res.status(400).json({
        message: "No profile image selected"
      });
    }

    // Delete existing profile image if it exists
    if (currentUser.profilePic) {
      console.log("Current user has profile image, attempting to delete:", currentUser.profilePic);
      await deleteFromCloudinary(currentUser.profilePic);
    }

    // Upload new profile image
    const file = req.files.profilePic[0];
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: "ay-social/profile-pics", // Using consistent folder name from addProfilePicController
            resource_type: "auto" // Automatically detect file type
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(file.buffer);
      });
    };

    const result = await streamUpload();
    const profilePicUrl = result.secure_url;
    
    console.log("New profile image uploaded:", profilePicUrl);

    // Update user with new profile picture URL
    const updatedUser = await User.findOneAndUpdate(
      { userName },
      {
        profilePic: profilePicUrl
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Profile picture updated successfully",
      profilePic: updatedUser.profilePic
    });

  } catch (err) {
    console.error("Error in updateProfilePicController:", err);
    return res.status(500).json({ message: err.message });
  }
};

const deleteProfilePictureController = async(req , res) =>{
  const {userName} = req.params;

  const userFoundByUserName = await User.findOne({userName})

  if(userFoundByUserName.profilePic){
   await  deleteFromCloudinary(userFoundByUserName.profilePic)
  }

        await User.findOneAndUpdate(
        {userName}, 
        {profilePic: null}
      )
    

  return res.status(200).json({message:"profile pic deleted successfully"})



}






module.exports = { addProfilePicController, updateCoverPicController , updateProfilePicController , deleteProfilePictureController , updateProfilePicController  };

