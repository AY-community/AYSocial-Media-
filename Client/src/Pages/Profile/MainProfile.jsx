import "../../Layouts/Layouts.css";
import "./profile.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import MyProfile from "./MyProfile";
import OtherProfile from "./OtherProfile";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user, loadingUser } = useAuth();
  const { userName } = useParams();
  const [posts, setPosts] = useState([]);
  const [videos, setVideos] = useState([]);
  const { t } = useTranslation();

  const [postsPage, setPostsPage] = useState(0);
  const [videosPage, setVideosPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [isInitialPostsLoaded, setIsInitialPostsLoaded] = useState(false);
  const [isInitialVideosLoaded, setIsInitialVideosLoaded] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);

  const postsObserverRef = useRef();
  const videosObserverRef = useRef();

  const POSTS_PER_PAGE = 6;
  const VIDEOS_PER_PAGE = 6;

  const getPosts = useCallback(
    async (page = 0) => {
      try {
        if (page > 0) setLoadingMorePosts(true);

        const response = await fetch(
          `${import.meta.env.VITE_API}/posts/${userName}?currentUserId=${
            user._id
          }&page=${page}&limit=${POSTS_PER_PAGE}`,
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
        console.error("Failed to fetch posts:", err.message);
        setHasMorePosts(false);
        setError("Failed to load posts");
      } finally {
        if (page > 0) setLoadingMorePosts(false);
      }
    },
    [userName, user._id]
  );

  const getVideos = useCallback(
    async (page = 0) => {
      try {
        if (page > 0) setLoadingMoreVideos(true);

        const response = await fetch(
          `${import.meta.env.VITE_API}/videos/${userName}?currentUserId=${
            user._id
          }&page=${page}&limit=${VIDEOS_PER_PAGE}`,
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
              const existingIds = new Set(prev.map((video) => video._id));
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
    [userName, user._id]
  );

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

  const resetAndFetch = useCallback(async () => {
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
    setLoading(true);
    setError(null);

    if (user?.userName !== userName) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API}/user/${userName}/${user?._id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          navigate("/not-found");
          return;
        }
        const data = await response.json();
        setOtherUser(data);
        if (!data.isPrivate || data.isFollowing) {
          await Promise.all([getPosts(0), getVideos(0)]);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err.message);
        setError("Failed to load profile");
        navigate("/not-found");
        return;
      }
    } else {
      try {
        await Promise.all([getPosts(0), getVideos(0)]);
      } catch (err) {
        console.error("Failed to load content:", err.message);
        setError("Failed to load content");
      }
    }

    setLoading(false);
  }, [userName, user?._id, user?.userName, getPosts, getVideos, navigate]);

  useEffect(() => {
    resetAndFetch();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetAndFetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetAndFetch]);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h2>{t("Something went wrong")}</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>{t("Try Again")}</button>
        </div>
      </div>
    );
  }

  const userData =
    user?.userName === userName
      ? {
          name: user?.name || "",
          userName: user?.userName,
          location: user?.country,

          posts: posts,
          videos: videos,
          totalPosts: totalPosts,
          totalVideos: totalVideos,
          bio: user?.bio || "",
          createdAtDay: user?.createdAt
            ? new Date(user.createdAt).toLocaleString("default", {
                day: "numeric",
              })
            : "",
          createdAtMonth: user?.createdAt
            ? new Date(user.createdAt).toLocaleString("default", {
                month: "long",
              })
            : "",
          createdAtYear: user?.createdAt
            ? new Date(user.createdAt).getFullYear()
            : "",
          profilePic: user?.profilePic,
          coverPic: user?.coverPic,
          following: user?.followingCount,
          followers: user?.followersCount,
          content: {
            posts: user?.contentCount?.posts || 0,
            videos: user?.contentCount?.videos || 0,
            total:
              (user?.contentCount?.posts || 0) +
              (user?.contentCount?.videos || 0),
          },
          setPosts,
          setVideos,
          postsObserverRef,
          videosObserverRef,
          loadingMorePosts,
          loadingMoreVideos,
          hasMorePosts,
          hasMoreVideos,
          loadMorePosts,
          loadMoreVideos,
        }
      : {
          id: otherUser?._id,
          name: otherUser?.name || "",
          userName: otherUser?.userName,
          isPrivate: otherUser?.isPrivate || false,
          isFollowing: otherUser?.isFollowing || false,
          isFollowingBack: otherUser?.isFollowingBack || false,
          hasSentRequest: otherUser?.hasSentRequest || false,
          posts: posts,
          videos: videos,
          totalPosts: totalPosts,
          totalVideos: totalVideos,
          bio: otherUser?.bio || "",
          location: otherUser?.country || "Unknown",
          createdAtDay: otherUser?.createdAt
            ? new Date(otherUser.createdAt).toLocaleString("default", {
                day: "numeric",
              })
            : "",
          createdAtMonth: otherUser?.createdAt
            ? new Date(otherUser.createdAt).toLocaleString("default", {
                month: "long",
              })
            : "",
          createdAtYear: otherUser?.createdAt
            ? new Date(otherUser.createdAt).getFullYear()
            : "",
          profilePic: otherUser?.profilePic,
          coverPic: otherUser?.coverPic,
          following: otherUser?.followingCount,
          followers: otherUser?.followersCount,
          content:
            otherUser?.isPrivate && !otherUser?.isFollowing
              ? { posts: 0, videos: 0, total: 0 }
              : {
                  posts: otherUser?.contentCount?.posts || 0,
                  videos: otherUser?.contentCount?.videos || 0,
                  total:
                    (otherUser?.contentCount?.posts || 0) +
                    (otherUser?.contentCount?.videos || 0),
                },
          setPosts,
          setVideos,
          postsObserverRef,
          videosObserverRef,
          loadingMorePosts,
          loadingMoreVideos,
          hasMorePosts,
          hasMoreVideos,
          loadMorePosts,
          loadMoreVideos,
        };

  return user?.userName === userName ? (
    <MyProfile userData={userData} loading={loading || loadingUser} />
  ) : (
    <OtherProfile userData={userData} loading={loading || loadingUser} />
  );
}
