import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";

export default function AddPostModal({ toggleModal, display }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [postText, setPostText] = useState("");

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);

    files.forEach((file) => {
      if (file) {
        setSelectedFiles((prev) => [...prev, file]);

        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              src: e.target.result,
              file: file,
              name: file.name,
              size: file.size,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    if (isMaxImagesReached || buttonLoading) return;
    document.getElementById("fileInput").click();
  };

  const isMaxImagesReached = selectedImages.length >= 4;

  const handleCancel = () => {
    setSelectedImages([]);
    closeImageViewer();
    toggleModal();
  };

  const openImageViewer = (image, index) => {
    setViewingImage({ ...image, index });
  };

  const closeImageViewer = () => {
    setViewingImage(null);
  };

  const navigateImage = (direction) => {
    if (!viewingImage) return;

    let newIndex;
    if (direction === "next") {
      newIndex =
        viewingImage.index < selectedImages.length - 1
          ? viewingImage.index + 1
          : 0;
    } else {
      newIndex =
        viewingImage.index > 0
          ? viewingImage.index - 1
          : selectedImages.length - 1;
    }

    setViewingImage({ ...selectedImages[newIndex], index: newIndex });
  };

  const handleKeyPress = (e) => {
    if (!viewingImage) return;

    if (e.key === "Escape") {
      closeImageViewer();
    } else if (e.key === "ArrowRight") {
      navigateImage("next");
    } else if (e.key === "ArrowLeft") {
      navigateImage("prev");
    }
  };

  /* Display Image Size*/
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    if (viewingImage) {
      document.addEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "unset";
    };
  }, [viewingImage]);

  const handleSubmit = async () => {
    try {
      setButtonLoading(true);

      const formData = new FormData();

      formData.append("postText", postText);

      selectedFiles.forEach((file, index) => {
        formData.append("images", file);
      });

      formData.append("imageCount", selectedFiles.length);

      const response = await fetch(
        `${import.meta.env.VITE_API}/add-post/${user.userName}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        setPostText("");
        setSelectedImages([]);
        setSelectedFiles([]);
        toggleModal();

        alert(t("Post created successfully!"));
      }
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <>
      <div
        className="modal-overlay"
        style={{ display: display ? "flex" : "none" }}
      >
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">{t("Add a Post")}</h2>
            <button className="close-btn" onClick={handleCancel}>
              &times;
            </button>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("share your thoughts")}</h3>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              type="text"
              placeholder={t("what's on your mind?")}
              className="section-input"
              maxLength="300"
            ></textarea>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("Upload Your Image(s)")}</h3>
            <div
              className={`upload-section ${
                isMaxImagesReached || buttonLoading ? "disabled" : ""
              }`}
              onClick={handleUploadClick}
              style={{
                opacity: isMaxImagesReached || buttonLoading ? 0.6 : 1,
                cursor:
                  isMaxImagesReached || buttonLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <div className="upload-icon">📁</div>
              <div className="upload-text">{t("Click to upload an image")}</div>
              <div className="upload-subtext">{t("JPG, PNG, or GIF up to 10MB")}</div>
            </div>
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              multiple
              disabled={isMaxImagesReached || buttonLoading}
            />
            {selectedImages.length > 0 ? (
              <div className="images-preview-container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBlock: "20px",
                  }}
                >
                  <p className="selected-images-title">
                    {selectedImages.length} {t("image(s) selected")}
                  </p>
                  <button
                    onClick={() => {
                      selectedImages.forEach((img) =>
                        URL.revokeObjectURL(img.preview)
                      );
                      setSelectedImages([]);
                    }}
                    className="clear-all-btn"
                  >
                    {t("Clear all")}
                  </button>
                </div>

                <div className="images-grid">
                  {selectedImages.map((image, index) => (
                    <div key={image.id} className="image-preview-wrapper">
                      <img
                        src={image.src}
                        alt={`Selected ${index + 1}`}
                        className="preview-image-thumb clickable-image"
                        onClick={() => openImageViewer(image, index)}
                      />
                      <button
                        className="remove-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="required-message">
              {t("* Image is required for posting (Max 4 images)")}
            </p>
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={handleCancel}>
              {t("Cancel")}
            </button>
            <button
              onClick={handleSubmit}
              type="submit"
              className="btn btn-primary"
              id="applyBtn"
              disabled={buttonLoading || selectedImages.length === 0}
            >
              {buttonLoading ? t("Uploading...") : t("Add")}
            </button>
          </div>
        </div>
      </div>

      {viewingImage && (
        <div className="image-lightbox-overlay">
          <button className="lightbox-close-btn" onClick={closeImageViewer}>
            ×
          </button>

          {selectedImages.length > 1 && (
            <>
              <button
                className="lightbox-nav-btn lightbox-prev-btn"
                onClick={() => navigateImage("prev")}
              >
                ‹
              </button>
              <button
                className="lightbox-nav-btn lightbox-next-btn"
                onClick={() => navigateImage("next")}
              >
                ›
              </button>
            </>
          )}

          <div className="lightbox-image-container">
            <img
              src={viewingImage.src}
              alt={viewingImage.name}
              className="lightbox-main-image"
            />

            <div className="lightbox-image-info">
              <div className="lightbox-info-content">
                <div className="lightbox-info-text">
                  <div className="lightbox-image-details">
                    {formatFileSize(viewingImage.size)} •{" "}
                  </div>
                </div>
                <button
                  className="lightbox-remove-btn"
                  onClick={() => {
                    const indexToRemove = viewingImage.index;
                    closeImageViewer();
                    removeImage(indexToRemove);
                  }}
                >
                  {t("Remove")}
                </button>
              </div>
            </div>
          </div>

          <div className="lightbox-backdrop" onClick={closeImageViewer} />
        </div>
      )}
    </>
  );
}