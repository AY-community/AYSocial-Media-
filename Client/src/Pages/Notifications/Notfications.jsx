import "./Notifications.css";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import Footer from "../../Layouts/MainLayouts/Footer";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import NotificationCard from "../../Layouts/NotificationLayouts/NotificationCard";
import FollowRequestsModal from "../../Layouts/NotificationLayouts/RequestFollowModal";
import Heart from "../../assets/Icons/Heart.png";
import Person from "../../assets/Icons/Person.png";
import Camera from "../../assets/Icons/Camera.png";
import Video from "../../assets/Icons/Video.png";
import Bell from "../../assets/Icons/Bell.png";
import Comment from "../../assets/Icons/Comment.png";
import { SpinnerGap, UserPlus } from "phosphor-react";
import SEO from "../../Utils/SEO";

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [followRequestsCount, setFollowRequestsCount] = useState(0);
  const [showFollowRequestsModal, setShowFollowRequestsModal] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const observerRef = useRef(null);
  const { user } = useAuth();
  const loggedInUserId = user ? user._id : null;

  const fetchNotifications = async (page = 1, reset = false) => {
    if (notificationsLoading) return;

    try {
      setNotificationsLoading(true);

      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/get-notifications/${loggedInUserId}?page=${page}&limit=10`
      );

      if (response.ok) {
        const data = await response.json();

        if (reset) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }
        setTotalNotifications(data.totalNotifications);
        setFollowRequestsCount(data.followRequestsCount || 0);
        setHasMoreNotifications(data.pagination.hasMore);
        setCurrentPage(page);
      } else {
        console.error("Failed to fetch notifications", response.status);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setTimeout(() => {
        setNotificationsLoading(false);
        setIsInitialLoad(false);
      }, 300);
    }
  };

  console.log("Notifications:", notifications);

  const deleteNotification = async (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification._id !== notificationId)
    );
    setTotalNotifications((prev) => prev - 1);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/delete-notification/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        fetchNotifications(1, true);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      fetchNotifications(1, true);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/mark-all-as-read/${loggedInUserId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
      } else {
        console.error("Failed to mark all as read", response.status);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  useEffect(() => {
    setIsInitialLoad(true);
    setNotifications([]);
    setCurrentPage(1);
    setHasMoreNotifications(true);
    fetchNotifications(1, true);
  }, []);

  const loadMoreNotifications = async () => {
    if (!hasMoreNotifications || notificationsLoading) return;
    await fetchNotifications(currentPage + 1, false);
  };

  useEffect(() => {
    let observer = null;

    if (!isInitialLoad && !notificationsLoading && hasMoreNotifications) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadMoreNotifications();
          }
        },
        {
          root: null,
          rootMargin: "100px",
          threshold: 0.1,
        }
      );

      if (observerRef.current) {
        observer.observe(observerRef.current);
      }
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [isInitialLoad, notificationsLoading, hasMoreNotifications, currentPage]);

  const getNotificationIcon = (type) => {
    const emojiMap = {
      post_like: Heart,
      video_like: Heart,
      post_comment: Comment,
      video_comment: Comment,
      comment_like: Heart,
      reply: Comment,
      reply_like: Heart,
      follow: Person,
      follow_back: Person,
      new_post: Camera,
      new_video: Video,
      default: Bell,
    };

    return (
      <img
        src={emojiMap[type] || emojiMap.default}
        alt=""
        style={{ width: "28px", height: "28px" }}
      />
    );
  };

  return (
    <>
      <SEO
        title={"Notifications"}
        description={"View your latest notifications and stay updated."}
        noIndex ={true}
      />
      <Header />
      <MainSideBar />
      <BottomNav />

      <FollowRequestsModal
        display={showFollowRequestsModal}
        toggleModal={() => setShowFollowRequestsModal(false)}
        userId={loggedInUserId}
        onRequestHandled={() => {
          fetchNotifications(1, true);
        }}
      />

      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="notifications-header">
            <h1>
              {t("Notifications")} <span>{`(${totalNotifications})`}</span>
            </h1>
            <p
              onClick={() => {
                markAllAsRead();
              }}
            >
              {t("Mark all as read")}
            </p>
          </div>

          {followRequestsCount > 0 && (
            <div
              className="follow-requests-banner"
              onClick={() => setShowFollowRequestsModal(true)}
            >
              <div className="follow-requests-content">
                <UserPlus size={24} weight="bold" />
                <div className="follow-requests-text">
                  <h3>{t("Follow Requests")}</h3>
                  <p>
                    {followRequestsCount}{" "}
                    {followRequestsCount === 1 ? t("person wants") : t("people want")}{" "}
                    {t("to follow you")}
                  </p>
                </div>
              </div>
              <span className="follow-requests-arrow">›</span>
            </div>
          )}

          <div className="notifications-list content-section">
            {notifications.length > 0 ? (
              <>
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={(id) => markAllAsRead(id)}
                    onDelete={(id) => deleteNotification(id)}
                    getNotificationIcon={getNotificationIcon}
                  />
                ))}

                {/* Always render the trigger to maintain consistent height */}
                {hasMoreNotifications && (
                  <div
                    ref={observerRef}
                    className="notification-loading-trigger"
                  >
                    {notificationsLoading && (
                      <SpinnerGap className="loading-spinner" size={32} />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-notification-container">
                {isInitialLoad ? (
                  <SpinnerGap
                    className="loading-spinner loading-spinner-initial"
                    size={50}
                  />
                ) : (
                  <div className="empty-notification-section">
                    <p className="no-notifications-text">
                      {t("You have no notifications.")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
}