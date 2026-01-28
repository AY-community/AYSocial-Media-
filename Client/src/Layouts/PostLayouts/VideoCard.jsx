import { useState, useRef } from "react";
import { Play } from "phosphor-react";
import { useTranslation } from "react-i18next";

const VideoCard = ({
  thumbnail,
  duration,
  onVideoClick,
  isOwner = false,
  onDelete,
  onEdit,
  onDisplayClick,
  Saved = false,
  toggleSaveFunction,
}) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(Saved);

  const menuRef = useRef(null);

  const handleSave = (e) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    if (toggleSaveFunction) toggleSaveFunction();
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleMenuAction = (action, e) => {
    e.stopPropagation();
    setShowMenu(false);

    switch (action) {
      case "edit":
        if (onEdit) onEdit();
        break;
      case "delete":
        if (onDelete) onDelete();
        break;
      case "save":
        handleSave(e);
        break;
      default:
        break;
    }
  };

  const handleVideoClick = () => {
    if (onVideoClick) onVideoClick();
  };
  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div
      className="video-reel-card"
      onClick={handleVideoClick}
      style={{
        position: "relative",
        width: "100%",
        height: "300px",
        overflow: "hidden",
        borderRadius: "10px",
        cursor: "pointer",
        marginTop: "16px",
      }}
    >
      <div
        className="post-menu"
        style={{ position: "absolute", top: "20px", right: "10px" }}
        ref={menuRef}
      >
        <button className="menu-toggle" onClick={handleMenuToggle}>
          <svg width="25" height="25" viewBox="0 0 25 25" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {showMenu && (
          <div className="menu-dropdown">
            {isOwner && (
              <>
                <button
                  className="menu-item"
                  onClick={(e) => handleMenuAction("edit", e)}
                >
                  <svg
                    className="menu-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                  {t("Edit")}
                </button>
                <button
                  className="menu-item delete"
                  onClick={(e) => handleMenuAction("delete", e)}
                >
                  <svg
                    className="menu-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                  {t("Delete")}
                </button>
              </>
            )}
            <button
              className="menu-item"
              onClick={(e) => handleMenuAction("save", e)}
            >
              <svg
                className="menu-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
              {isSaved ? t("Saved") : t("Save")}
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "5px",
          left: "10px",
          zIndex: "99",
        }}
      >
        <Play size={30} weight="fill" onClick={onDisplayClick} />
      </div>
      <img
        src={thumbnail}
        alt="Video thumbnail"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {duration && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {formatDuration(duration)}
        </div>
      )}

      <style jsx>{`
        .video-reel-card:hover .play-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default VideoCard;