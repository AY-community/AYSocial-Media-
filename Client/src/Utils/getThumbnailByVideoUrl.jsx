export const getCloudinaryThumbnail = (videoUrl) => {
  const urlParts = videoUrl.split("/");
  const uploadIndex = urlParts.findIndex((part) => part === "upload");

  if (uploadIndex === -1) return null;

  const cloudName = urlParts[3];
  const pathAfterUpload = urlParts.slice(uploadIndex + 1).join("/");
  const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");

  return `https://res.cloudinary.com/${cloudName}/video/upload/w_400,h_300,c_fill,f_jpg,so_1/${publicId}.jpg`;
};
