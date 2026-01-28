import "../../Layouts/Layouts.css";
import "./profile.css";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useModal } from "../../Context/ModalContext";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import { MapPin, CircleNotch } from "phosphor-react";
import PostCard from "../../Layouts/PostLayouts/PostCard";
import VideoCard from "../../Layouts/PostLayouts/VideoCard";
import standindPerson from "../../assets/Brazuca - airport.png";
import postImage from "../../assets/Brazuca - Screen 4.png";
import DeletePostModal from "../../Layouts/PostLayouts/DeletePostModal";
import EditPostModal from "../../Layouts/PostLayouts/EditPostModal";
import EditVideoModal from "../../Layouts/VideoLayouts/EditVideoModal";
import DeleteVideoModal from "../../Layouts/VideoLayouts/DeleteVideoModal";
import DisplayModal from "../../Layouts/PostLayouts/DisplayPostModal";
import DisplayVideoModal from "../../Layouts/VideoLayouts/DisplayVideoModal";
import ContentModal from "../../Layouts/ProfileLayouts/ContentModal";
import { getCloudinaryThumbnail } from "../../Utils/getThumbnailByVideoUrl";
import { shareUrl } from "../../Utils/shareUrl";
import FollowerModal from "../../Layouts/ProfileLayouts/FollowerModal";
import FollowingModal from "../../Layouts/ProfileLayouts/FollowingModal";
import { SkeletonCard } from "../../Components/Post&Video/SkeletonCard";
import { useTranslation } from "react-i18next";
import SEO from '../../Utils/SEO';

