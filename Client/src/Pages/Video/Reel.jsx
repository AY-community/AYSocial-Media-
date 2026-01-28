import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';

import './Reel.css';
import Header from '../../Layouts/MainLayouts/Header';
import MainSideBar from '../../Layouts/MainLayouts/MainSideBar';
import BottomNav from '../../Layouts/MainLayouts/BottomNav';
import Vector from '../../assets/Profile/defaultProfilePic.jpg';
import { shareUrl } from '../../Utils/shareUrl';
import ReelCommentModal from '../../Layouts/VideoLayouts/ReelCommentModal';
import { 
  Heart, 
  ChatCircle, 
  ShareNetwork,
  BookmarkSimple,
  SpeakerHigh,
  SpeakerSlash,
  Play,
  Pause,
  SpinnerGap
} from 'phosphor-react';

import SEO from "../../Utils/SEO";

const API_URL = import.meta.env.VITE_API;

const Reels = () => {
  const { t } = useTranslation();
  const [reels, setReels] = useState([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [animatingLikeId, setAnimatingLikeId] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedReelForComment, setSelectedReelForComment] = useState(null);
  const { user } = useAuth();
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [requestedUsers, setRequestedUsers] = useState(new Set());
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const lastReelRef = useRef(null);
  const videoRefs = useRef({});
  const lastTap = useRef(0);
  const tapTimeout = useRef(null);
  const prevIndexRef = useRef(0);

  const fetchReels = useCallback(async (pageNum) => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching page ${pageNum}...`);

      const response = await fetch(`${API_URL}/feed/reels?page=${pageNum}&limit=15`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reels');
      }

      const data = await response.json();
      const { feed, pagination } = data;

      console.log(`Received ${feed.length} reels, hasMore: ${pagination.hasMore}`);

      if (feed.length === 0 && pageNum === 1) {
        setHasMore(false);
        return;
      }

      if (feed.length > 0) {
        setReels(prev => pageNum === 1 ? feed : [...prev, ...feed]);
        setHasMore(pagination.hasMore);
        setPage(pageNum);

        const newFollowing = new Set();
        const newRequested = new Set();
        feed.forEach(reel => {
          if (reel.user.isFollowing) {
            newFollowing.add(reel.user._id);
          }
          if (reel.user.hasSentRequest) {
            newRequested.add(reel.user._id);
          }
        });
        
        if (pageNum === 1) {
          setFollowingUsers(newFollowing);
          setRequestedUsers(newRequested);
        } else {
          setFollowingUsers(prev => new Set([...prev, ...newFollowing]));
          setRequestedUsers(prev => new Set([...prev, ...newRequested]));
        }
      } else {
        setHasMore(false);
      }

    } catch (err) {
      console.error('Error fetching reels:', err);
      setError(err.message || 'Failed to load reels');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    fetchReels(1);
  }, []);

  useEffect(() => {
    if (loading || !hasMore || reels.length === 0) return;

    const options = {
      root: containerRef.current,
      rootMargin: '400px',
      threshold: 0.1
    };

    const callback = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading) {
        console.log('Loading more reels...');
        fetchReels(page + 1);
      }
    };

    observerRef.current = new IntersectionObserver(callback, options);

    if (lastReelRef.current) {
      observerRef.current.observe(lastReelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, page, reels.length, fetchReels]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const reelHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / reelHeight);
      
      if (newIndex !== currentReelIndex && newIndex < reels.length) {
        setCurrentReelIndex(newIndex);
        trackReelView(reels[newIndex]);
        setIsPlaying(true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentReelIndex, reels]);

  useEffect(() => {
    const prevVideo = videoRefs.current[reels[prevIndexRef.current]?._id];
    if (prevVideo) {
      prevVideo.pause();
    }

    const currentVideo = videoRefs.current[reels[currentReelIndex]?._id];
    if (currentVideo && isPlaying) {
      currentVideo.play().catch(e => console.error("Play failed", e));
    }

    prevIndexRef.current = currentReelIndex;
  }, [isPlaying, currentReelIndex, reels]);

  const trackReelView = async (reel) => {
    try {
      await fetch(`${API_URL}/feed/reels/${reel._id}/view`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchTime: 3,
          completed: false
        })
      });
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  };

  const handleLike = async (reelId, index) => {
    if (!user?._id) return;

    const originalReels = [...reels];
    
    const updatedReels = reels.map((reel, i) => {
        if (i === index) {
            const newLikeStatus = !reel.userLiked;
            const newLikesCount = newLikeStatus ? reel.likesCount + 1 : reel.likesCount - 1;
            return { ...reel, userLiked: newLikeStatus, likesCount: Math.max(0, newLikesCount) };
        }
        return reel;
    });
    setReels(updatedReels);

    try {
        const endpoint = `${API_URL}/videos/toggle-like/${user._id}`;
        const body = { videoId: reelId };

        const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            setReels(originalReels);
        }
    } catch (error) {
        console.error("Failed to toggle like:", error);
        setReels(originalReels);
    }
  };

  const handleDoubleClickLike = (reelId, index) => {
      const reel = reels[index];
      if (reel && !reel.userLiked) {
          handleLike(reelId, index);
      }

      setAnimatingLikeId(reelId);
      setTimeout(() => {
          setAnimatingLikeId(null);
      }, 1000);
  };

  const handleTap = (reelId, index) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (tapTimeout.current) {
          clearTimeout(tapTimeout.current);
          tapTimeout.current = null;
          handleDoubleClickLike(reelId, index);
      } else {
          tapTimeout.current = setTimeout(() => {
              setIsPlaying(prev => !prev);
              tapTimeout.current = null;
          }, DOUBLE_TAP_DELAY);
      }
  };

  const handleSave = async (reelId, index) => {
    if (!user?._id) return;

    const originalReels = [...reels];

    const updatedReels = reels.map((reel, i) => {
        if (i === index) {
            return { ...reel, userSaved: !reel.userSaved };
        }
        return reel;
    });
    setReels(updatedReels);

    try {
        const endpoint = `${API_URL}/videos/toggle-save/${user._id}`;
        const body = { videoId: reelId };

        const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            setReels(originalReels);
        }
    } catch (error) {
        console.error("Error toggling save:", error);
        setReels(originalReels);
    }
  };

  const handleFollowToggle = async (userToFollow) => {
    if (!user?._id) return;
    const { _id: userId, privacySettings } = userToFollow;

    const prevFollowing = new Set(followingUsers);
    const prevRequested = new Set(requestedUsers);

    if (followingUsers.has(userId)) {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else if (requestedUsers.has(userId)) {
      setRequestedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else {
      if (privacySettings?.isAccountPrivate) {
        setRequestedUsers(prev => new Set([...prev, userId]));
      } else {
        setFollowingUsers(prev => new Set([...prev, userId]));
      }
    }

    try {
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
          setFollowingUsers(prev => new Set([...prev, userId]));
          setRequestedUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else if (data.requestStatus === "pending") {
          setRequestedUsers(prev => new Set([...prev, userId]));
          setFollowingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else {
          setFollowingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          setRequestedUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      } else {
        setFollowingUsers(prevFollowing);
        setRequestedUsers(prevRequested);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      setFollowingUsers(prevFollowing);
      setRequestedUsers(prevRequested);
    }
  };

  const getFollowButtonText = (userId) => {
    if (followingUsers.has(userId)) return t("Following");
    if (requestedUsers.has(userId)) return t("Requested");
    return t("Follow");
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (error && reels.length === 0) {
    return (
      <>
        <Header />
        <MainSideBar />
        <BottomNav />
        <div className="main-layout">
          <div className="margin-container"></div>
          <div style={{ width: '100%', maxWidth: '2210px', margin: '0 auto' }}>
            <div className="reels-error">
              <p>{error}</p>
              <button onClick={() => fetchReels(1)}>{t("Retry")}</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={"Reels"}
        description={"Explore short, engaging videos from creators around the world on AY Social Media Reels. Like, comment, share, and follow your favorite creators for more amazing content."}
       
      
      />
      <Header />
      <MainSideBar />
      <BottomNav />

      <div className="main-layout reels-layout">
        <div className="margin-container"></div>
        <div style={{ width: '100%', maxWidth: '2210px', margin: '0 auto' }}>
          <div className="reels-container" ref={containerRef}>
            {reels.map((reel, index) => (
              <div 
                key={reel._id} 
                className="reel-item"
                ref={index === reels.length - 3 ? lastReelRef : null}
              >
                <div className="reel-video-wrapper" onClick={() => handleTap(reel._id, index)}>
                  {reel.videoUrl ? (
                    <video
                      ref={el => videoRefs.current[reel._id] = el}
                      className="reel-video"
                      src={reel.videoUrl}
                      loop
                      muted={isMuted}
                      playsInline
                      autoPlay={index === currentReelIndex && isPlaying}
                      poster={reel.thumbnail}
                    />
                  ) : (
                    <img 
                      src={reel.thumbnail || reel.images?.[0]} 
                      alt="Reel" 
                      className="reel-video"
                    />
                  )}
                  
                  <div className={`reel-play-overlay ${!isPlaying && currentReelIndex === index ? 'visible' : ''}`}>
                    <Play size={64} weight="fill" />
                  </div>
                  {animatingLikeId === reel._id && (
                      <div className="like-heart-animation">
                          <Heart size={80} weight="fill" color="var(--primary-color)" />
                      </div>
                  )}
                </div>

                <div className="reel-info">
                  <div className="reel-user">
                    <img 
                      src={reel.user.profilePic || Vector} 
                      alt={reel.user.userName}
                      className="reel-user-avatar"
                      onClick={() => navigate(`/user/${reel.user.userName}`)}
                    />
                    <div className="reel-user-details">
                      <h3 className="reel-username" onClick={() => navigate(`/user/${reel.user.userName}`)}>{reel.user.userName}</h3>
                      <span className="reel-handle">{reel.user.name}</span>
                    </div>
                    {reel.user._id !== user?._id && (
                      <button 
                        className={`reel-follow-btn ${followingUsers.has(reel.user._id) ? "following" : ""}`}
                        onClick={(e) => { e.stopPropagation(); handleFollowToggle(reel.user); }}
                      >
                        {getFollowButtonText(reel.user._id)}
                      </button>
                    )}
                  </div>
                  <p className="reel-description">{reel.description}</p>
                </div>

                <div className="reel-actions">
                  <button 
                    className={`reel-action-btn ${reel.userLiked ? 'liked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleLike(reel._id, index); }}
                  >
                    <Heart 
                      size={40} 
                      weight={reel.userLiked ? "fill" : "duotone"} 
                    />
                    <span>{formatNumber(reel.likesCount)}</span>
                  </button>
                  <button 
                    className="reel-action-btn"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedReelForComment(reel);
                      setCommentModalOpen(true);
                    }}
                  >
                    <ChatCircle size={40} weight="duotone" />
                    <span>{formatNumber(reel.commentsCount)}</span>
                  </button>
                  <button 
                    className="reel-action-btn"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      shareUrl(
                        reel.user?.username ? `${reel.user.username}'s reel` : t("Check out this reel"),
                        reel.description || t("Amazing reel you need to see!"),
                        `${window.location.origin}/explore/video/${reel._id}`
                      );
                    }}
                  >
                    <ShareNetwork size={40} weight="duotone" />
                    <span>{formatNumber(reel.sharesCount || 0)}</span>
                  </button>
                  <button 
                    className={`reel-action-btn ${reel.userSaved ? 'saved' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleSave(reel._id, index); }}
                  >
                    <BookmarkSimple 
                      size={40} 
                      weight={reel.userSaved ? "fill" : "duotone"} 
                    />
                  </button>
                  <button 
                    className="reel-action-btn"
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  >
                    {isMuted ? (
                      <SpeakerSlash size={40} weight="duotone" />
                    ) : (
                      <SpeakerHigh size={40} weight="duotone" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {loading && (
              <div className="reels-loading">
                <SpinnerGap size={48} className="spinner" />
              </div>
            )}

            {!hasMore && reels.length > 0 && (
              <div className="reels-end">
                <p>{t("You've reached the end!")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReelCommentModal 
        display={commentModalOpen}
        toggleModal={() => setCommentModalOpen(false)}
        videoData={selectedReelForComment}
        userData={user}
      />
    </>
  );
};

export default Reels;