import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from 'phosphor-react';
import SEO from '../../Utils/SEO';
import './SearchResult.css';
import { useAuth } from "../../Context/AuthContext";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import ExploreCard from "../../Layouts/ExploreLayouts/ExploreCard";
import { shareUrl } from "../../Utils/shareUrl";
import DisplayModal from "../../Layouts/PostLayouts/DisplayPostModal";
import DisplayVideoModal from "../../Layouts/VideoLayouts/DisplayVideoModal";
import formatTime from "../../Utils/FormatTime";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

const API_URL = import.meta.env.VITE_API;

const SearchResults = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState(decodeURIComponent(id || ''));
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [requestedUsers, setRequestedUsers] = useState(new Set());
  
  const videoRefs = useRef({});
  const [isMuted, setIsMuted] = useState(true);
  
  const [animatingLikeId, setAnimatingLikeId] = useState(null);
  const lastTap = useRef(0);

  const [isDisplayPostModalOpen, setIsDisplayPostModalOpen] = useState(false);
  const [isDisplayVideoModalOpen, setIsDisplayVideoModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [posts, setPosts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [combinedFeed, setCombinedFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Related searches state
  const [relatedSearches, setRelatedSearches] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (id) {
      const decoded = decodeURIComponent(id);
      setSearchQuery(decoded);
      setPage(1);
    }
  }, [id]);

  useEffect(() => {
    if (searchQuery && searchQuery.trim() !== '') {
      fetchSearchResults();
      fetchRelatedSearches();
    }
  }, [searchQuery, activeTab, page]);

  const fetchRelatedSearches = () => {
    if (!searchQuery.trim()) return;

    try {
      setLoadingRelated(true);
      
      // Generate smart related searches based on the query
      const query = searchQuery.toLowerCase().trim();
      const words = query.split(' ');
      
      const suggestions = [];
      
      // Add common search patterns
      suggestions.push(`${query} ${t("tips")}`);
      suggestions.push(`${t("best")} ${query}`);
      suggestions.push(`${query} ${t("tutorial")}`);
      suggestions.push(`${t("how to")} ${query}`);
      suggestions.push(`${query} ${t("guide")}`);
      
      // If multi-word query, try variations
      if (words.length > 1) {
        suggestions.push(`${words[0]} ${t("for")} ${words.slice(1).join(' ')}`);
      }
      
      setRelatedSearches(suggestions.slice(0, 5));
    } catch (err) {
      console.error('Error generating related searches:', err);
      setRelatedSearches([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const fetchSearchResults = async () => {
    if (loading || !searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      switch (activeTab) {
        case 'all':
          endpoint = `${API_URL}/feed/search/all/${encodeURIComponent(searchQuery)}`;
          break;
        case 'posts':
          endpoint = `${API_URL}/feed/search/posts/${encodeURIComponent(searchQuery)}?page=${page}&limit=20`;
          break;
        case 'videos':
          endpoint = `${API_URL}/feed/search/videos/${encodeURIComponent(searchQuery)}?page=${page}&limit=20`;
          break;
        case 'users':
          endpoint = `${API_URL}/feed/search/users/${encodeURIComponent(searchQuery)}?page=${page}&limit=20`;
          break;
        default:
          endpoint = `${API_URL}/feed/search/all/${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        if (activeTab === 'all') {
          setPosts(data.results.posts || []);
          setVideos(data.results.videos || []);
          setUsers(data.results.users || []);
          setCombinedFeed(data.results.combined || []);
        } else if (activeTab === 'posts') {
          if (page === 1) {
            setPosts(data.posts);
          } else {
            setPosts(prev => [...prev, ...data.posts]);
          }
          setHasMore(data.pagination.hasMore);
        } else if (activeTab === 'videos') {
          if (page === 1) {
            setVideos(data.videos);
          } else {
            setVideos(prev => [...prev, ...data.videos]);
          }
          setHasMore(data.pagination.hasMore);
        } else if (activeTab === 'users') {
          if (page === 1) {
            setUsers(data.users);
          } else {
            setUsers(prev => [...prev, ...data.users]);
          }
          setHasMore(data.pagination.hasMore);
        }
      } else {
        setError(data.message || 'Failed to fetch search results');
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
      setError('Failed to load search results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPage(1);
      setHasMore(true);
    }
  };

  const handleDoubleClickLike = (postId, postType) => {
    const allItems = activeTab === 'all' ? combinedFeed : (activeTab === 'posts' ? posts : videos);
    const item = allItems.find((p) => p._id === postId);
    if (item && !item.userLiked) {
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
    const updateFeed = (feed) => feed.map((item) => {
      if (likeData && item._id === likeData.postId) {
        return { ...item, userLiked: likeData.isLiked, likesCount: likeData.likesCount };
      }
      if (saveData && item._id === saveData.postId) {
        return { ...item, userSaved: saveData.isSaved };
      }
      return item;
    });

    if (likeData || saveData) {
      setPosts(updateFeed);
      setCombinedFeed(updateFeed);
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
    const updateFeed = (feed) => feed.map((item) => {
      if (likeData && item._id === likeData.videoId) {
        return { ...item, userLiked: likeData.isLiked, likesCount: likeData.likesCount };
      }
      if (saveData && item._id === saveData.videoId) {
        return { ...item, userSaved: saveData.isSaved };
      }
      return item;
    });

    if (likeData || saveData) {
      setVideos(updateFeed);
      setCombinedFeed(updateFeed);
    }
    
    setSelectedPost(null);
    setIsDisplayVideoModalOpen(false);
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

  const handleLike = async (postId, postType) => {
    if (!user?._id) return;

    const updateLike = (feed) => feed.map((item) => {
      if (item._id === postId) {
        const newLikeStatus = !item.userLiked;
        const newLikesCount = newLikeStatus ? item.likesCount + 1 : item.likesCount - 1;
        return { ...item, userLiked: newLikeStatus, likesCount: Math.max(0, newLikesCount) };
      }
      return item;
    });

    const originalPosts = posts;
    const originalVideos = videos;
    const originalCombined = combinedFeed;

    setPosts(updateLike);
    setVideos(updateLike);
    setCombinedFeed(updateLike);

    try {
      const endpoint = postType === "video"
        ? `${API_URL}/videos/toggle-like/${user._id}`
        : `${API_URL}/posts/toggle-like/${user._id}`;

      const body = postType === "video" ? { videoId: postId } : { postId: postId };

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setPosts(originalPosts);
        setVideos(originalVideos);
        setCombinedFeed(originalCombined);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setPosts(originalPosts);
      setVideos(originalVideos);
      setCombinedFeed(originalCombined);
    }
  };

  const handleSave = async (postId, postType) => {
    if (!user?._id) return;

    const updateSave = (feed) => feed.map((item) => {
      if (item._id === postId) {
        return { ...item, userSaved: !item.userSaved };
      }
      return item;
    });

    const originalPosts = posts;
    const originalVideos = videos;
    const originalCombined = combinedFeed;

    setPosts(updateSave);
    setVideos(updateSave);
    setCombinedFeed(updateSave);

    try {
      const endpoint = postType === "video"
        ? `${API_URL}/videos/toggle-save/${user._id}`
        : `${API_URL}/posts/toggle-save/${user._id}`;
      
      const body = postType === 'video' ? { videoId: postId } : { postId: postId };

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setPosts(originalPosts);
        setVideos(originalVideos);
        setCombinedFeed(originalCombined);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      setPosts(originalPosts);
      setVideos(originalVideos);
      setCombinedFeed(originalCombined);
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

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getFollowButtonText = (userId) => {
    if (followingUsers.has(userId)) return t('Following');
    if (requestedUsers.has(userId)) return t('Requested');
    return t('Follow');
  };

  const getFilteredResults = () => {
    switch(activeTab) {
      case 'posts':
        return posts;
      case 'videos':
        return videos;
      case 'users':
        return users;
      default:
        return combinedFeed;
    }
  };

  const getResultCount = () => {
    switch(activeTab) {
      case 'all':
        return `${combinedFeed.length + users.length} ${t("results found")}`;
      case 'posts':
        return `${posts.length} ${t("posts")}`;
      case 'videos':
        return `${videos.length} ${t("videos")}`;
      case 'users':
        return `${users.length} ${t("users")}`;
      default:
        return `0 ${t("results")}`;
    }
  };

  const handleUserClick = (userName) => {
    navigate(`/profile/${userName}`);
  };

  const handleRelatedSearchClick = (searchTerm) => {
    navigate(`/search/${encodeURIComponent(searchTerm)}`);
  };

  const truncateBio = (bio, maxLength = 60) => {
    if (!bio) return '';
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength) + '...';
  };

  const UserCard = ({ user }) => (
    <div className="search-user-card">
      <img 
        src={user.profilePic || defaultProfilePic} 
        alt={user.userName} 
        className="search-user-card-avatar"
        onClick={() => handleUserClick(user.userName)}
        style={{ cursor: 'pointer' }}
      />
      <div className="search-user-card-info" onClick={() => handleUserClick(user.userName)} style={{ cursor: 'pointer' }}>
        <h3 className="search-user-card-name">{user.userName}</h3>
        <span className="search-user-card-username">{user.name}</span>
        {user.bio && <p className="search-user-card-bio">{truncateBio(user.bio)}</p>}
        <span className="search-user-card-followers">{formatCount(user.followersCount)} {t("followers")}</span>
      </div>
      <button
        className={`search-user-follow-btn ${followingUsers.has(user._id) ? 'following' : ''} ${requestedUsers.has(user._id) ? 'requested' : ''}`}
        onClick={() => handleFollowToggle(user._id)}
      >
        {getFollowButtonText(user._id)}
      </button>
    </div>
  );

  // Generate SEO description based on results
  const generateSEODescription = () => {
    if (!searchQuery) return "Search for posts, videos, and users on YourAppName";
    
    const totalResults = combinedFeed.length + users.length;
    if (totalResults === 0) return `No results found for "${searchQuery}". Try different keywords or explore trending content.`;
    
    return `Found ${totalResults} results for "${searchQuery}" on YourAppName. Discover posts, videos, and users related to ${searchQuery}.`;
  };

  return (
    <>
      <SEO 
        title={searchQuery ? `Search: ${searchQuery}` : "Search"}
        description={generateSEODescription()}
        type="website"
        noIndex={true}
      />
      
      <Header />
      <MainSideBar />
      
      <div className="search-page-container">
        <div className="margin-container"></div>
        
        <div className="search-content-wrapper">
          <div className="search-main-feed">
            <div className="search-page-heading">
              <div className="search-header">
                <MagnifyingGlass size={28} weight="bold" />
                <h1 className="search-title">
                  {searchQuery ? `${t("Search Results for")} "${searchQuery}"` : t('Search Results')}
                </h1>
              </div>
              <p className="search-result-count">{getResultCount()}</p>
              
              <div className="search-page-tabs">
                <button
                  className={`search-page-tab ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => handleTabChange('all')}
                >
                  {t("All")}
                </button>
                <button
                  className={`search-page-tab ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => handleTabChange('posts')}
                >
                  {t("Posts")}
                </button>
                <button
                  className={`search-page-tab ${activeTab === 'videos' ? 'active' : ''}`}
                  onClick={() => handleTabChange('videos')}
                >
                  {t("Videos")}
                </button>
                <button
                  className={`search-page-tab ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => handleTabChange('users')}
                >
                  {t("Users")}
                </button>
              </div>
            </div>

            {error && (
              <div className="search-error">
                <p>{error}</p>
                <button onClick={fetchSearchResults}>{t("Retry")}</button>
              </div>
            )}

            {loading && page === 1 ? (
              <div className="search-loading">
                <div className="spinner"></div>
                <p>{t("Searching...")}</p>
              </div>
            ) : (
              <>
                <div className="search-page-feed">
                  {activeTab === 'all' ? (
                    <>
                      {/* Render Users first in All tab */}
                      {users.length > 0 && (
                        <div className="search-users-section">
                          <h2 className="search-section-title">{t("Users")}</h2>
                          {users.map(userItem => (
                            <UserCard key={userItem._id} user={userItem} />
                          ))}
                        </div>
                      )}
                      
                      {/* Then render Posts and Videos */}
                      {combinedFeed.length > 0 ? (
                        <div className="search-combined-section">
                          <h2 className="search-section-title">{t("Posts & Videos")}</h2>
                          {combinedFeed.map(item => (
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
                              onShare={() => shareUrl(
                                item.user?.userName ? `${item.user.userName}'s ${item.type}` : `Check out this ${item.type}`,
                                item.description || item.caption || `Check out this ${item.type} on AYS`,
                                item.type === "post" 
                                  ? `${window.location.origin}/explore/post/${item._id}`
                                  : `${window.location.origin}/explore/video/${item._id}`
                              )}
                              formatTime={formatTime}
                              getFollowButtonText={getFollowButtonText}
                            />
                          ))}
                        </div>
                      ) : (
                        !users.length && (
                          <div className="search-empty">
                            <p>{t("No results found")}</p>
                          </div>
                        )
                      )}
                    </>
                  ) : activeTab === 'users' ? (
                    getFilteredResults().length > 0 ? (
                      getFilteredResults().map(userItem => (
                        <UserCard key={userItem._id} user={userItem} />
                      ))
                    ) : (
                      <div className="search-empty">
                        <p>{t("No users found")}</p>
                      </div>
                    )
                  ) : (
                    getFilteredResults().length > 0 ? (
                      getFilteredResults().map(item => (
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
                          onShare={() => shareUrl(
                            item.user?.userName ? `${item.user.userName}'s ${item.type}` : `Check out this ${item.type}`,
                            item.description || item.caption || `Check out this ${item.type} on AYS`,
                            item.type === "post" 
                              ? `${window.location.origin}/explore/post/${item._id}`
                              : `${window.location.origin}/explore/video/${item._id}`
                          )}
                          formatTime={formatTime}
                          getFollowButtonText={getFollowButtonText}
                        />
                      ))
                    ) : (
                      <div className="search-empty">
                        <p>{t("No")} {t(activeTab)} {t("found")}</p>
                      </div>
                    )
                  )}
                </div>

                {hasMore && !loading && activeTab !== 'all' && getFilteredResults().length > 0 && (
                  <div className="search-load-more">
                    <button onClick={() => setPage(p => p + 1)}>{t("Load More")}</button>
                  </div>
                )}

                {loading && page > 1 && (
                  <div className="search-loading">
                    <div className="spinner"></div>
                    <p>{t("Loading more...")}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="search-right-sidebar">
            <div className="search-widget">
              <div className="search-widget-header">
                <MagnifyingGlass size={20} weight="duotone" />
                <h3 className="search-widget-title">{t("Related Searches")}</h3>
              </div>
              <div className="search-related-list">
                {loadingRelated ? (
                  <p style={{ padding: '12px', color: '#999', fontSize: '14px' }}>{t("Loading...")}</p>
                ) : relatedSearches.length > 0 ? (
                  relatedSearches.map((term, idx) => (
                    <button 
                      key={idx} 
                      className="search-related-item"
                      onClick={() => handleRelatedSearchClick(term)}
                    >
                      {term}
                    </button>
                  ))
                ) : (
                  <p style={{ padding: '12px', color: '#999', fontSize: '14px' }}>{t("No suggestions available")}</p>
                )}
              </div>
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
};

export default SearchResults;