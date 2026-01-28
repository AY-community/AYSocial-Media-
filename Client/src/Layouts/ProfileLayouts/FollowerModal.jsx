import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SpinnerGap } from "phosphor-react";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

export default function FollowerModal({
  display,
  toggleModal,
  id,
  isOwner,
  loggedInUserId,
}) {
  const { t } = useTranslation();
  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Suggested users state
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const navigate = useNavigate();
  const observerRef = useRef(null);

  const fetchFollowers = async (page = 1, reset = false) => {
    if (followersLoading) return;

    try {
      setFollowersLoading(true);

      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/get-followers/${id}?page=${page}&limit=10&loggedInUserId=${loggedInUserId}`
      );

      if (response.ok) {
        const data = await response.json();

        if (reset) {
          setFollowers(data.followers);
        } else {
          setFollowers((prev) => [...prev, ...data.followers]);
        }

        setHasMoreFollowers(data.pagination.hasMore);
        setCurrentPage(page);

        if (!isOwner && loggedInUserId) {
          const followingSet = new Set();
          data.followers.forEach((follower) => {
            if (follower.isFollowing) {
              followingSet.add(follower.follower._id);
            }
          });

          if (reset) {
            setFollowingUsers(followingSet);
          } else {
            setFollowingUsers((prev) => new Set([...prev, ...followingSet]));
          }
        }

        console.log("Followers loaded:", data.followers);
      } else {
        console.error("Failed to fetch followers");
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setTimeout(() => {
        setFollowersLoading(false);
        setIsInitialLoad(false);
      }, 300);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (suggestionsLoading) return;

    try {
      setSuggestionsLoading(true);

      const excludeIds = followers.map((f) => f.follower._id).join(",");

      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/suggested-users/${loggedInUserId}?excludeIds=${excludeIds}`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);
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

  const loadMoreFollowers = async () => {
    if (!hasMoreFollowers || followersLoading) return;
    await fetchFollowers(currentPage + 1, false);
  };

  const removeFollower = async (otherUserId) => {
    setFollowers((prev) =>
      prev.filter((user) => user.follower._id !== otherUserId)
    );
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/remove-follower/${otherUserId}/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error removing follower:", error);
    }
  };

  const followUser = async (userIdToFollow) => {
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
        setFollowingUsers((prev) => new Set([...prev, userIdToFollow]));

        setSuggestedUsers((prev) =>
          prev.filter((user) => user._id !== userIdToFollow)
        );
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const unfollowUser = async (userIdToUnfollow) => {
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

      if (response.ok) {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userIdToUnfollow);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  const handleActionButtonClick = (followerUserId) => {
    if (isOwner) {
      removeFollower(followerUserId);
    } else {
      if (followingUsers.has(followerUserId)) {
        unfollowUser(followerUserId);
      } else {
        followUser(followerUserId);
      }
    }
  };

  const getActionButtonText = (followerUserId) => {
    if (isOwner) return t("Remove");
    return followingUsers.has(followerUserId) ? t("Unfollow") : t("Follow");
  };

  const getActionButtonClass = (followerUserId) => {
    if (isOwner) return "btn btn-secondary";
    return followingUsers.has(followerUserId)
      ? "btn btn-secondary"
      : "btn btn-primary";
  };

  useEffect(() => {
    if (display && id) {
      setIsInitialLoad(true);
      setFollowers([]);
      setFollowingUsers(new Set());
      setSuggestedUsers([]);
      setCurrentPage(1);
      setHasMoreFollowers(true);
      fetchFollowers(1, true);
    }
  }, [display, id]);

  useEffect(() => {
    if (
      !hasMoreFollowers &&
      followers.length > 0 &&
      !suggestionsLoading &&
      suggestedUsers.length === 0
    ) {
      fetchSuggestedUsers();
    }
  }, [hasMoreFollowers, followers.length]);

  useEffect(() => {
    if (
      !isInitialLoad &&
      followers.length === 0 &&
      !suggestionsLoading &&
      suggestedUsers.length === 0
    ) {
      fetchSuggestedUsers();
    }
  }, [isInitialLoad, followers.length]);

  useEffect(() => {
    let observer = null;

    if (!isInitialLoad && !followersLoading && hasMoreFollowers) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadMoreFollowers();
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
  }, [isInitialLoad, followersLoading, hasMoreFollowers, display, currentPage]);

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
            <h2 className="modal-title">{t("Followers")}</h2>
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
            {/* Show loading spinner only during initial load */}
            {isInitialLoad && followers.length === 0 && (
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

            {/* Show empty state when no followers and not loading */}
            {!isInitialLoad && followers.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#666",
                }}
              >
                <p style={{ fontSize: "16px", marginBottom: "8px" }}>
                  {t("No followers yet")}
                </p>
                {isOwner ? (
                  <p style={{ fontSize: "14px", color: "#999" }}>
                    {t("When someone follows you, they'll appear here.")}
                  </p>
                ) : (
                  <p style={{ fontSize: "14px", color: "#999" }}>
                    {t("This user doesn't have any followers yet.")}
                  </p>
                )}
              </div>
            )}

            {/* Show followers list when available */}
            {followers.length > 0 && (
              <>
                {followers.map((follower, index) => {
                  const followerUserId = follower.follower._id;
                  const isCurrentUser = loggedInUserId === followerUserId;

                  return (
                    <div
                      key={followerUserId}
                      className="follower-item"
                      style={{ marginBottom: "15px" }}
                    >
                      <div className="post-avatar">
                        <img
                          onClick={() =>
                            navigate(`/user/${follower.follower.userName}`)
                          }
                          src={
                            follower.follower.profilePicture ||
                            defaultProfilePic
                          }
                          style={{ cursor: "pointer" }}
                          alt=""
                        />
                      </div>
                      <div className="post-user-info">
                        <h4
                          className="username"
                          onClick={() =>
                            navigate(`/user/${follower.follower.userName}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          {follower.follower.userName}
                        </h4>
                        <span className="post-time">
                          {follower.follower.name}
                        </span>
                      </div>

                      {!isCurrentUser && (
                        <button
                          className={getActionButtonClass(followerUserId)}
                          onClick={() =>
                            handleActionButtonClick(followerUserId)
                          }
                        >
                          {getActionButtonText(followerUserId)}
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Load more trigger */}
                {hasMoreFollowers && !followersLoading && (
                  <div
                    ref={observerRef}
                    className="comment-loading-trigger"
                    style={{ position: "relative" }}
                  >
                    <SpinnerGap className="loading-spinner" size={32} />
                  </div>
                )}

                {/* End of followers message */}
                {!hasMoreFollowers && followers.length > 0 && (
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

            {/* Suggested Users Section - MOVED OUTSIDE */}
            {((followers.length === 0 && !isInitialLoad) ||
              !hasMoreFollowers) &&
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
                          className="btn btn-primary"
                          onClick={() => followUser(user._id)}
                        >
                          {t("Follow")}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

            {((followers.length === 0 && !isInitialLoad) ||
              !hasMoreFollowers) &&
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

            {/* Show loading during pagination */}
            {followersLoading && followers.length > 0 && (
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