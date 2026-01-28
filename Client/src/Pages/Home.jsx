import "./Home.css";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import Header from "../Layouts/MainLayouts/Header";
import MainSideBar from "../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../Layouts/MainLayouts/BottomNav";
import ExploreCard from "../Layouts/ExploreLayouts/ExploreCard";
import { shareUrl } from "../Utils/shareUrl";
import { useTranslation } from "react-i18next";
import {
  CaretLeft,
  CaretRight,
  Users,
} from "phosphor-react";
import defaultProfilePic from "../assets/Profile/defaultProfilePic.jpg";

import DisplayModal from "../Layouts/PostLayouts/DisplayPostModal";
import DisplayVideoModal from "../Layouts/VideoLayouts/DisplayVideoModal";
import formatTime from "../Utils/FormatTime.jsx";
import SEO from "../Utils/SEO.jsx";

const API_URL = import.meta.env.VITE_API;

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loadingUser } = useAuth();
  const sliderRef = useRef(null);
  const [activeTab, setActiveTab] = useState("for-you");
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const videoRefs = useRef({});
  const [isMuted, setIsMuted] = useState(true);

  const [animatingLikeId, setAnimatingLikeId] = useState(null);
  const lastTap = useRef(0);

  const [isDisplayPostModalOpen, setIsDisplayPostModalOpen] = useState(false);
  const [isDisplayVideoModalOpen, setIsDisplayVideoModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const handleDoubleClickLike = (postId, postType) => {
    const post = feed.find((p) => p._id === postId);
    if (post && !post.userLiked) {
      handleLike(postId, postType);
    }

    setAnimatingLikeId(postId);
    setTimeout(() => {
      setAnimatingLikeId(null);
    }, 1000);
  };

  const handleTouchTap = (postId, postType) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      handleDoubleClickLike(postId, postType);
    }
    lastTap.current = now;
  };

  const openDisplayPostModal = (post) => {
    const formattedData = {
      post: {
        _id: post._id,
        description: post.description,
        images: post.images || [],
        createdAt: post.createdAt,
        likesCount: post.likesCount,
        isLiked: post.userLiked,
        isSaved: post.userSaved,
        user: post.user
      }
    };
    
    setSelectedPost(formattedData);
    setIsDisplayPostModalOpen(true);
  };

  const closeDisplayPostModal = (likeData, saveData) => {
    if (likeData || saveData) {
      setFeed((prevFeed) =>
        prevFeed.map((post) => {
          if (likeData && post._id === likeData.postId) {
            return {
              ...post,
              userLiked: likeData.isLiked,
              likesCount: likeData.likesCount,
            };
          }
          if (saveData && post._id === saveData.postId) {
            return {
              ...post,
              userSaved: saveData.isSaved,
            };
          }
          return post;
        })
      );
    }
    
    setSelectedPost(null);
    setIsDisplayPostModalOpen(false);
  };

  const openDisplayVideoModal = (video) => {
    const formattedData = {
      video: {
        _id: video._id,
        description: video.description,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt,
        likesCount: video.likesCount,
        isLiked: video.userLiked,
        isSaved: video.userSaved,
        user: video.user
      }
    };
    
    setSelectedPost(formattedData);
    setIsDisplayVideoModalOpen(true);
  };

  const closeDisplayVideoModal = (likeData, saveData) => {
    if (likeData || saveData) {
      setFeed((prevFeed) =>
        prevFeed.map((post) => {
          if (likeData && post._id === likeData.videoId) {
            return {
              ...post,
              userLiked: likeData.isLiked,
              likesCount: likeData.likesCount,
            };
          }
          if (saveData && post._id === saveData.videoId) {
            return {
              ...post,
              userSaved: saveData.isSaved,
            };
          }
          return post;
        })
      );
    }
    
    setSelectedPost(null);
    setIsDisplayVideoModalOpen(false);
  };

  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [requestedUsers, setRequestedUsers] = useState(new Set());

  useEffect(() => {
    if (user?._id) {
      fetchSuggestedUsers();
    }
  }, [user?._id]);

  const fetchSuggestedUsers = async () => {
    if (suggestionsLoading || !user?._id) return;

    try {
      setSuggestionsLoading(true);

      const excludeIds = Array.from(followingUsers).join(",");

      const response = await fetch(
        `${API_URL}/suggested-users/${user._id}?excludeIds=${excludeIds}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);

        const requestedSet = new Set(requestedUsers);
        data.forEach((user) => {
          if (user.hasSentRequest) {
            requestedSet.add(user._id);
          }
        });
        setRequestedUsers(requestedSet);
      }
    } catch (error) {
      console.error("Error fetching suggested users:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleFollowToggle = async (userId) => {
    if (!user?._id) return;

    try {
      const isFollowing = followingUsers.has(userId);
      const isRequested = requestedUsers.has(userId);

      if (isFollowing) {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else if (isRequested) {
        setRequestedUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }

      const response = await fetch(
        `${API_URL}/toggle-follow-status/${userId}/${user._id}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.isFollowing) {
          setFollowingUsers((prev) => new Set([...prev, userId]));
          setRequestedUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else if (data.requestStatus === "pending") {
          setRequestedUsers((prev) => new Set([...prev, userId]));
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else {
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          setRequestedUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      } else {
        if (isFollowing) {
          setFollowingUsers((prev) => new Set([...prev, userId]));
        }
        if (isRequested) {
          setRequestedUsers((prev) => new Set([...prev, userId]));
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const getFollowButtonText = (userId) => {
    if (followingUsers.has(userId)) return t("Following_btn");
    if (requestedUsers.has(userId)) return t("Requested");
    return t("Follow");
  };

  useEffect(() => {
    loadFeed();
  }, [activeTab, page]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "";
      switch (activeTab) {
        case "for-you":
          endpoint = `${API_URL}/feed/for-you?page=${page}&limit=20`;
          break;
        case "following":
          endpoint = `${API_URL}/feed/following?page=${page}&limit=20`;
          break;
        case "popular":
          endpoint = `${API_URL}/feed/popular?page=${page}&limit=20&timeframe=week`;
          break;
        default:
          endpoint = `${API_URL}/feed/for-you?page=${page}&limit=20`;
      }

      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setFeed(data.feed);
        } else {
          setFeed((prev) => {
            const existingIds = new Set(prev.map((post) => post._id));
            const newPosts = data.feed.filter(
              (post) => !existingIds.has(post._id)
            );
            return [...prev, ...newPosts];
          });
        }
        
        setFollowingUsers(prev => {
            const newFollowing = new Set(prev);
            data.feed.forEach(post => {
                if (post.isFollowing) {
                    newFollowing.add(post.user._id);
                } else {
                    newFollowing.delete(post.user._id);
                }
            });
            return newFollowing;
        });

        setHasMore(data.pagination.hasMore);
      } else {
        setError(data.message || t("Failed to load feed. Please try again."));
      }
    } catch (error) {
      console.error("Error loading feed:", error);
      setError(t("Failed to load feed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = useCallback(() => {
    setPage(1);
    setFeed([]);
    loadFeed();
  }, [activeTab]);

  const handleLike = async (postId, postType) => {
    if (!user?._id) return;

    const originalFeed = feed;
    setFeed((prevFeed) =>
      prevFeed.map((post) => {
        if (post._id === postId) {
          const newLikeStatus = !post.userLiked;
          const newLikesCount = newLikeStatus
            ? post.likesCount + 1
            : post.likesCount - 1;
          return {
            ...post,
            userLiked: newLikeStatus,
            likesCount: Math.max(0, newLikesCount),
          };
        }
        return post;
      })
    );

    try {
      const endpoint =
        postType === "video"
          ? `${API_URL}/videos/toggle-like/${user._id}`
          : `${API_URL}/posts/toggle-like/${user._id}`;

      const body =
        postType === "video" ? { videoId: postId } : { postId: postId };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setFeed(originalFeed);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setFeed(originalFeed);
    }
  };

  const handleSave = async (postId, postType) => {
    if (!user?._id) return;

    const originalFeed = feed;
    setFeed((prevFeed) =>
      prevFeed.map((post) => {
        if (post._id === postId) {
          return {
            ...post,
            userSaved: !post.userSaved,
          };
        }
        return post;
      })
    );

    try {
      const endpoint =
        postType === "video"
          ? `${API_URL}/videos/toggle-save/${user._id}`
          : `${API_URL}/posts/toggle-save/${user._id}`;
      
      const body = postType === 'video' ? { videoId: postId } : { postId: postId };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setFeed(originalFeed);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      setFeed(originalFeed);
    }
  };

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -300,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: 300,
        behavior: "smooth",
      });
    }
  };

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPage(1);
      setFeed([]);
      setHasMore(true);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };



  const handleCommentClick = (item) => {
    if (item.type === "video") {
      openDisplayVideoModal(item);
    } else {
      openDisplayPostModal(item);
    }
  };

  return (
    <>
      <SEO 
        title="Home"
        description="Stay connected with AY Social Media. Explore your personalized feed with posts and videos from people you follow and popular content from around the world. Like, comment, share, and discover new creators every day."
      />

      <Header />
      <MainSideBar />

      <div className="home-page-main-layout">
        <div className="margin-container"></div>

        <div className="home-page-content-wrapper">
          <div className="home-page-main-feed">
            <div className="home-page-heading">
              <h1>{t("Home")}</h1>
              <div className="home-page-tabs">
                <button
                  className={`home-page-tab ${
                    activeTab === "for-you" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("for-you")}
                >
                  {t("For You")}
                </button>
                <button
                  className={`home-page-tab ${
                    activeTab === "following" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("following")}
                >
                  {t("Following")}
                </button>
                <button
                  className={`home-page-tab ${
                    activeTab === "popular" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("popular")}
                >
                  {t("Popular")}
                </button>
              </div>
            </div>

            {error && (
              <div className="home-page-error">
                <p>{error}</p>
                <button onClick={refreshFeed}>{t("Retry")}</button>
              </div>
            )}

            {loading && page === 1 ? (
              <div className="home-page-loading">
                <div className="spinner"></div>
                <p>{t("Loading feed...")}</p>
              </div>
            ) : (
              <>
                <div className="home-page-feed">
                  {feed.length === 0 && !loading ? (
                    <div className="home-page-empty">
                      <p>{t("No posts to show. Try following some people!")}</p>
                    </div>
                  ) : (
                    feed.map((item) => (
                      <ExploreCard
                        key={item._id}
                        item={item}
                        currentUserId={user?._id}
                        followingUsers={followingUsers}
                        requestedUsers={requestedUsers}
                        animatingLikeId={animatingLikeId}
                        isMuted={isMuted}
                        videoRef={(el) => (videoRefs.current[item._id] = el)}
                        onLike={handleLike}
                        onSave={handleSave}
                        onFollowToggle={handleFollowToggle}
                        onCommentClick={handleCommentClick}
                        onDoubleClick={handleDoubleClickLike}
                        onTouchTap={handleTouchTap}
                        onToggleMute={toggleMute}
                        onReport={(itemId, itemType) => navigate(`/settings/reports/${itemId}`)}
                        onShare={() => shareUrl(
                          item.user?.username ? `${item.user.username}'s ${item.type}` : `Check out this ${item.type}`,
                          item.description || item.caption || `Check out this ${item.type} on AYS`,
                          item.type === "post" 
                            ? `${window.location.origin}/explore/post/${item._id}`
                            : `${window.location.origin}/explore/video/${item._id}`
                        )}
                        formatTime={formatTime}
                        getFollowButtonText={getFollowButtonText}
                      />
                    ))
                  )}
                </div>

                <section className="home-page-suggestions-section">
                  <div className="home-page-suggestions-header">
                    <h2 className="home-page-section-title">
                      {t("Suggestions For You")}
                    </h2>
                    <div className="home-page-slider-controls">
                      <button
                        className="home-page-slider-btn"
                        onClick={scrollLeft}
                      >
                        <CaretLeft size={20} weight="bold" />
                      </button>
                      <button
                        className="home-page-slider-btn"
                        onClick={scrollRight}
                      >
                        <CaretRight size={20} weight="bold" />
                      </button>
                    </div>
                  </div>

                  {suggestionsLoading ? (
                    <div className="home-page-suggestions-loading">
                      <div className="spinner-small"></div>
                    </div>
                  ) : (
                    <div
                      className="home-page-suggestions-slider"
                      ref={sliderRef}
                    >
                      {suggestedUsers.length > 0 ? (
                        suggestedUsers.map((suggestedUser) => (
                          <div
                            key={suggestedUser._id}
                            className="home-page-suggestion-card"
                          >
                            <img
                              src={
                                suggestedUser.profilePic || defaultProfilePic
                              }
                              alt={suggestedUser.userName}
                              className="home-page-suggestion-avatar clickable"
                              onClick={() => navigate(`/user/${suggestedUser.userName}`)}
                            />
                            <h3 className="home-page-suggestion-name clickable" onClick={() => navigate(`/user/${suggestedUser.userName}`)}>
                              {suggestedUser.userName}
                            </h3>
                            <span className="home-page-suggestion-username clickable" onClick={() => navigate(`/user/${suggestedUser.userName}`)}>
                              {suggestedUser.name}
                            </span>
                            {suggestedUser.country && (
                              <span className="home-page-suggestion-country">
                                {suggestedUser.country}
                              </span>
                            )}
                            <button
                              className={`home-page-follow-btn ${
                                followingUsers.has(suggestedUser._id)
                                  ? "nfollow"
                                  : ""
                              } ${
                                requestedUsers.has(suggestedUser._id)
                                  ? "requested"
                                  : ""
                              }`}
                              onClick={() =>
                                handleFollowToggle(suggestedUser._id)
                              }
                            >
                              {getFollowButtonText(suggestedUser._id)}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="home-page-no-suggestions">
                          <p>{t("No suggestions available")}</p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {hasMore && !loading && feed.length > 0 && (
                  <div className="home-page-load-more">
                    <button onClick={() => setPage((p) => p + 1)}>
                      {t("Load More")}
                    </button>
                  </div>
                )}

                {loading && page > 1 && (
                  <div className="home-page-loading">
                    <div className="spinner"></div>
                    <p>{t("Loading more...")}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="home-page-right-sidebar">
            <div className="home-page-sidebar-widget">
              <div className="home-page-widget-header">
                <Users size={20} weight="duotone" />
                <h3>{t("Who to Follow")}</h3>
              </div>
              {suggestionsLoading ? (
                <div className="home-page-sidebar-loading">
                  <div className="spinner-small"></div>
                </div>
              ) : (
                <div className="home-page-follow-list">
                  {suggestedUsers.slice(0, 5).map((suggestedUser) => (
                    <div
                      key={suggestedUser._id}
                      className="home-page-follow-item"
                    >
                      <img
                        src={suggestedUser.profilePic || defaultProfilePic}
                        alt={suggestedUser.userName}
                        className="home-page-follow-avatar clickable"
                        onClick={() => navigate(`/user/${suggestedUser.userName}`)}
                      />
                      <div className="home-page-follow-info">
                        <h4 className="home-page-follow-name clickable" onClick={() => navigate(`/user/${suggestedUser.userName}`)}>
                          {suggestedUser.userName}
                        </h4>
                        <span className="home-page-follow-username clickable" onClick={() => navigate(`/user/${suggestedUser.userName}`)}>
                          {suggestedUser.name}
                        </span>
                        {suggestedUser.country && (
                          <span className="home-page-follow-bio">
                            {suggestedUser.country}
                          </span>
                        )}
                      </div>
                      <button
                        className={`home-page-follow-btn-small ${
                          followingUsers.has(suggestedUser._id)
                            ? "nfollow"
                            : ""
                        } ${
                          requestedUsers.has(suggestedUser._id)
                            ? "requested"
                            : ""
                        }`}
                        onClick={() => handleFollowToggle(suggestedUser._id)}
                      >
                        {getFollowButtonText(suggestedUser._id)}
                      </button>
                    </div>
                  ))}

                  {suggestedUsers.length === 0 && (
                    <div className="home-page-no-suggestions-sidebar">
                      <p>{t("No suggestions available")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {isDisplayPostModalOpen && selectedPost && (
        <DisplayModal
          display={isDisplayPostModalOpen}
          toggleModal={closeDisplayPostModal}
          data={selectedPost}
          userData={selectedPost.post.user}
        />
      )}

      {isDisplayVideoModalOpen && selectedPost && (
        <DisplayVideoModal
          display={isDisplayVideoModalOpen}
          toggleModal={closeDisplayVideoModal}
          data={selectedPost}
          userData={selectedPost.video.user}
        />
      )}

      <BottomNav />
    </>
  );
}

export default Home;