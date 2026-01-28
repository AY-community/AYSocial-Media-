import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";

export default function EditVideoModal({ toggleModal, display, videoData }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [videoText, setVideoText] = useState(videoData?.content);

  useEffect(() => {
    if (videoData && display) {
      setVideoText(videoData.content || "");
    }
  }, [videoData, display]);

  const handleCancel = () => {
    toggleModal();
  };

  const handleSubmit = async () => {
    try {
      setButtonLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API}/edit-video/${videoData.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({ videoText }),
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
            <h2 className="modal-title">{t("Edit a Video")}</h2>
            <button className="close-btn" onClick={handleCancel}>
              &times;
            </button>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("Edit Video")}</h3>
            <textarea
              value={videoText}
              onChange={(e) => setVideoText(e.target.value)}
              type="text"
              placeholder={t("what's on your mind?")}
              className="section-input"
              maxLength="300"
            ></textarea>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("Current Video")}</h3>
            <p
              style={{
                fontSize: "14px",
                color: "#666",
                marginBottom: "20px",
              }}
            >
              {t("Images cannot be changed after posting")}
            </p>

            <div className="video-preview-container">
              <div
                className="video-preview-wrapper"
                style={{ background: "black" }}
              >
                <video
                  controls
                  controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  src={videoData?.videoUrl}
                  className="video-preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "400px",
                    objectFit: "cover",
                  }}
                  muted
                />
              </div>
            </div>
          </div>

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
      </div>
    </>
  );
}