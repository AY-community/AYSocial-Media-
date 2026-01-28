import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import formatTime from "../../Utils/FormatTime";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

const PostCard = ({
  user,
  avatar,
  timestamp,
  content,
  image,
  initialLikes = 0,
  initialComments = 0,
  onPostClick,
  onCommentClick,
  onShareClick,
  onEdit,
  onDelete,
  isOwner = false,
  Liked = false,
  Saved = false,
  toggleLikeFunction,
  toggleSaveFunction,
}) => {
  const { t } = useTranslation();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(Liked);
  const [isSaved, setIsSaved] = useState(Saved);
  const [showMenu, setShowMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();

  const menuRef = useRef(null);

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    if (toggleSaveFunction) toggleSaveFunction();
  };

  const handleComment = (e) => {
    e.stopPropagation();
    if (onCommentClick) onCommentClick();
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (onShareClick) onShareClick();
  };

  const handlePostClick = () => {
    if (onPostClick) onPostClick();
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="post-card" onClick={handlePostClick}>
      <div className="post-header">

          <div className="post-avatar">
            <img
                        onClick={() => {
              navigate(`/user/${user}`);
            }}

              src={avatar && avatar.trim() !== "" ? avatar : defaultProfilePic}
              alt={user}
            />
          </div>
          <div className="post-user-info">
            <h4 className="username">{user}</h4>
            <span className="post-time">{formatTime(timestamp)}</span>
          </div>
        <div className="post-menu" ref={menuRef}>
          <button className="menu-toggle" onClick={handleMenuToggle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
      </div>

      {content ? (
        <div className="post-content">{content}</div>
      ) : (
        <div className="post-content" style={{ height: "20px" }}></div>
      )}

      {Array.isArray(image) && image.length > 0 && (
        <div
          className="post-image"
          style={{
            position: "relative",
            width: "100%",
            height: "160px",
            overflow: "hidden",
            borderRadius: "10px",
            backgroundColor: imageLoaded ? "transparent" : "#f0f0f0",
          }}
        >
          {!imageLoaded && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#ccc",
                fontSize: "14px",
              }}
            >
              {t("Loading...")}
            </div>
          )}
          <img
            src={image[0]}
            alt="Post content"
            style={{
              width: "100%",
              height: "160px",
              objectFit: "cover",
              filter: image.length > 1 ? "blur(2px)" : "none",
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />

          {image.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#ffffffff",
                fontSize: "22px",
                fontWeight: "bold",
                padding: "8px 18px",
                borderRadius: "10px",
              }}
            >
              +{image.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="post-actions">
        <button
          className={`action-btn ${isLiked ? "liked" : ""}`}
          onClick={(e) => {
            handleLike(e);
            if (toggleLikeFunction) toggleLikeFunction();
          }}
        >
          <svg
            className="action-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isLiked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="action-text">{likes}</span>
        </button>

        <button className="action-btn" onClick={handleComment}>
          <svg
            className="action-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="action-text">{initialComments}</span>
        </button>

        <button className="action-btn" onClick={handleShare}>
          <svg
            className="action-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16,6 12,2 8,6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span className="action-text">{t("Share")}</span>
        </button>
      </div>
    </div>
  );
};

export default PostCard;