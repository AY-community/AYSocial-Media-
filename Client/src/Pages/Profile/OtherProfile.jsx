import "../../Layouts/Layouts.css";
import "./profile.css";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import { MapPin, CircleNotch } from "phosphor-react";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import Planning from "../../assets/Brazuca - Planning.png";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import PostCard from "../../Layouts/PostLayouts/PostCard";
import VideoCard from "../../Layouts/PostLayouts/VideoCard";
import DisplayModal from "../../Layouts/PostLayouts/DisplayPostModal";
import standindPerson from "../../assets/Brazuca - airport.png";
import standingPerson2 from "../../assets/Brazuca - Planning (3).png";
import DisplayVideoModal from "../../Layouts/VideoLayouts/DisplayVideoModal";
import ContentModal from "../../Layouts/ProfileLayouts/ContentModal";
import FollowerModal from "../../Layouts/ProfileLayouts/FollowerModal";
import FollowingModal from "../../Layouts/ProfileLayouts/FollowingModal";
import BlockConfirmationModal from "../../Layouts/ProfileLayouts/BlockConfirmationModal";
import { getCloudinaryThumbnail } from "../../Utils/getThumbnailByVideoUrl";
import { shareUrl } from "../../Utils/shareUrl";
import { SkeletonCard } from "../../Components/Post&Video/SkeletonCard";
import { useTranslation } from "react-i18next";
import SEO from '../../Utils/SEO';

