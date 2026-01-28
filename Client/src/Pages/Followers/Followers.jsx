import "./Followers.css";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import FollowerCard from "../../Layouts/ProfileLayouts/FollowerCard";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import { useAuth } from "../../Context/AuthContext";
import { MagnifyingGlass, SpinnerGap } from "phosphor-react";
import Footer from "../../Layouts/MainLayouts/Footer";
import SEO from "../../Utils/SEO";

export default function Followers() {
  const { t } = useTranslation();
  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [requestedUsers, setRequestedUsers] = useState(new Set());
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const observerRef = useRef(null);
  const { user } = useAuth();
  const loggedInUserId = user ? user._id : null;
  const id = loggedInUserId;

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
        setTotalFollowers(data.totalFollowers);

        setHasMoreFollowers(data.pagination.hasMore);
        setCurrentPage(page);

        if (loggedInUserId) {
          const followingSet = new Set();
          const requestedSet = new Set();

          data.followers.forEach((follower) => {
            if (follower.isFollowing) {
              followingSet.add(follower.follower._id);
            }
            if (follower.hasSentRequest) {
              requestedSet.add(follower.follower._id);
            }
          });

          if (reset) {
            setFollowingUsers(followingSet);
            setRequestedUsers(requestedSet);
          } else {
            setFollowingUsers((prev) => new Set([...prev, ...followingSet]));
            setRequestedUsers((prev) => new Set([...prev, ...requestedSet]));
          }
        }
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

  useEffect(() => {
    setIsInitialLoad(true);
    setFollowers([]);
    setFollowingUsers(new Set());
    setRequestedUsers(new Set());
    setCurrentPage(1);
    setHasMoreFollowers(true);
    fetchFollowers(1, true);
  }, []);

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

      if (!response.ok) {
        fetchFollowers(1, true);
      }
    } catch (error) {
      console.error("Error removing follower:", error);
      fetchFollowers(1, true);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!loggedInUserId) return;
    try {
      setSuggestedLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API}/suggested-users/${loggedInUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);
      } else {
        console.error("Failed to fetch suggested users");
      }
    } catch (err) {
      console.error("Error fetching suggested users:", err);
    } finally {
      setSuggestedLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, [loggedInUserId]);

  const handleActionButtonClick = (followerUserId) => {
    toggleFollow(followerUserId);
  };

  const getActionButtonClass = (followerUserId) => {
    const isFollowing = followingUsers.has(followerUserId);
    const hasRequested = requestedUsers.has(followerUserId);

    if (isFollowing) return "btn-secondary follower-button";
    if (hasRequested) return "btn-requested follower-button";
    return "btn-primary follower-button";
  };

  const getActionButtonText = (followerUserId, isSuggested = false) => {
    const isFollowing = followingUsers.has(followerUserId);
    const hasRequested = requestedUsers.has(followerUserId);

    if (isFollowing) return t("Following");
    if (hasRequested) return t("Requested");
    return isSuggested ? t("Follow") : t("Follow Back");
  };

  const filteredFollowers = followers.filter((follower) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      follower.follower.userName?.toLowerCase().includes(searchLower) ||
      follower.follower.name?.toLowerCase().includes(searchLower)
    );
  });

  const toggleFollow = async (otherUserId) => {
    const isCurrentlyFollowing = followingUsers.has(otherUserId);
    const hasCurrentlyRequested = requestedUsers.has(otherUserId);

    // Optimistic UI update
    if (isCurrentlyFollowing) {
      // Unfollow
      setFollowingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(otherUserId);
        return newSet;
      });
    } else if (hasCurrentlyRequested) {
      // Cancel request
      setRequestedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(otherUserId);
        return newSet;
      });
    }

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/toggle-follow-status/${otherUserId}/${loggedInUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otherUserId }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Update states based on response
        if (data.isFollowing) {
          setFollowingUsers((prev) => new Set([...prev, otherUserId]));
          setRequestedUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(otherUserId);
            return newSet;
          });
          removeSuggestedUser(otherUserId);
        } else if (data.requestStatus === "pending") {
          setRequestedUsers((prev) => new Set([...prev, otherUserId]));
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(otherUserId);
            return newSet;
          });
        } else {
          // Neither following nor requested (cancelled or unfollowed)
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(otherUserId);
            return newSet;
          });
          setRequestedUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(otherUserId);
            return newSet;
          });
        }
      } else {
        // Revert optimistic update on error
        if (isCurrentlyFollowing) {
          setFollowingUsers((prev) => new Set([...prev, otherUserId]));
        }
        if (hasCurrentlyRequested) {
          setRequestedUsers((prev) => new Set([...prev, otherUserId]));
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert optimistic update on error
      if (isCurrentlyFollowing) {
        setFollowingUsers((prev) => new Set([...prev, otherUserId]));
      }
      if (hasCurrentlyRequested) {
        setRequestedUsers((prev) => new Set([...prev, otherUserId]));
      }
    }
  };

  const removeSuggestedUser = (userIdToRemove) => {
    setSuggestedUsers((prevUsers) =>
      prevUsers.filter((user) => user._id !== userIdToRemove)
    );

    if (suggestedUsers.length <= 3) {
      fetchSuggestedUsers();
    }
  };

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
  }, [isInitialLoad, followersLoading, hasMoreFollowers, currentPage]);

  return (
    <>
      <SEO   
  title="Your Followers"
  description="View and manage the list of users who follow you. Search, follow back, or remove followers easily."  
  url={`${window.location.origin}/followers`}
/>  
      <Header />
      <MainSideBar />
      <BottomNav />

      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="followers-header">
            <h1>{t("Followers")} ({totalFollowers})</h1>
            <div className="followers-input-div">
              <MagnifyingGlass size={21} className="followers-search-icon" />
              <input
                type="text"
                placeholder={t("Search for a follower")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="follower-list content-section">
            {filteredFollowers.length > 0 ? (
              <>
                {filteredFollowers.map((follower) => {
                  const followerUserId = follower.follower._id;
                  const isCurrentUser = loggedInUserId === followerUserId;

                  return (
                    <FollowerCard
                      key={followerUserId}
                      username={follower.follower.userName}
                      name={follower.follower.name}
                      picture={
                        follower.follower.profilePic || defaultProfilePic
                      }
                      userId={followerUserId}
                      isCurrentUser={isCurrentUser}
                      isOwner={true}
                      isFollowing={followingUsers.has(followerUserId)}
                      hasRequested={requestedUsers.has(followerUserId)}
                      onRemove={() => removeFollower(followerUserId)}
                      onToggleFollow={() =>
                        handleActionButtonClick(followerUserId)
                      }
                      getActionButtonClass={() =>
                        getActionButtonClass(followerUserId)
                      }
                      getActionButtonText={() =>
                        getActionButtonText(followerUserId)
                      }
                    />
                  );
                })}

                {/* Always render trigger when more followers exist to prevent scrollbar jump */}
                {hasMoreFollowers && (
                  <div
                    ref={observerRef}
                    className="comment-loading-trigger"
                  >
                    {followersLoading && (
                      <SpinnerGap className="loading-spinner" size={32} />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: "200px",
                }}
              >
                {isInitialLoad ? (
                  <SpinnerGap
                    className="loading-spinner loading-spinner-initial"
                    size={50}
                  />
                ) : (
                  <div className="empty-follower-section">
                    <p className="no-followers-text">
                      {searchQuery
                        ? t("No followers found")
                        : t("You have no followers yet.")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Suggested Users Section - Now outside the conditional */}
            {!isInitialLoad && !searchQuery && (
              <>
                <h1 className="suggested-users-header">{t("Suggested for you")}</h1>

                <div className="suggested-users-section">
                  {suggestedLoading ? (
                    <SpinnerGap className="loading-spinner" size={32} />
                  ) : suggestedUsers.length > 0 ? (
                    suggestedUsers.map((user) => (
                      <FollowerCard
                        key={user._id}
                        username={user.userName}
                        name={user.name || ""}
                        picture={user.profilePic || defaultProfilePic}
                        userId={user._id}
                        isCurrentUser={loggedInUserId === user._id}
                        isFollowing={followingUsers.has(user._id)}
                        hasRequested={requestedUsers.has(user._id)}
                        onToggleFollow={() => handleActionButtonClick(user._id)}
                        getActionButtonClass={() =>
                          getActionButtonClass(user._id)
                        }
                        getActionButtonText={() =>
                          getActionButtonText(user._id, true)
                        }
                        onRemove={() => {
                          removeSuggestedUser(user._id);
                        }}
                      />
                    ))
                  ) : (
                    <p>{t("No suggestions right now.")}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <Footer />
        </div>
      </div>
    </>
  );
}