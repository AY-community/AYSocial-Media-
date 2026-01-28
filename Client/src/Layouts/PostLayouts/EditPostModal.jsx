import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";

export default function EditPostModal({ toggleModal, display, postData }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [postText, setPostText] = useState("");

  useEffect(() => {
    if (postData && display) {
      setPostText(postData.content || "");
    }
  }, [postData, display]);

  const handleCancel = () => {
    closeImageViewer();
    toggleModal();
  };

  const openImageViewer = (imageUrl, index) => {
    setViewingImage({ src: imageUrl, index });
  };

  const closeImageViewer = () => {
    setViewingImage(null);
  };

  const navigateImage = (direction) => {
    if (!viewingImage || !postData?.images) return;

    let newIndex;
    if (direction === "next") {
      newIndex =
        viewingImage.index < postData.images.length - 1
          ? viewingImage.index + 1
          : 0;
    } else {
      newIndex =
        viewingImage.index > 0
          ? viewingImage.index - 1
          : postData.images.length - 1;
    }

    setViewingImage({
      src: postData.images[newIndex],
      index: newIndex,
    });
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

  /* Edit Post Api */
  const handleSubmit = async () => {
    try {
      setButtonLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API}/edit-post/${postData.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({ postText }),
        }
      );

      if (response.ok) {
        window.location.reload();
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
            <h2 className="modal-title">{t("Edit a Post")}</h2>
            <button className="close-btn" onClick={handleCancel}>
              &times;
            </button>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("Edit the post title...")}</h3>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              type="text"
              placeholder={t("what's on your mind?")}
              className="section-input"
              maxLength="300"
            ></textarea>
          </div>

          {postData?.images && postData.images.length > 0 && (
            <div className="modal-section">
              <h3 className="section-title">{t("Current Images")}</h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#666",
                  marginBottom: "20px",
                }}
              >
                {t("Images cannot be changed after posting")}
              </p>

              <div className="images-grid">
                {postData.images.map((imageUrl, index) => (
                  <div key={index} className="image-preview-wrapper">
                    <img
                      src={imageUrl}
                      alt={`Post image ${index + 1}`}
                      className="preview-image-thumb clickable-image"
                      onClick={() => openImageViewer(imageUrl, index)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={handleCancel}>
              {t("Cancel")}
            </button>
            <button
              onClick={() => handleSubmit()}
              type="submit"
              className="btn btn-primary"
              id="applyBtn"
              disabled={buttonLoading}
            >
              {buttonLoading ? t("Updating...") : t("Update")}
            </button>
          </div>
        </div>

        {viewingImage && (
          <div className="image-lightbox-overlay">
            <button className="lightbox-close-btn" onClick={closeImageViewer}>
              ×
            </button>

            {postData.images && postData.images.length > 1 && (
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
                alt="Post image"
                className="lightbox-main-image"
              />
            </div>

            <div className="lightbox-backdrop" onClick={closeImageViewer} />
          </div>
        )}
      </div>
    </>
  );
}