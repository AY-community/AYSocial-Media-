import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../../Utils/SEO.jsx";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import Footer from "../../Layouts/MainLayouts/Footer";
import ExploreCard from "../../Layouts/ExploreLayouts/ExploreCard";
import { shareUrl } from "../../Utils/shareUrl";
import { useAuth } from "../../Context/AuthContext";
import "../Home.css"; // Using Home.css for similar styling
import DisplayModal from "../../Layouts/PostLayouts/DisplayPostModal";
import DisplayVideoModal from "../../Layouts/VideoLayouts/DisplayVideoModal";
import formatTime from "../../Utils/FormatTime.jsx";
import "./ExploreSharedPost.css";

const API_URL = import.meta.env.VITE_API;

function ExploreSharedPost() {
  const { t } = useTranslation();
  const { postId, videoId } = useParams();
  const id = postId || videoId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States needed for ExploreCard that are normally on a feed page
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [requestedUsers, setRequestedUsers] = useState(new Set());
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useState(null);
  const [animatingLikeId, setAnimatingLikeId] = useState(null);

  // Modal state
  const [isDisplayPostModalOpen, setIsDisplayPostModalOpen] = useState(false);
  const [isDisplayVideoModalOpen, setIsDisplayVideoModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/feed/${id}`, {
          credentials: "include",
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch item.");
        }
        setItem(data.item);
        if (data.item.isFollowing) {
          setFollowingUsers(new Set([data.item.user._id]));
        }
      } catch (err) {
        setError(err.message);
      } finally {
       setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("Link copied to clipboard!"));
  };

  // Mock functions for ExploreCard
  const handleLike = (itemId, itemType) => {
    // This should be an API call
    setItem((prev) =>
      prev._id === itemId
        ? {
            ...prev,
            userLiked: !prev.userLiked,
            likesCount: prev.userLiked
              ? prev.likesCount - 1
              : prev.likesCount + 1,
          }
        : prev,
    );
  };

  const handleSave = (itemId, itemType) => {
    // This should be an API call
    setItem((prev) =>
      prev._id === itemId ? { ...prev, userSaved: !prev.userSaved } : prev,
    );
  };

  const onFollowToggle = (userId) => {
    // This should be an API call
    if (followingUsers.has(userId)) {
      setFollowingUsers(new Set());
    } else {
      setFollowingUsers(new Set([userId]));
    }
  };

  const closeDisplayPostModal = (likeData, saveData) => {
    if (likeData && item._id === likeData.postId) {
      setItem((prev) => ({
        ...prev,
        userLiked: likeData.isLiked,
        likesCount: likeData.likesCount,
      }));
    }
    if (saveData && item._id === saveData.postId) {
      setItem((prev) => ({
        ...prev,
        userSaved: saveData.isSaved,
      }));
    }

    setSelectedPost(null);
    setIsDisplayPostModalOpen(false);
  };

  const closeDisplayVideoModal = (likeData, saveData) => {
    if (likeData && item._id === likeData.videoId) {
      setItem((prev) => ({
        ...prev,
        userLiked: likeData.isLiked,
        likesCount: likeData.likesCount,
      }));
    }
    if (saveData && item._id === saveData.videoId) {
      setItem((prev) => ({
        ...prev,
        userSaved: saveData.isSaved,
      }));
    }

    setSelectedPost(null);
    setIsDisplayVideoModalOpen(false);
  };

  const handleCommentClick = (clickedItem) => {
    const itemToUse = clickedItem || item;
    if (!itemToUse) return;
  
    const { type, _id, description, images, videoUrl, createdAt, likesCount, userLiked, userSaved, user } = itemToUse;
  
    if (type === "video") {
      const formattedData = {
        video: { _id, description, videoUrl, createdAt, likesCount, isLiked: userLiked, isSaved: userSaved, user }
      };
      setSelectedPost(formattedData);
      setIsDisplayVideoModalOpen(true);
    } else {
      const formattedData = {
        post: { _id, description, images: images || [], createdAt, likesCount, isLiked: userLiked, isSaved: userSaved, user }
      };
      setSelectedPost(formattedData);
      setIsDisplayPostModalOpen(true);
    }
  };

  const handleDoubleClickLike = (postId, postType) => {
    if (!item.userLiked) {
      handleLike(postId, postType);
    }
    setAnimatingLikeId(postId);
    setTimeout(() => {
      setAnimatingLikeId(null);
    }, 1000);
  };
  
  const onToggleMute = () => setIsMuted(!isMuted);
  
  const getFollowButtonText = (userId) => {
    if (followingUsers.has(userId)) return t("Following");
    if (requestedUsers.has(userId)) return t("Requested");
    return t("Follow");
  };

  if (loading) {
    return (
      <>
        <SEO 
          title="Loading..."
          description="Loading content from YourAppName"
          noIndex={true}
        />
        
        <div className="home-page-main-layout">
          <div
            className="home-page-loading"
            style={{
              gridColumn: "2",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div className="spinner"></div>
            <p>{t("Loading post...")}</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEO 
          title="Content Not Found"
          description="The content you're looking for could not be found"
          noIndex={true}
        />
        
        <div className="home-page-main-layout">
          <div
            className="home-page-error"
            style={{ gridColumn: "2", height: "100vh" }}
          >
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {item && (
        <SEO 
          title={`${item.user.userName}'s ${item.type === 'video' ? 'Video' : 'Post'}`}
          description={item.description || `Check out ${item.user.userName}'s ${item.type === 'video' ? 'video' : 'post'} on YourAppName. ${item.likesCount} likes, ${item.commentsCount || 0} comments.`}
          type={item.type === 'video' ? 'video.other' : 'article'}
          image={item.type === 'video' ? item.thumbnail : item.images?.[0] || item.user.profilePic}
          url={window.location.href}
        />
      )}
      
      <Header />
      <MainSideBar />

      <div className="home-page-main-layout">
        <div className="margin-container"></div>
        <div
          className="home-page-content-wrapper explore-shared-post-wrapper"
          style={{ justifyContent: "center" }}
        >
          <div className="home-page-main-feed explore-shared-post-feed" style={{ maxWidth: "630px" }}>
            {item ? (
              <ExploreCard
                item={item}
                currentUserId={user?._id}
                followingUsers={followingUsers}
                requestedUsers={requestedUsers}
                animatingLikeId={animatingLikeId}
                isMuted={isMuted}
                videoRef={videoRef}
                onLike={handleLike}
                onSave={handleSave}
                onFollowToggle={onFollowToggle}
                onCommentClick={() => handleCommentClick(item)}
                onDoubleClick={handleDoubleClickLike}
                onTouchTap={handleDoubleClickLike}
                onToggleMute={onToggleMute}
                onShare={() =>
                  shareUrl(
                    item.user.username
                      ? `${item.user.username}'s post`
                      : "Check out this post",
                    item.caption ||
                      item.description ||
                      "Check out this post on AYS",
                    window.location.href,
                  )
                }
                formatTime={formatTime}
                getFollowButtonText={getFollowButtonText}
                onReport={(itemId, itemType) => navigate(`/settings/reports/${itemId}`)}
              />
            ) : (
              <div className="home-page-error">
                <p>{t("Post not found.")}</p>
              </div>
            )}
          </div>
          <Footer />
        </div>
      </div>
      
      <BottomNav />

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
    </>
  );
}

export default ExploreSharedPost;