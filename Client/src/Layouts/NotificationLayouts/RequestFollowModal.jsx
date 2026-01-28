import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SpinnerGap } from "phosphor-react";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import "./NotificationLayouts.css";

export default function FollowRequestsModal({
  display,
  toggleModal,
  userId,
  onRequestHandled,
}) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [hasMoreRequests, setHasMoreRequests] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef(null);

  const navigate = useNavigate();

  const fetchFollowRequests = async (page = 1, reset = false) => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/follow-requests/${userId}?page=${page}&limit=10`
      );

      if (response.ok) {
        const data = await response.json();

        if (reset) {
          setRequests(data.requests || []);
        } else {
          setRequests((prev) => [...prev, ...(data.requests || [])]);
        }

        setHasMoreRequests(data.pagination?.hasMore || false);
        setCurrentPage(page);
      } else {
        console.error("Failed to fetch follow requests");
      }
    } catch (error) {
      console.error("Error fetching follow requests:", error);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setIsInitialLoad(false);
      }, 300);
    }
  };

  const loadMoreRequests = async () => {
    if (!hasMoreRequests || loading) return;
    await fetchFollowRequests(currentPage + 1, false);
  };

  const acceptRequest = async (requesterId) => {
    setProcessingRequests((prev) => new Set([...prev, requesterId]));

    setRequests((prev) =>
      prev.filter((req) => req.requester._id !== requesterId)
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/follow-requests/accept/${userId}/${requesterId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        if (onRequestHandled) {
          onRequestHandled();
        }
      } else {
        fetchFollowRequests(1, true);
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      fetchFollowRequests(1, true);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requesterId);
        return newSet;
      });
    }
  };

  const declineRequest = async (requesterId) => {
    setProcessingRequests((prev) => new Set([...prev, requesterId]));

    setRequests((prev) =>
      prev.filter((req) => req.requester._id !== requesterId)
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/follow-requests/decline/${userId}/${requesterId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        if (onRequestHandled) {
          onRequestHandled();
        }
      } else {
        fetchFollowRequests(1, true);
      }
    } catch (error) {
      console.error("Error declining request:", error);
      fetchFollowRequests(1, true);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requesterId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (display) {
      setIsInitialLoad(true);
      setRequests([]);
      setProcessingRequests(new Set());
      setCurrentPage(1);
      setHasMoreRequests(true);
      fetchFollowRequests(1, true);
    }
  }, [display]);

  useEffect(() => {
    let observer = null;

    if (!isInitialLoad && !loading && hasMoreRequests) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadMoreRequests();
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
  }, [isInitialLoad, loading, hasMoreRequests, display, currentPage]);

  return (
    <>
      <div
        className="modal-overlay"
        style={{ display: display ? "flex" : "none" }}
      >
        <div
          className="modal follow-requests-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="modal-title">{t("Follow Requests")}</h2>
            <button className="close-btn" onClick={toggleModal}>
              &times;
            </button>
          </div>

          <div className="modal-section follow-section">
            {isInitialLoad && requests.length === 0 && (
              <div className="loading-container">
                <SpinnerGap className="loading-spinner" size={32} />
              </div>
            )}

            {!isInitialLoad && requests.length === 0 && (
              <div className="empty-requests-container">
                <p className="empty-requests-title">{t("No follow requests")}</p>
                <p className="empty-requests-subtitle">
                  {t("When someone requests to follow you, they'll appear here.")}
                </p>
              </div>
            )}

            {requests.length > 0 && (
              <>
                {requests.map((request) => {
                  const requesterId = request.requester._id;
                  const isProcessing = processingRequests.has(requesterId);

                  return (
                    <div
                      key={requesterId}
                      className={`follower-item ${
                        isProcessing ? "processing" : ""
                      }`}
                    >
                      <div className="post-avatar">
                        <img
                          onClick={() =>
                            navigate(`/user/${request.requester.userName}`)
                          }
                          src={
                            request.requester.profilePic || defaultProfilePic
                          }
                          alt=""
                        />
                      </div>
                      <div className="post-user-info">
                        <h4
                          className="username"
                          onClick={() =>
                            navigate(`/user/${request.requester.userName}`)
                          }
                        >
                          {request.requester.userName}
                        </h4>
                        <span className="post-time">
                          {request.requester.name || ""}
                        </span>
                      </div>

                      <div className="request-actions">
                        <button
                          className="btn btn-primary request-btn"
                          onClick={() => acceptRequest(requesterId)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? "..." : t("Accept")}
                        </button>
                        <button
                          className="btn btn-secondary request-btn"
                          onClick={() => declineRequest(requesterId)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? "..." : t("Decline")}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {hasMoreRequests && !loading && (
                  <div ref={observerRef} className="comment-loading-trigger">
                    <SpinnerGap className="loading-spinner" size={32} />
                  </div>
                )}

                {!hasMoreRequests && requests.length > 0 && (
                  <div className="end-of-list">{t("You've reached the end!")}</div>
                )}
              </>
            )}

            {loading && requests.length > 0 && (
              <div className="loading-more-container">
                <SpinnerGap className="loading-spinner" size={24} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}