import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";

export default function AddVideoModal({ toggleModal, display }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoText, setVideoText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef(null);
  
  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedVideo(URL.createObjectURL(file));
      setVideoFile(file);
      setIsPlaying(false);
    }
  };

  const handleUploadClick = () => {
    document.getElementById("fileInput").click();
  };

  const handleCancel = () => {
    setSelectedVideo(null);
    setVideoFile(null);
    setIsPlaying(false);
    toggleModal();
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoFile(null);
    setIsPlaying(false);
    document.getElementById("fileInput").value = "";
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const addVideoApi = async () => {
    try {
      setButtonLoading(true);
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);
        
        const formData = new FormData();
        formData.append("videoChunk", chunk);
        formData.append("chunkIndex", chunkIndex);
        formData.append("totalChunks", totalChunks);
        formData.append("uploadId", uploadId);
        formData.append("fileName", videoFile.name);

        const response = await fetch(
          `${import.meta.env.VITE_API}/chunk`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Chunk upload failed");
        }
        
        setUploadProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
      }

      const completeResponse = await fetch(
        `${import.meta.env.VITE_API}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: videoFile.name,
            uploadId: uploadId,
            videoText: videoText,
            userName: user.userName,
          }),
        }
      );

      if (completeResponse.ok) {
        setVideoText("");
        setSelectedVideo(null);
        setVideoFile(null);
        toggleModal();
        window.location.reload();
      }

    } catch (err) {
      console.error(err.message);
    } finally {
      setButtonLoading(false);
      setUploadProgress(0);
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
            <h2 className="modal-title">{t("Add a Video")}</h2>
            <button className="close-btn" onClick={handleCancel}>
              &times;
            </button>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("Add a caption")}</h3>
            <textarea
              value={videoText}
              onChange={(e) => setVideoText(e.target.value)}
              type="text"
              placeholder={t("Add a title for your video")}
              className="section-input"
              maxLength="100"
            ></textarea>
          </div>

          <div className="modal-section">
            <h3 className="section-title">{t("Upload Your Video")}</h3>
            <div className="upload-section" onClick={handleUploadClick}>
              <div className="upload-icon">🎬</div>
              <div className="upload-text">{t("Click to upload the video")}</div>
              <div className="upload-subtext">
                {t("MP4, MOV, or AVI less than 1 minute 30 seconds")}
              </div>
            </div>
            <input
              type="file"
              id="fileInput"
              accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
              style={{ display: "none" }}
              onChange={handleVideoUpload}
              multiple={false}
              disabled={!!selectedVideo}
            />

            <p className="required-message">
              {t("* Video is required for posting (Only 1 video)")}
            </p>
          </div>

          {selectedVideo && (
            <>
              <div className="video-preview-container">
                <div
                  className="video-preview-wrapper"
                  onClick={togglePlayPause}
                  style={{ background: "black" }}
                >
                  <video
                    controls
                    controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                    disablePictureInPicture
                    ref={videoRef}
                    src={selectedVideo}
                    className="video-preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      maxHeight: "400px",
                      objectFit: "cover",
                    }}
                    muted
                  />

                  <button onClick={removeVideo} className="remove-video-btn">
                    ×
                  </button>
                </div>
              </div>
            </>
          )}
          {uploadProgress > 0 && (
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={handleCancel}>
              {t("Cancel")}
            </button>
            <button
              onClick={addVideoApi}
              type="submit"
              className="btn btn-primary"
              disabled={buttonLoading || !selectedVideo}
            >
              {buttonLoading ? `${t("Uploading...")} ${uploadProgress}%` : t("Add")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}