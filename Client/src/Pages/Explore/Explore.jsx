import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './Explore.css';
import { useNavigate } from 'react-router-dom';
import Header from '../../Layouts/MainLayouts/Header';
import MainSideBar from '../../Layouts/MainLayouts/MainSideBar';
import BottomNav from '../../Layouts/MainLayouts/BottomNav';
import { MagnifyingGlass, Play, Heart, ChatCircle, CircleNotch } from 'phosphor-react';
import { getCloudinaryThumbnail } from '../../Utils/getThumbnailByVideoUrl';
 
    import SEO from '../../Utils/SEO';

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  const observerTarget = useRef(null);

  // Handle search input click - redirect to search page
  const handleSearchClick = () => {
    navigate('/search/mobile');
  };

  // Get thumbnail URL for post
  const getThumbnailUrl = (post) => {
    if (post.isVideo && post.thumbnail) {
      // Try to get Cloudinary thumbnail from video URL
      const cloudinaryThumbnail = getCloudinaryThumbnail(post.thumbnail);
      return cloudinaryThumbnail || post.thumbnail;
    }
    return post.thumbnail;
  };

  // Fetch explore feed
  const fetchExploreFeed = useCallback(async (pageNum) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use credentials to send cookies
        const response = await fetch(`${import.meta.env.VITE_API}/feed/explore?page=${pageNum}&limit=30`, {
        credentials: 'include', // Important: sends cookies with request
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON Response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch feed');
      }

      const { feed, pagination } = data;

      if (pageNum === 1) {
        setPosts(feed);
      } else {
        setPosts(prev => [...prev, ...feed]);
      }

      setHasMore(pagination.hasMore);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching explore feed:', err);
      setError(err.message || 'Failed to load posts');
      setLoading(false);
    }
  }, [loading]);

  // Initial load
  useEffect(() => {
    fetchExploreFeed(1);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading]);

  // Fetch next page when page changes
  useEffect(() => {
    if (page > 1) {
      fetchExploreFeed(page);
    }
  }, [page]);

  // Filter posts based on search
  const filteredPosts = posts.filter(post => 
    post.user?.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle post click
  const handlePostClick = (post) => {
    // Navigate to post detail page
    window.location.href = `/explore/post/${post._id}`;
  };

  return (
    <>
    <SEO 
  
  title="Explore Trending Content"
  description="Discover trending posts, videos, and reels from creators around the world. Find new content, explore popular hashtags, and connect with interesting people."
  type="website"
  url={`${window.location.origin}/explore`}
/>
      <Header />
      <MainSideBar />
      <BottomNav />

      <div className="main-layout">
        <div className="margin-container"></div>
        
        <div style={{ width: '100%' }}>
          <div className="explore-page-heading">
            <h1>{t("Explore")}</h1>
            <div className="explore-input-div" onClick={handleSearchClick}>
              <MagnifyingGlass size={21} className="explore-search-icon" />
              <input
                type="text"
                placeholder={t("Search posts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchClick}
                readOnly
              />
            </div>
          </div>

          {error && (
            <div className="explore-error">
              <p>{error}</p>
              <button onClick={() => fetchExploreFeed(1)}>{t("Retry")}</button>
            </div>
          )}

          <div className="explore-grid">
            {filteredPosts.map((post, index) => (
              <div 
                key={`${post._id}-${index}`} 
                className={`grid-item ${post.isVideo ? 'grid-item-video' : ''}`}
                onClick={() => handlePostClick(post)}
              >
                <img 
                  src={getThumbnailUrl(post)} 
                  alt={`Post by ${post.user?.userName}`}
                  loading="lazy"
                />
                
                {/* Video indicator */}
                {post.isVideo && (
                  <div className="video-indicator">
                    <Play size={24} weight="fill" />
                  </div>
                )}

                {/* Hover overlay with stats */}
                <div className="grid-item-overlay">
                  <div className="overlay-stats">
                    <span>
                      <Heart size={20} weight="fill" />
                      {post.likesCount}
                    </span>
                    <span>
                      <ChatCircle size={20} weight="fill" />
                      {post.commentsCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="explore-loading">
              <CircleNotch size={40} className="loading-spinner" weight="bold" />
            </div>
          )}

          {/* Intersection observer target */}
          {hasMore && <div ref={observerTarget} className="observer-target" />}

          {/* No more posts message */}
          {!hasMore && posts.length > 0 && (
            <div className="explore-end-message">
              <p>{t("You've reached the end!")}</p>
            </div>
          )}

          {/* No posts found */}
          {!loading && posts.length === 0 && (
            <div className="explore-empty">
              <p>{t("No posts to explore yet")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Explore;