export default function MyProfile({ userData, loading }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { user } = useAuth();
  const { openPostModal, openVideoModal } = useModal();
  const [flagUrl, setFlagUrl] = useState("🌐");
  const [activeTab, setActiveTab] = useState("posts");
  const [activeSort, setActiveSort] = useState("Latest");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteVideoModal, setShowDeleteVideoModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [showEditVideoModal, setShowEditVideoModal] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState(null);
  const [showDisplayModal, setShowDisplayModal] = useState(false);
  const [showDisplayVideoModal, setShowDisplayVideoModal] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [postDisplayData, setPostDisplayData] = useState(null);
  const [videoDisplayData, setVideoDisplayData] = useState(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModalContentModal, setShowModalContentModal] = useState(false);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const { userName, postId, videoId } = useParams();

  useEffect(() => {
    const fetchContentData = async () => {
      if (location.pathname.includes("/post/") && postId) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API}/shared-post/${postId}/${user._id}`
          );
          if (response.ok) {
            const postData = await response.json();
            setPostDisplayData({ post: postData });
            setShowDisplayModal(true);
            window.history.replaceState(null, "", `/user/${userName}`);
          }
        } catch (error) {
        }
      }

      if (location.pathname.includes("/video/") && videoId) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API}/shared-video/${videoId}/${user._id}`
          );
          if (response.ok) {
            const videoData = await response.json();
            setVideoDisplayData({ video: videoData });
            setShowDisplayVideoModal(true);
            window.history.replaceState(null, "", `/user/${userName}`);
          }
        } catch (error) {
          navigate(`/user/${userName}`, { replace: true });
        }
      }
    };

    if (
      (postId && location.pathname.includes("/post/")) ||
      (videoId && location.pathname.includes("/video/"))
    ) {
      fetchContentData();
    }
  }, [postId, videoId, location.pathname, userName, user._id, navigate]);

  const getCountryFlag = useCallback(async (countryName) => {
    if (!countryName) return "🏳️";

    try {
      const response = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data[0]?.flags?.png || data[0]?.flags?.svg || "🏳️";
    } catch (error) {
      return "🏳️";
    }
  }, []);

  useEffect(() => {
    const fetchFlag = async () => {
      if (userData.location) {
        const flagImageUrl = await getCountryFlag(userData.location);
        setFlagUrl(flagImageUrl);
      }
    };

    fetchFlag();
  }, [userData.location, getCountryFlag]);

  const handleSortChange = (sortType) => {
    setActiveSort(sortType);

    let sortedPosts = [...userData.posts];
    let sortedVideos = [...userData.videos];

    switch (sortType) {
      case "Latest":
        sortedPosts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        sortedVideos.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        break;
      case "Oldest":
        sortedPosts.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        sortedVideos.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        break;
      case "Most Liked":
        sortedPosts.sort((a, b) => Number(b.likesCount) - Number(a.likesCount));
        sortedVideos.sort(
          (a, b) => Number(b.likesCount) - Number(a.likesCount)
        );
        break;
      default:
        break;
    }

    userData.setPosts(sortedPosts);
    userData.setVideos(sortedVideos);
  };

  const toggleLikeApi = async (userId, postId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/toggle-like/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        userData.setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  likesCount: data.updatedLikesCount,
                  isLiked: !post.isLiked,
                }
              : post
          )
        );
      }

    } catch (err) {
    }
  };

  const confirmDelete = async () => {
    if (buttonLoading) return;

    setButtonLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/${postToDelete}/${user._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const updatedPosts = userData.posts.filter(
          (post) => post._id !== postToDelete
        );
        userData.setPosts(updatedPosts);
        setShowDeleteModal(false);
        setPostToDelete(null);
      }
    } finally {
      setButtonLoading(false);
    }
  };

  const confirmVideoDelete = async () => {
    setButtonLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/${videoToDelete}/${user._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const updatedVideos = userData.videos.filter(
          (video) => video._id !== videoToDelete
        );
        userData.setVideos(updatedVideos);
        setShowDeleteVideoModal(false);
        setVideoToDelete(null);
      }
    } finally {
      setButtonLoading(false);
    }
  };

  const handleEditClick = (postId) => {
    const post = userData.posts.find((p) => p._id === postId);

    if (post) {
      const postData = {
        id: post._id,
        content: post.description || null,
        images: post.images,
      };

      setPostToEdit(postData);
      setShowEditModal(true);
    }
  };

  const handleEditVideoClick = (videoId) => {
    const video = userData.videos.find((p) => p._id === videoId);

    if (video) {
      const videoData = {
        id: video._id,
        content: video.description || null,
        videoUrl: video.videoUrl,
      };

      setVideoToEdit(videoData);
      setShowEditVideoModal(true);
    }
  };

  const handleSaveClick = async (postId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/toggle-save/${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        userData.setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  isSaved: !post.isSaved,
                }
              : post
          )
        );
      }
    } catch (err) {
    }
  };

  const handleSaveVideoClick = async (videoId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-save/${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        userData.setVideos((prevVideos) =>
          prevVideos.map((video) =>
            video._id === videoId
              ? {
                  ...video,
                  isSaved: !video.isSaved,
                }
              : video
          )
        );
      }
    } catch (err) {
    }
  };

  const handleDisplayClick = (postData) => {
    setShowDisplayModal(true);
    setPostDisplayData(postData);
  };

  const handleDisplayVideoClick = (videoData) => {
    setShowDisplayVideoModal(true);
    setVideoDisplayData(videoData);
  };

  const handleDeleteClick = (postId) => {
    setPostToDelete(postId);
    setShowDeleteModal(true);
  };

  const handleDeleteVideoClick = (videoId) => {
    setVideoToDelete(videoId);
    setShowDeleteVideoModal(true);
  };

  const handleClose = (likeData, saveData) => {
    setShowDisplayModal(false);

    if (likeData) {
      userData.setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === likeData.postId
            ? {
                ...post,
                isLiked: likeData.isLiked,
                likesCount: likeData.likesCount,
              }
            : post
        )
      );
    }

    if (saveData) {
      userData.setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === saveData.postId
            ? {
                ...post,
                isSaved: saveData.isSaved,
              }
            : post
        )
      );
    }
  };

  const handleVideoClose = (likeData, saveData) => {
    setShowDisplayVideoModal(false);

    if (likeData) {
      userData.setVideos((prevVideos) =>
        prevVideos.map((video) =>
          video._id === likeData.videoId
            ? {
                ...video,
                isLiked: likeData.isLiked,
                likesCount: likeData.likesCount,
              }
            : video
        )
      );
    }

    if (saveData) {
      userData.setVideos((prevVideos) =>
        prevVideos.map((video) =>
          video._id === saveData.videoId
            ? {
                ...video,
                isSaved: saveData.isSaved,
              }
            : video
        )
      );
    }
  };

  useEffect(() => {
    let observer = null;

    if (
      activeTab === "posts" &&
      !loading &&
      !postsLoading &&
      userData.hasMorePosts
    ) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setPostsLoading(true);
            Promise.resolve(userData.loadMorePosts()).finally(() => {
              setTimeout(() => setPostsLoading(false), 300);
            });
          }
        },
        {
          root: null,
          rootMargin: "100px",
          threshold: 0.1,
        }
      );

      if (userData.postsObserverRef?.current) {
        observer.observe(userData.postsObserverRef.current);
      }
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [
    activeTab,
    loading,
    postsLoading,
    userData.hasMorePosts,
    userData.loadMorePosts,
  ]);

  useEffect(() => {
    let observer = null;

    if (activeTab === "videos" && !videosLoading && userData.hasMoreVideos) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setVideosLoading(true);
            Promise.resolve(userData.loadMoreVideos()).finally(() => {
              setTimeout(() => setVideosLoading(false), 300);
            });
          }
        },
        {
          root: null,
          rootMargin: "100px",
          threshold: 0.1,
        }
      );

      if (userData.videosObserverRef?.current) {
        observer.observe(userData.videosObserverRef.current);
      }
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [
    activeTab,
    videosLoading,
    userData.hasMoreVideos,
    userData.loadMoreVideos,
  ]);

  const renderSkeletonCards = (count = 6) => {
    return Array(count)
      .fill(0)
      .map((_, index) => <SkeletonCard key={`skeleton-${index}`} />);
  };

  return (
    <>
   <SEO 
      title={`${userData.userName}'s Profile`}  
      description={`Explore your profile on AYSocial. View your posts, videos, followers, and more.`}
      image={`${userData.profilePic}`}
      url={`${window.location.origin}/user/${userData.userName}`}
    />
      


      <DeletePostModal
        openModal={showDeleteModal}
        onConfirm={confirmDelete}
        onClose={() => setShowDeleteModal(false)}
        buttonLoading={buttonLoading}
      />

      <DeleteVideoModal
        openModal={showDeleteVideoModal}
        onConfirm={confirmVideoDelete}
        onClose={() => setShowDeleteVideoModal(false)}
        buttonLoading={buttonLoading}
      />

      <EditPostModal
        display={showEditModal}
        toggleModal={() => {
          setShowEditModal(false);
          setPostToEdit(null);
        }}
        postData={postToEdit}
      />

      <EditVideoModal
        display={showEditVideoModal}
        toggleModal={() => {
          setShowEditVideoModal(false);
          setVideoToEdit(null);
        }}
        data={videoDisplayData}
        videoData={videoToEdit}
      />

      <DisplayModal
        display={showDisplayModal}
        toggleModal={handleClose}
        data={postDisplayData}
        userData={user}
      />

      <DisplayVideoModal
        display={showDisplayVideoModal}
        toggleModal={handleVideoClose}
        userData={user}
        data={videoDisplayData} 
      />

      <ContentModal
        display={showModalContentModal}
        toggleModal={() => setShowModalContentModal(false)}
        userName={userData.userName}
        postNumber={userData.content.posts}
        videoNumber={userData.content.videos}
      />

      <FollowerModal
        display={showFollowerModal}
        toggleModal={() => setShowFollowerModal(false)}
        id={user._id}
        isOwner={true}
        loggedInUserId={user._id}
      />

      <FollowingModal
        display={showFollowingModal}
        toggleModal={() => setShowFollowingModal(false)}
        id={user._id}
        isOwner={true}
        loggedInUserId={user._id}
      />

      <Header />
      <MainSideBar />
      <BottomNav />
      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="main-content">
            <div className="profile-header">
              <div
                className="profile-banner"
                style={{
                  background:
                    userData.coverPic && userData.coverPic.image
                      ? `url(${userData.coverPic.image})`
                      : userData.coverPic?.color ||
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
              <div className="profile-info">
                <div
                  className="profile-avatar-large"
                  style={{
                    backgroundImage: `url(${
                      userData.profilePic
                        ? userData.profilePic
                        : defaultProfilePic
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                ></div>
                <div className="profile-details">
                  <h1 className="profile-name">{userData.userName}</h1>

                  <p className="profile-handle">{userData.name}</p>
                  <p className="profile-date">
                    {t("joined")}{" "}
                    <span>
                      {userData.createdAtDay} {userData.createdAtMonth}{" "}
                      {userData.createdAtYear}{" "}
                    </span>
                  </p>

                  <p className="profile-location">
                    <MapPin size={18} weight="fill" color="#6b7280" />
                    {flagUrl !== "🌐" && flagUrl !== "🏳️" ? (
                      <img
                        src={flagUrl}
                        alt={`${userData.location} flag`}
                        style={{
                          width: "20px",
                          height: "15px",
                          objectFit: "cover",
                          borderRadius: "2px",
                          border: "1px solid #e5e7eb",
                          marginRight: "5px",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "inline";
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "16px", marginRight: "5px" }}>
                        {flagUrl}
                      </span>
                    )}
                    <span>{userData.location || "Unknown"}</span>
                  </p>

                  <div className="profile-stats">
                    <div
                      className="stat"
                      onClick={() => setShowFollowingModal(true)}
                    >
                      <span className="stat-number">{userData.following}</span>
                      <span className="stat-label">{t("Following")}</span>
                    </div>
                    <div
                      className="stat"
                      onClick={() => setShowFollowerModal(true)}
                    >
                      <span className="stat-number">{userData.followers}</span>
                      <span className="stat-label">{t("Followers")}</span>
                    </div>
                    <div
                      className="stat"
                      onClick={() => setShowModalContentModal(true)}
                    >
                      <span className="stat-number">
                        {userData.content.total || 0}
                      </span>
                      <span className="stat-label">{t("Content")}</span>
                    </div>
                  </div>

                  {userData.bio ? (
                    <p className="profile-bio">{userData.bio}</p>
                  ) : null}
                  <div className="profile-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/edit/${userData.userName}`)}
                    >
                      {t("Edit Profile")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        shareUrl(
                          user.userName,
                          "",
                          `${import.meta.env.VITE_CLIENT_URL}/user/${
                            user.userName
                          }`
                        )
                      }
                    >
                      {t("Share")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="content-section content-section-profile"
            style={{ paddingBottom: "15px" }}
          >
            <div className="content-profile-header">
              <h2
                className="section-title section-profile-title"
                style={{ marginBottom: "35px" }}
              >
                {t("Recent Activity")}
              </h2>

              {!loading &&
              ((userData.videos.length > 0 && activeTab === "videos") ||
                (userData.posts.length > 0 && activeTab === "posts")) ? (
                <div className="sort-options-profile-container">
                  <ul className="sort-options-profile">
                    <li
                      className={activeSort === "Latest" ? "active" : ""}
                      onClick={() => handleSortChange("Latest")}
                    >
                      {t("Latest")}
                    </li>
                    <li
                      className={activeSort === "Oldest" ? "active" : ""}
                      onClick={() => handleSortChange("Oldest")}
                    >
                      {t("Oldest")}
                    </li>
                    <li
                      className={activeSort === "Most Liked" ? "active" : ""}
                      onClick={() => handleSortChange("Most Liked")}
                    >
                      {t("Most Liked")}
                    </li>
                  </ul>
                </div>
              ) : null}

              <div className="tab-profile-buttons">
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`btn ${
                    activeTab === "posts" ? "btn-primary" : "btn-secondary"
                  }`}
                  style={{
                    flex: 1,
                    margin: 0,
                    border: "none",
                  }}
                >
                  {userData.totalPosts || 0} {t("Posts")}
                </button>
                <button
                  onClick={() => setActiveTab("videos")}
                  className={`btn ${
                    activeTab === "videos" ? "btn-primary" : "btn-secondary"
                  }`}
                  style={{
                    flex: 1,
                    margin: 0,
                    border: "none",
                  }}
                >
                  {userData.totalVideos || 0} {t("Videos")}
                </button>
              </div>
            </div>

            {activeTab === "posts" && (
              <>
                {/* Show refresh indicator at the top when refreshing existing content */}
                {isRefreshing && userData.posts?.length > 0 && (
                  <div
                    style={{
                      position: "sticky",
                      top: "0",
                      zIndex: 10,
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(10px)",
                      padding: "10px",
                      textAlign: "center",
                      borderRadius: "0 0 12px 12px",
                      marginBottom: "10px",
                    }}
                  >
                    <CircleNotch size={20} className="loading-spinner" />
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      {t("Refreshing posts...")}
                    </span>
                  </div>
                )}

                {loading || (userData.posts?.length === 0 && postsLoading) ? (
                  <div className="content-grid">{renderSkeletonCards()}</div>
                ) : userData.posts?.length > 0 ? (
                  <div
                    className="posts-container"
                    style={{ position: "relative" }}
                  >
                    <div className="content-grid">
                      {userData.posts.map((post) => (
                        <PostCard
                          key={`${post._id}-${post.isLiked}-${post.isSaved}`}
                          user={user.userName}
                          avatar={
                            user.profilePic
                              ? user.profilePic
                              : defaultProfilePic
                          }
                          timestamp={new Date(post.createdAt).toLocaleString()}
                          content={post.description}
                          image={post.images}
                          isOwner={true}
                          toggleLikeFunction={() => {
                            toggleLikeApi(user._id, post._id);
                          }}
                          initialLikes={post.likesCount}
                          initialComments={post.commentsCount}
                          Liked={post.isLiked}
                          Saved={post.isSaved}
                          onDelete={() => handleDeleteClick(post._id)}
                          onEdit={() => handleEditClick(post._id)}
                          onCommentClick={() => handleDisplayClick({ post })}
                          toggleSaveFunction={() => handleSaveClick(post._id)}
                          onShareClick={() =>
                            shareUrl(
                              user.userName,
                              post.description || "Check out this post!",
                              `${import.meta.env.VITE_CLIENT_URL}/user/${
                                user.userName
                              }/post/${post._id}`
                            )
                          }
                        />
                      ))}
                    </div>

                    {userData.hasMorePosts && (
                      <div
                        ref={userData.postsObserverRef}
                        className="infinite-scroll-trigger"
                      >
                        {postsLoading && (
                          <CircleNotch size={24} className="loading-spinner" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-section">
                    <img src={postImage} alt="" height="200px" />
                    <h3>{t("Add your first Post")}</h3>
                    <h5>
                      {t("In a world of endless scrolling, one tap changes everything. Press + to birth your digital realm")}
                    </h5>
                    <button onClick={openPostModal}>{t("Add")}</button>
                  </div>
                )}
              </>
            )}

            {activeTab === "videos" && (
              <>
                {/* Show refresh indicator for videos */}
                {isRefreshing && userData.videos?.length > 0 && (
                  <div
                    style={{
                      position: "sticky",
                      top: "0",
                      zIndex: 10,
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(10px)",
                      padding: "10px",
                      textAlign: "center",
                      borderRadius: "0 0 12px 12px",
                      marginBottom: "10px",
                    }}
                  >
                    <CircleNotch size={20} className="loading-spinner" />
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      {t("Refreshing videos...")}
                    </span>
                  </div>
                )}

                {loading || (userData.videos?.length === 0 && videosLoading) ? (
                  <div className="content-grid">{renderSkeletonCards()}</div>
                ) : userData.videos?.length > 0 ? (
                  <div
                    className="videos-container"
                    style={{ position: "relative" }}
                  >
                    <div className="content-grid">
                      {userData.videos.map((video) => {
                        return (
                          <VideoCard
                            key={`${video._id}-${video.isSaved}`}
                            thumbnail={getCloudinaryThumbnail(video.videoUrl)}
                            duration={video.duration}
                            isOwner={"true"}
                            onEdit={() => handleEditVideoClick(video._id)}
                            onDelete={() => handleDeleteVideoClick(video._id)}
                            onDisplayClick={() =>
                              handleDisplayVideoClick({ video })
                            }
                            Saved={video.isSaved}
                            toggleSaveFunction={() =>
                              handleSaveVideoClick(video._id)
                            }
                          />
                        );
                      })}
                    </div>

                    {userData.hasMoreVideos && (
                      <div
                        ref={userData.videosObserverRef}
                        className="infinite-scroll-trigger"
                      >
                        {videosLoading && (
                          <CircleNotch size={24} className="loading-spinner" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-section">
                    <img src={standindPerson} alt="" height="200px" />
                    <h3>{t("Create your first Video")}</h3>
                    <h5>
                      {t("Start building your community by tapping the + button to upload your first video")}
                    </h5>
                    <button onClick={openVideoModal}>{t("Create")}</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
