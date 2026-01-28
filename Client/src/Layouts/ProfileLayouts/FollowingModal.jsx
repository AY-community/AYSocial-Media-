import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SpinnerGap } from "phosphor-react";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

export default function FollowingModal({
  display,
  toggleModal,
  id,
  isOwner,
  loggedInUserId,
}) {
  const { t } = useTranslation();
  const [following, setFollowing] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [requestedUsers, setRequestedUsers] = useState(new Set()); // NEW: Track pending requests
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Suggested users state
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const navigate = useNavigate();
  const observerRef = useRef(null);

  const fetchFollowing = async (page = 1, reset = false) => {
    if (followingLoading) return;

    try {
      setFollowingLoading(true);

      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/get-following/${id}?page=${page}&limit=10&loggedInUserId=${loggedInUserId}`
      );

      if (response.ok) {
        const data = await response.json();

        if (reset) {
          setFollowing(data.following);
        } else {
          setFollowing((prev) => [...prev, ...data.following]);
        }

        setHasMoreFollowing(data.pagination.hasMore);
        setCurrentPage(page);

        if (!isOwner && loggedInUserId) {
          const followingSet = new Set();
          const requestedSet = new Set(); // NEW

          data.following.forEach((follow) => {
            if (follow.isFollowing) {
              followingSet.add(follow.following._id);
            }
            // NEW: Check if user has sent a request
            if (follow.hasSentRequest) {
              requestedSet.add(follow.following._id);
            }
          });

          if (reset) {
            setFollowingUsers(followingSet);
            setRequestedUsers(requestedSet); // NEW
          } else {
            setFollowingUsers((prev) => new Set([...prev, ...followingSet]));
            setRequestedUsers((prev) => new Set([...prev, ...requestedSet])); // NEW
          }
        }

        console.log("Following loaded:", data.following);
      } else {
        console.error("Failed to fetch following");
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setTimeout(() => {
        setFollowingLoading(false);
        setIsInitialLoad(false);
      }, 300);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (suggestionsLoading) return;

    try {
      setSuggestionsLoading(true);

      // Get all current following IDs to exclude them
      const excludeIds = following.map((f) => f.following._id).join(",");

      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/suggested-users/${loggedInUserId}?excludeIds=${excludeIds}`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);

        // NEW: Initialize requested state for suggested users
        const requestedSet = new Set(requestedUsers);
        data.forEach((user) => {
          if (user.hasSentRequest) {
            requestedSet.add(user._id);
          }
        });
        setRequestedUsers(requestedSet);

        console.log("Suggested users loaded:", data);
      } else {
        console.error("Failed to fetch suggested users");
      }
    } catch (error) {
      console.error("Error fetching suggested users:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const loadMoreFollowing = async () => {
    if (!hasMoreFollowing || followingLoading) return;
    await fetchFollowing(currentPage + 1, false);
  };

  // Unfollow a user from the Following list
  const unfollowUser = async (userIdToUnfollow) => {
    // Optimistically remove from UI
    setFollowing((prev) =>
      prev.filter((user) => user.following._id !== userIdToUnfollow)
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/toggle-follow-status/${userIdToUnfollow}/${loggedInUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        // Revert on error
        fetchFollowing(1, true);
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      // Revert on error
      fetchFollowing(1, true);
    }
  };

  // Toggle follow for SUGGESTED users (handles Follow/Requested/Following states)
  const toggleFollowUser = async (userIdToFollow) => {
    const isCurrentlyFollowing = followingUsers.has(userIdToFollow);
    const hasCurrentlyRequested = requestedUsers.has(userIdToFollow);

    // Optimistic UI update
    if (isCurrentlyFollowing) {
      setFollowingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userIdToFollow);
        return newSet;
      });
    } else if (hasCurrentlyRequested) {
      setRequestedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userIdToFollow);
        return newSet;
      });
    }

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/toggle-follow-status/${userIdToFollow}/${loggedInUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.isFollowing) {
          setFollowingUsers((prev) => new Set([...prev, userIdToFollow]));
          setRequestedUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userIdToFollow);
            return newSet;
          });
          setSuggestedUsers((prev) =>
            prev.filter((user) => user._id !== userIdToFollow)
          );
        } else if (data.requestStatus === "pending") {
          setRequestedUsers((prev) => new Set([...prev, userIdToFollow]));
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userIdToFollow);
            return newSet;
          });
        } else {
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userIdToFollow);
            return newSet;
          });
          setRequestedUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userIdToFollow);
            return newSet;
          });
        }
      } else {
        if (isCurrentlyFollowing) {
          setFollowingUsers((prev) => new Set([...prev, userIdToFollow]));
        }
        if (hasCurrentlyRequested) {
          setRequestedUsers((prev) => new Set([...prev, userIdToFollow]));
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      if (isCurrentlyFollowing) {
        setFollowingUsers((prev) => new Set([...prev, userIdToFollow]));
      }
      if (hasCurrentlyRequested) {
        setRequestedUsers((prev) => new Set([...prev, userIdToFollow]));
      }
    }
  };

  const handleActionButtonClick = (followingUserId) => {
    unfollowUser(followingUserId); // Always unfollow in Following list
  };

  // Button logic for Following list (already following everyone here)
  const getActionButtonText = (followingUserId) => {
    return t("Following"); // Always "Following" since this is the Following list
  };

  const getActionButtonClass = (followingUserId) => {
    return "btn btn-secondary"; // Always secondary style
  };

  // Button logic for SUGGESTED users (not following them yet)
  const getSuggestedButtonText = (userId) => {
    const isFollowing = followingUsers.has(userId);
    const hasRequested = requestedUsers.has(userId);

    if (isFollowing) return t("Following");
    if (hasRequested) return t("Requested");
    return t("Follow");
  };

  const getSuggestedButtonClass = (userId) => {
    const isFollowing = followingUsers.has(userId);
    const hasRequested = requestedUsers.has(userId);

    if (isFollowing) return "btn btn-secondary";
    if (hasRequested) return "btn btn-requested";
    return "btn btn-primary";
  };

  useEffect(() => {
    if (display && id) {
      setIsInitialLoad(true);
      setFollowing([]);
      setFollowingUsers(new Set());
      setRequestedUsers(new Set()); // NEW
      setSuggestedUsers([]);
      setCurrentPage(1);
      setHasMoreFollowing(true);
      fetchFollowing(1, true);
    }
  }, [display, id]);

  useEffect(() => {
    if (
      !hasMoreFollowing &&
      following.length > 0 &&
      !suggestionsLoading &&
      suggestedUsers.length === 0
    ) {
      fetchSuggestedUsers();
    }
  }, [hasMoreFollowing, following.length]);

  useEffect(() => {
    if (
      !isInitialLoad &&
      following.length === 0 &&
      !suggestionsLoading &&
      suggestedUsers.length === 0
    ) {
      fetchSuggestedUsers();
    }
  }, [isInitialLoad, following.length]);

  useEffect(() => {
    let observer = null;

    if (!isInitialLoad && !followingLoading && hasMoreFollowing) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadMoreFollowing();
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
  }, [isInitialLoad, followingLoading, hasMoreFollowing, display, currentPage]);

  return (
    <>
      <div
        className="modal-overlay"
        style={{ display: display ? "flex" : "none" }}
      >
        <div
          className="modal"
          style={{ overflow: "hidden", height: "500px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ borderBottom: "none" }}>
            <h2 className="modal-title">{t("Following")}</h2>
            <button className="close-btn" onClick={toggleModal}>
              &times;
            </button>
          </div>

          <div
            className="modal-section follow-section"
            style={{
              maxHeight: "400px",
              overflowY: "scroll",
              paddingRight: "10px",
              paddingBottom: "10px",
              display: "block",
            }}
          >
            {isInitialLoad && following.length === 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100px",
                }}
              >
                <SpinnerGap className="loading-spinner" size={32} />
              </div>
            )}

            {!isInitialLoad && following.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#666",
                }}
              >
                <p style={{ fontSize: "16px", marginBottom: "8px" }}>
                  {isOwner
                    ? t("You're not following anyone yet")
                    : t("Not following anyone yet")}
                </p>
                {isOwner && (
                  <p style={{ fontSize: "14px", color: "#999" }}>
                    {t("When you follow someone, they'll appear here.")}
                  </p>
                )}
              </div>
            )}

            {following.length > 0 && (
              <>
                {following.map((follow) => {
                  const followingUserId = follow.following._id;
                  const isCurrentUser = loggedInUserId === followingUserId;

                  return (
                    <div
                      key={followingUserId}
                      className="follower-item"
                      style={{ marginBottom: "15px" }}
                    >
                      <div className="post-avatar">
                        <img
                          onClick={() =>
                            navigate(`/user/${follow.following.userName}`)
                          }
                          src={follow.following.profilePic || defaultProfilePic}
                          style={{ cursor: "pointer" }}
                          alt=""
                        />
                      </div>
                      <div className="post-user-info">
                        <h4
                          className="username"
                          onClick={() =>
                            navigate(`/user/${follow.following.userName}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          {follow.following.userName}
                        </h4>
                        <span className="post-time">
                          {follow.following.name}
                        </span>
                      </div>

                      {!isCurrentUser && (
                        <button
                          className={getActionButtonClass(followingUserId)}
                          onClick={() =>
                            handleActionButtonClick(followingUserId)
                          }
                        >
                          {getActionButtonText(followingUserId)}
                        </button>
                      )}
                    </div>
                  );
                })}

                {hasMoreFollowing && !followingLoading && (
                  <div
                    ref={observerRef}
                    className="comment-loading-trigger"
                    style={{ position: "relative" }}
                  >
                    <SpinnerGap className="loading-spinner" size={32} />
                  </div>
                )}

                {!hasMoreFollowing && following.length > 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    {t("You've reached the end!")}
                  </div>
                )}
              </>
            )}

            {((following.length === 0 && !isInitialLoad) ||
              !hasMoreFollowing) &&
              suggestedUsers.length > 0 && (
                <>
                  <div className="suggestions-section-profile-modal">
                    <h1 className="suggestions-title-profile-modal">
                      {t("Suggested for you")}
                    </h1>

                    {suggestedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="follower-item"
                        style={{ marginBottom: "15px" }}
                      >
                        <div className="post-avatar">
                          <img
                            onClick={() => navigate(`/user/${user.userName}`)}
                            src={user.profilePic || defaultProfilePic}
                            style={{ cursor: "pointer" }}
                            alt=""
                          />
                        </div>
                        <div className="post-user-info">
                          <h4
                            className="username"
                            onClick={() => navigate(`/user/${user.userName}`)}
                            style={{ cursor: "pointer" }}
                          >
                            {user.userName}
                          </h4>
                          <span className="post-time">{user.name}</span>
                        </div>

                        <button
                          className={getSuggestedButtonClass(user._id)}
                          onClick={() => toggleFollowUser(user._id)}
                        >
                          {getSuggestedButtonText(user._id)}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

            {((following.length === 0 && !isInitialLoad) ||
              !hasMoreFollowing) &&
              suggestionsLoading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  <SpinnerGap className="loading-spinner" size={32} />
                </div>
              )}

            {followingLoading && following.length > 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                <SpinnerGap className="loading-spinner" size={24} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}