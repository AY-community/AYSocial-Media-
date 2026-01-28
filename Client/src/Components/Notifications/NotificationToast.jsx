import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import "./NotificationToast.css";

export const showNotificationToast = (notification, navigate) => {
  toast.custom(
    (t) => (
      <div
        className="notification-toast"
        onClick={() => handleNotificationClick(notification, t, navigate)}
      >
        <img
          src={notification.sender?.profilePic || defaultProfilePic}
          alt={notification.sender?.userName || "User"}
          className="notification-toast-avatar"
        />
        <div className="notification-toast-content">
          <div className="notification-toast-username">
            {notification.sender?.userName || "Someone"}
          </div>
          <div className="notification-toast-message">
            {notification.message}
          </div>
        </div>
        <button
          className="notification-toast-close"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t);
          }}
        >
          ×
        </button>
      </div>
    ),
    {
      duration: 5000,
    }
  );
};

const handleNotificationClick = (notification, toastId, navigate) => {
  toast.dismiss(toastId);

  if (notification.post) {
    navigate(
      `/user/${notification.sender?.userName}/post/${notification.post}`
    );
  } else if (notification.video) {
    navigate(
      `/user/${notification.sender?.userName}/video/${notification.video}`
    );
  }
};