export default function OtherProfile({ userData, loading }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [flagUrl, setFlagUrl] = useState("🌐");
  const [activeTab, setActiveTab] = useState("posts");
  const [activeSort, setActiveSort] = useState("Latest");
  const [showDisplayModal, setShowDisplayModal] = useState(false);
  const [showDisplayVideoModal, setShowDisplayVideoModal] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [postDisplayData, setPostDisplayData] = useState(null);
  const [videoDisplayData, setVideoDisplayData] = useState(null);
  const [showModalContentModal, setShowModalContentModal] = useState(false);
  const [following, setFollowing] = useState(userData.isFollowing);
  const [followBack, setFollowBack] = useState(userData.isFollowingBack);
  const [hasSentRequest, setHasSentRequest] = useState(
    userData.hasSentRequest || false
  );
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const { user } = useAuth();
  const { userName, postId, videoId } = useParams();

  useEffect(() => {
    setFollowing(userData.isFollowing);
    setFollowBack(userData.isFollowingBack);
    setHasSentRequest(userData.hasSentRequest || false);
  }, [userData.isFollowing, userData.isFollowingBack, userData.hasSentRequest]);

  if ((postId && !userName) || (videoId && !userName)) {
    return <div>{t("Invalid URL")}</div>;
  }

  const toggleFollowStatus = async () => {
    const wasFollowing = following;
    const hadSentRequest = hasSentRequest;

    if (wasFollowing) {
      setFollowing(false);
    } else if (hadSentRequest) {
      setHasSentRequest(false);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/toggle-follow-status/${userData.id}/${
          user._id
        }`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setFollowing(data.isFollowing);

      if (data.requestStatus === "pending") {
        setHasSentRequest(true);
      } else {
        setHasSentRequest(false);
      }
    } catch (error) {
      setFollowing(wasFollowing);
      setHasSentRequest(hadSentRequest);
    }
  };

  const getFollowButtonText = () => {
    if (isBlocked) return t("Blocked");
    if (following) return t("Unfollow");
    if (hasSentRequest) return t("Requested");
    if (followBack) return t("Follow Back");
    return t("Follow");
  };

  const getFollowButtonClass = () => {
    if (isBlocked) return "btn btn-secondary";
    if (following) return "btn btn-secondary";
    if (hasSentRequest) return "btn btn-requested";
    return "btn btn-primary";
  };

  const handleOpenBlockModal = () => {
    setShowBlockModal(true);
    setShowOptions(false);
  };

  const handleBlock = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API}/block/${userData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setShowBlockModal(false);
        return;
      }
      
      setIsBlocked(true);
      setFollowing(false);
      setHasSentRequest(false);
      setShowBlockModal(false);
      
      if (typeof userData.setPosts === 'function') userData.setPosts([]);
      if (typeof userData.setVideos === 'function') userData.setVideos([]);
    } catch (e) {
      setShowBlockModal(false);
    }
  };

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
    if (!countryName || countryName === "Unknown" || countryName === "unknown") return "🏳️";

    try {
      const cleanName = countryName.trim();
      const response = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(
          cleanName
        )}?fullText=false`
      );

      if (!response.ok) {
        return "🏳️";
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
    const postsObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          userData.loadMorePosts();
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
          userData.loadMoreVideos();
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
      userData.postsObserverRef?.current &&
      userData.posts.length > 0 &&
      userData.hasMorePosts
    ) {
      postsObserver.observe(userData.postsObserverRef.current);
    }

    if (
      activeTab === "videos" &&
      userData.videosObserverRef?.current &&
      userData.videos.length > 0 &&
      userData.hasMoreVideos
    ) {
      videosObserver.observe(userData.videosObserverRef.current);
    }

    return () => {
      postsObserver.disconnect();
      videosObserver.disconnect();
    };
  }, [
    activeTab,
    userData.posts.length,
    userData.videos.length,
    userData.hasMorePosts,
    userData.hasMoreVideos,
    userData.loadMorePosts,
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
      description={`Explore ${userData.userName}'s profile on AYSocial. View their posts, videos, followers, and more.`}
      image={`${userData.profilePic}`}

      url={`${window.location.origin}/user/${userData.userName}`}
    />
      <DisplayModal
        display={showDisplayModal}
        toggleModal={handleClose}
        data={postDisplayData}
        userData={userData}
      />

      <DisplayVideoModal
        display={showDisplayVideoModal}
        toggleModal={handleVideoClose}
        data={videoDisplayData}
        userData={userData}
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
        id={userData.id}
        isOwner={false}
        loggedInUserId={user._id}
      />
      <FollowingModal
        display={showFollowingModal}
        toggleModal={() => setShowFollowingModal(false)}
        id={userData.id}
        isOwner={false}
        loggedInUserId={user._id}
      />

      <BlockConfirmationModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleBlock}
        username={userData.userName}
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
                  backgroundImage:
                    userData.coverPic?.type === "image" &&
                    userData.coverPic?.image
                      ? `url(${userData.coverPic.image})`
                      : !userData.coverPic?.type
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "none",
                  backgroundColor:
                    userData.coverPic?.type === "color" &&
                    userData.coverPic?.color
                      ? userData.coverPic.color
                      : "transparent",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
              <div className="profile-info">
                <div
                  className="profile-avatar-large"
                  style={{
                    backgroundImage: userData.profilePic
                      ? `url(${userData.profilePic})`
                      : `url(${defaultProfilePic})`,

                    backgroundRepeat: "no-repeat",

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
                        {userData.content?.total || 0}
                      </span>
                      <span className="stat-label">{t("Content")}</span>
                    </div>
                  </div>
                  {userData.bio ? (
                    <p className="profile-bio">{userData.bio}</p>
                  ) : null}
                  <div className="profile-actions" style={{ position: 'relative' }}>
                    <button
                      className={getFollowButtonClass()}
                      onClick={!isBlocked ? toggleFollowStatus : undefined}
                      disabled={isBlocked}
                    >
                      {getFollowButtonText()}
                    </button>
                    <button className="btn btn-secondary" disabled={isBlocked} 
                      onClick={() => navigate(`/chat?userId=${userData.id}`)}
                    >{t("Message")}</button>
                    <div className="options-container">
                      <button
                        className="btn btn-icon options-button"
                        aria-label="Options"
                        onClick={() => setShowOptions((s) => !s)}
                      >
                        ⋯
                      </button>
                      {showOptions && (
                        <div className="options-dropdown">
                          <button className="dropdown-item danger" onClick={handleOpenBlockModal}>{t('Block')}</button>
                          <button className="dropdown-item" onClick={() => { 
                            setShowOptions(false); 
                            navigate(`/settings/report/${userData.id}`);
                          }}>{t('Report')}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {userData.isPrivate && !following ? (
              <div className="private-profile-container">
                <img
                  src={standingPerson2}
                  alt="Private Account"
                  height="200px"
                />
                <h3>{t("This Account is Private")}</h3>
                <p>{t("Follow this account to see their photos and videos.")}</p>
              </div>
            ) : (
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

                  {(userData.videos.length > 0 && activeTab === "videos") ||
                  (userData.posts.length > 0 && activeTab === "posts") ? (
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
                          className={
                            activeSort === "Most Liked" ? "active" : ""
                          }
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

                {activeTab === "posts" &&
                  (loading || postsLoading ? (
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
                            user={userData.userName}
                            avatar={
                              userData.profilePic
                                ? userData.profilePic
                                : defaultProfilePic
                            }
                            timestamp={new Date(
                              post.createdAt
                            ).toLocaleString()}
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
                            onCommentClick={() => handleDisplayClick({ post })}
                            toggleSaveFunction={() => handleSaveClick(post._id)}
                            onShareClick={() =>
                              shareUrl(
                                userData.userName,
                                post.description || "Check out this post!",
                                `${import.meta.env.VITE_CLIENT_URL}/user/${
                                  userData.userName
                                }/post/${post._id}`
                              )
                            }
                          />
                        ))}
                      </div>

                      {userData.hasMorePosts && userData.posts.length > 0 && (
                        <div
                          ref={userData.postsObserverRef}
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
                      <img src={Planning} alt="" height="200px" />
                      <h3>{t("No Post yet")}</h3>
                      <h5>
                        {t("No posts to show yet. Check back later for updates!")}
                      </h5>
                    </div>
                  ))}
                {activeTab === "videos" &&
                  (loading || videosLoading ? (
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
                              key={video._id}
                              thumbnail={getCloudinaryThumbnail(video.videoUrl)}
                              duration={video.duration}
                              isOwner={false}
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

                      {userData.hasMoreVideos && userData.videos.length > 0 && (
                        <div
                          ref={userData.videosObserverRef}
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            background: "transparent",
                            padding: "20px",
                          }}
                        >
                          <CircleNotch size={30} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-section">
                      <img src={standindPerson} alt="" height="200px" />
                      <h3>{t("No Video yet")}</h3>
                      <h5>
                        {t("No videos to show yet. Check back later for updates!")}
                      </h5>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
