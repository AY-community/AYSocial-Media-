import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "./Saved.css";
import { CircleNotch } from "phosphor-react";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import Footer from "../../Layouts/MainLayouts/Footer";
import PostCard from "../../Layouts/PostLayouts/PostCard";
import VideoCard from "../../Layouts/PostLayouts/VideoCard";
import DisplayModal from "../../Layouts/PostLayouts/DisplayPostModal";
import DisplayVideoModal from "../../Layouts/VideoLayouts/DisplayVideoModal";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

import { useAuth } from "../../Context/AuthContext";
import { getCloudinaryThumbnail } from "../../Utils/getThumbnailByVideoUrl";
import { shareUrl } from "../../Utils/shareUrl";
import { SkeletonCard } from "../../Components/Post&Video/SkeletonCard";

import Cat from "../../assets/Brazuca - Cat.png";
import Cat2 from "../../assets/Brazuca - Cat 2.png";

  import SEO from '../../Utils/SEO';

export default function Saved() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("posts");
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [postsPage, setPostsPage] = useState(0);
  const [videosPage, setVideosPage] = useState(0);
  const [showDisplayModal, setShowDisplayModal] = useState(false);
  const [showDisplayVideoModal, setShowDisplayVideoModal] = useState(false);
  const [postDisplayData, setPostDisplayData] = useState(null);
  const [videoDisplayData, setVideoDisplayData] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [isInitialPostsLoaded, setIsInitialPostsLoaded] = useState(false);
  const [isInitialVideosLoaded, setIsInitialVideosLoaded] = useState(false);

  const [totalPosts, setTotalPosts] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [error, setError] = useState(null);

  const postsObserverRef = useRef();
  const videosObserverRef = useRef();

  const POSTS_PER_PAGE = 6;
  const VIDEOS_PER_PAGE = 6;

  const getPosts = useCallback(
    async (page = 0) => {
      try {
        if (page > 0) setLoadingMorePosts(true);

        const response = await fetch(
          `${import.meta.env.VITE_API}/posts/saved/${
            user.userName
          }?currentUserId=${user._id}&page=${page}&limit=${POSTS_PER_PAGE}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          const sortedPosts = data.posts.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );

          if (page === 0) {
            setPosts(sortedPosts);
            setIsInitialPostsLoaded(true);
            setTotalPosts(data.totalPosts);
          } else {
            setPosts((prev) => {
              const existingIds = new Set(prev.map((post) => post._id));
              const newPosts = sortedPosts.filter(
                (post) => !existingIds.has(post._id)
              );
              return [...prev, ...newPosts];
            });
          }

          setHasMorePosts(data.hasMore);
        } else {
          setHasMorePosts(false);
        }
      } catch (err) {
        console.error("Failed to fetch saved posts:", err.message);
        setHasMorePosts(false);
        setError("Failed to load saved posts");
      } finally {
        if (page > 0) setLoadingMorePosts(false);
      }
    },
    [user.userName, user._id]
  );

  const getVideos = useCallback(
    async (page = 0) => {
      try {
        if (page > 0) setLoadingMoreVideos(true);

        const response = await fetch(
          `${import.meta.env.VITE_API}/videos/saved/${
            user.userName
          }?currentUserId=${user._id}&page=${page}&limit=${VIDEOS_PER_PAGE}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          const sortedVideos = data.videos.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );

          if (page === 0) {
            setVideos(sortedVideos);
            setIsInitialVideosLoaded(true);
            setTotalVideos(data.totalVideos);
          } else {
            setVideos((prev) => {
              // Create a Set of existing video IDs to check for duplicates
              const existingIds = new Set(prev.map((video) => video._id));

              // Filter out any videos that already exist
              const newVideos = sortedVideos.filter(
                (video) => !existingIds.has(video._id)
              );

              console.log(
                `Adding ${newVideos.length} new videos (${
                  sortedVideos.length
                } received, ${
                  sortedVideos.length - newVideos.length
                } duplicates filtered)`
              );

              return [...prev, ...newVideos];
            });
          }

          setHasMoreVideos(data.hasMore);
        } else {
          setHasMoreVideos(false);
        }
      } catch (err) {
        console.error("Failed to fetch videos:", err.message);
        setHasMoreVideos(false);
        setError("Failed to load videos");
      } finally {
        if (page > 0) setLoadingMoreVideos(false);
      }
    },
    [user.userName, user._id]
  );

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
        setPosts((prevPosts) =>
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

      if (!response.ok) {
        console.error(data.error);
      }
    } catch (err) {
      console.error(err.error);
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
        setPosts((prevPosts) =>
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
      console.error("internal server error");
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
        setVideos((prevVideos) =>
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
      console.error("internal server error");
    }
  };

  const handleDisplayClick = (postData, postOwner) => {
    setShowDisplayModal(true);
    setPostDisplayData({
      ...postData,
      owner: postOwner,
    });
  };

  const handleDisplayVideoClick = (videoData, videoOwner) => {
    setShowDisplayVideoModal(true);
    setVideoDisplayData({
      ...videoData,
      owner: videoOwner,
    });
  };

  const handleClose = (likeData, saveData) => {
    setShowDisplayModal(false);

    if (likeData) {
      setPosts((prevPosts) =>
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
      setPosts((prevPosts) =>
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
      setVideos((prevVideos) =>
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
      setVideos((prevVideos) =>
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

  const loadMorePosts = useCallback(() => {
    if (hasMorePosts && !loadingMorePosts && posts.length > 0) {
      const nextPage = postsPage + 1;
      setPostsPage(nextPage);
      getPosts(nextPage);
    }
  }, [hasMorePosts, loadingMorePosts, posts.length, postsPage, getPosts]);

  const loadMoreVideos = useCallback(() => {
    if (hasMoreVideos && !loadingMoreVideos && videos.length > 0) {
      const nextPage = videosPage + 1;
      setVideosPage(nextPage);
      getVideos(nextPage);
    }
  }, [hasMoreVideos, loadingMoreVideos, videos.length, videosPage, getVideos]);

  useEffect(() => {
    const resetAndFetch = async () => {
      setPosts([]);
      setVideos([]);
      setPostsPage(0);
      setVideosPage(0);
      setHasMorePosts(true);
      setHasMoreVideos(true);
      setLoadingMorePosts(false);
      setLoadingMoreVideos(false);
      setIsInitialPostsLoaded(false);
      setIsInitialVideosLoaded(false);

      await getPosts(0);
      await getVideos(0);
    };
    resetAndFetch();
  }, [getPosts, getVideos]);

  useEffect(() => {
    const postsObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log("Posts infinite scroll triggered");
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    const videosObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log("Videos infinite scroll triggered");
          loadMoreVideos();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    if (
      activeTab === "posts" &&
      postsObserverRef?.current &&
      posts.length > 0 &&
      hasMorePosts
    ) {
      console.log("Posts observer attached");
      postsObserver.observe(postsObserverRef.current);
    }

    if (
      activeTab === "videos" &&
      videosObserverRef?.current &&
      videos.length > 0 &&
      hasMoreVideos
    ) {
      console.log("Videos observer attached");
      videosObserver.observe(videosObserverRef.current);
    }

    return () => {
      postsObserver.disconnect();
      videosObserver.disconnect();
    };
  }, [
    activeTab,
    posts.length,
    videos.length,
    hasMorePosts,
    hasMoreVideos,
    loadMorePosts,
    loadMoreVideos,
  ]);

  const renderSkeletonCards = (count = 6) => {
    return Array(count)
      .fill(0)
      .map((_, index) => <SkeletonCard key={`skeleton-${index}`} />);
  };

  return (
    <>
        <SEO  
  title="Your Saved Posts and Videos"
  description="View and manage all your saved posts and videos in one place. Easily access your favorite content whenever you want."
  url={`${window.location.origin}/saved`}
/>

      
      <Header />
      <MainSideBar />
      <BottomNav />
      <DisplayModal
        display={showDisplayModal}
        toggleModal={handleClose}
        data={postDisplayData}
        userData={postDisplayData?.owner || user}
      />

      <DisplayVideoModal
        display={showDisplayVideoModal}
        toggleModal={handleVideoClose}
        data={videoDisplayData}
        userData={videoDisplayData?.owner || user}
      />

      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="saved-header">
            <h1>{t("Saved")}</h1>
            <div
              className="tab-profile-buttons"
              style={{ marginBottom: "0px" }}
            >
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
                {totalPosts} {t("Posts")}
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
                {totalVideos} {t("Videos")}
              </button>
            </div>
          </div>

          <div className="saved-content content-section">
            {activeTab === "posts" &&
              (!isInitialPostsLoaded ? (
                <div className="content-grid">{renderSkeletonCards()}</div>
              ) : posts.length > 0 ? (
                <div
                  className="posts-container"
                  style={{ position: "relative" }}
                >
                  <div className="content-grid">
                    {posts.map((post) => (
                      <PostCard
                        key={`${post._id}-${post.isLiked}-${post.isSaved}`}
                        user={post.user.userName}
                        avatar={
                          post.user.profilePic
                            ? post.user.profilePic
                            : defaultProfilePic
                        }
                        timestamp={new Date(post.createdAt).toLocaleString()}
                        content={post.description}
                        image={post.images}
                        isOwner={false}
                        toggleLikeFunction={() => {
                          toggleLikeApi(user._id, post._id);
                        }}
                        initialLikes={post.likesCount}
                        initialComments={post.commentsCount}
                        Liked={post.isLiked}
                        Saved={post.isSaved}
                        onCommentClick={() =>
                          handleDisplayClick(
                            { post },
                            {
                              userName: post.user.userName,
                              profilePic: post.user.profilePic,
                            }
                          )
                        }
                        toggleSaveFunction={() => handleSaveClick(post._id)}
                        onShareClick={() =>
                          shareUrl(
                            post.user.userName,
                            post.description || "Check out this post!",
                            `${import.meta.env.VITE_CLIENT_URL}/user/${
                              post.user.userName
                            }/post/${post._id}`
                          )
                        }
                      />
                    ))}
                  </div>

                  {hasMorePosts && posts.length > 0 && (
                    <div
                      ref={postsObserverRef}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        background: "transparent",
                        padding: "20px",
                      }}
                    >
                      <CircleNotch size={30} className="loading-trigger" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-section">
                  <img width={"150px"} src={Cat} alt="No saved posts" />
                  <h3>{t("No saved posts")}</h3>
                  <h5>{t("You haven't saved any posts yet. Check back later!")}</h5>
                </div>
              ))}

            {activeTab === "videos" &&
              (!isInitialVideosLoaded ? (
                <div className="content-grid">{renderSkeletonCards()}</div>
              ) : videos.length > 0 ? (
                <div
                  className="videos-container"
                  style={{ position: "relative" }}
                >
                  <div className="content-grid">
                    {videos.map((video) => (
                      <VideoCard
                        key={video._id}
                        thumbnail={getCloudinaryThumbnail(video.videoUrl)}
                        duration={video.duration}
                        isOwner={false}
                        onDisplayClick={() =>
                          handleDisplayVideoClick(
                            { video },
                            {
                              userName: video.user.userName,
                              profilePic: video.user.profilePic,
                            }
                          )
                        }
                        Saved={video.isSaved}
                        toggleSaveFunction={() =>
                          handleSaveVideoClick(video._id)
                        }
                      />
                    ))}
                  </div>

                  {hasMoreVideos && videos.length > 0 && (
                    <div
                      ref={videosObserverRef}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        background: "transparent",
                        padding: "20px",
                      }}
                    >
                      <CircleNotch size={30} className="loading-trigger" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-section">
                  <img width={"150px"} src={Cat2} alt="No saved videos" />
                  <h3>{t("No saved videos")}</h3>
                  <h5>{t("You haven't saved any videos yet. Check back later!")}</h5>
                </div>
              ))}
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
}