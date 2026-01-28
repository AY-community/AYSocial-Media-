import { toast } from "sonner";
import { X } from "phosphor-react";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import "./MessageSentNotification.css";

export const showMessageSentNotification = (conversationData, navigate) => {
  const isMobile = window.innerWidth < 768;
  
  toast.custom(
    (t) => (
      <div
        className="message-sent-notification"
        onClick={() => handleMessageNotificationClick(conversationData, t, navigate)}
      >
        <img
          src={conversationData.profilePic || defaultProfilePic}
          alt={conversationData.recipientName}
          className="message-notification-avatar"
        />
        
        <div className="message-notification-content">
          <div className="message-notification-label">
            Message from
          </div>
          <div className="message-notification-username">
            {conversationData.recipientName}
          </div>
        </div>

        <button
          className="message-notification-close"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t);
          }}
        >
          <X size={20} weight="bold" />
        </button>
      </div>
    ),
    {
      duration: 4000,
      position: isMobile ? 'top-center' : 'bottom-right'
    }
  );
};

const handleMessageNotificationClick = (conversationData, toastId, navigate) => {
  toast.dismiss(toastId);
  navigate(`/chat?userId=${conversationData.userId}`);
};
