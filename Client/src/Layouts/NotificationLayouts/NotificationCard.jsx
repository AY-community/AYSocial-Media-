import "./NotificationLayouts.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

import { X } from "phosphor-react";
import { getCloudinaryThumbnail } from "../../Utils/getThumbnailByVideoUrl";

export default function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  getNotificationIcon,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return t("just now");
    if (seconds < 3600) return `${Math.floor(seconds / 60)}${t("m ago")}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}${t("h ago")}`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}${t("d ago")}`;
    return new Date(date).toLocaleDateString();
  };

  const handleNotificationClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }

    if (
      notification.type === "post_comment" ||
      notification.type === "video_comment" ||
      notification.type === "comment_like" ||
      notification.type === "reply" ||
      notification.type === "reply_like"
    ) {
      const commentOrReplyId = notification.replyId || notification.commentId;

      if (notification.post) {
        navigate(
          `/user/${notification.recipient.userName}/post/${
            notification.post._id
          }${commentOrReplyId ? `?comment=${commentOrReplyId}` : ""}`
        );
      } else if (notification.video) {
        navigate(
          `/user/${notification.recipient.userName}/video/${
            notification.video._id
          }${commentOrReplyId ? `?comment=${commentOrReplyId}` : ""}`
        );
      }
    } else if (notification.post) {
      navigate(
        `/user/${notification.recipient.userName}/post/${notification.post._id}`
      );
    } else if (notification.video) {
      navigate(
        `/user/${notification.recipient.userName}/video/${notification.video._id}`
      );
    } else if (notification.type === "follow") {
      navigate(`/user/${notification.sender.userName}`);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification._id);
  };

  return (
    <div
      className={`notification-card ${!notification.read ? "unread" : ""}`}
      onClick={handleNotificationClick}
    >
      {!notification.read && <div className="unread-indicator"></div>}

      <div className="notification-avatar-container">
        <div className="notification-icon">
          {getNotificationIcon(notification.type)}
        </div>

        <img
          src={notification.sender.profilePic || defaultProfilePic}
          alt={notification.sender.userName}
          className="notification-avatar"
        />
      </div>

      <div className="notification-content">
        <p className="notification-message">
          <span className="notification-sender">
            {notification.sender.userName}
          </span>{" "}
          {notification.message}
        </p>
        <span className="notification-time">
          {getTimeAgo(notification.createdAt)}
        </span>
      </div>

      {(notification.post || notification.video) && (
        <div className="notification-preview">
          {notification.post ? (
            <img
              src={notification.post.images[0]}
              alt={t("Post preview")}
              className="preview-image"
            />
          ) : (
            <img
              src={getCloudinaryThumbnail(notification.video.videoUrl)}
              className="preview-video"
            />
          )}
        </div>
      )}

      <button className="notification-delete" onClick={handleDelete}>
        <X size={20} />
      </button>
    </div>
  );
}