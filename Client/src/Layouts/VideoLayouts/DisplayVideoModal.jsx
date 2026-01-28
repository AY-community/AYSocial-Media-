import formatTime from "../../Utils/FormatTime";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

import {
  PaperPlaneTilt,
  PaperPlaneRight,
  Heart,
  Trash,
  Play,
  Pause,
  SpeakerHigh,
  SpeakerX,
  ChatCircle,
  Share,
  SpinnerGap,
  BookmarkSimple,
  X,
} from "phosphor-react";
import { useAuth } from "../../Context/AuthContext";
import { shareUrl } from "../../Utils/shareUrl";

export default function DisplayVideoModal({
  display,
  toggleModal,
  data,
  userData,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const commentRefs = useRef({});
  const triggerRef = useRef();
  const commentsSectionRef = useRef(null);
  const videoRef = useRef(null);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentLoading, setCommentLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({}); 
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get comment ID from URL query
  const searchParams = new URLSearchParams(location.search);
  const highlightCommentId = searchParams.get("comment");

  useEffect(() => {
    if (data?.video?.isSaved !== undefined) {
      setSaved(data?.video?.isSaved);
    }
  }, [data?.video?.isSaved]);

  const handleCancel = () => {
    const likeData = {
      videoId: data.video._id,
      isLiked: isLiked,
      likesCount: likesCount,
    };

    const saveData = {
      videoId: data.video._id,
      isSaved: saved,
    };

    toggleModal(likeData, saveData);
    
    // Reset all state when closing modal
    setPage(0);
    setComments([]);
    setHasMore(true);
    setCommentLoading(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setReplyingToCommentId(null);
    setReplyText("");
    setExpandedReplies({});
    
    // Pause video when closing
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      videoRef.current.muted = newMutedState;
    }
  };

  const formatVideoTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const DisplayCommentApi = async () => {
    if (commentLoading || !hasMore) return;

    setCommentLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/get-comments/${data.video?._id}/${
          user._id
        }/?page=${page}`
      );

      if (response.ok) {
        const responseData = await response.json();

        const newComments = responseData.data.map((comment) => ({
          id: comment._id,
          user: {
            _id: comment.user?._id,
            name: comment.user?.userName,
            avatar: comment.user?.profilePic || defaultProfilePic,
          },
          text: comment.content,
          timestamp: formatTime(comment.createdAt),
          likes: comment.likesCount || 0,
          liked: comment.isLiked,
          replies: (comment.replies || []).map((reply) => ({
            id: reply._id,
            user: {
              _id: reply.user?._id,
              name: reply.user?.userName,
              avatar: reply.user?.profilePic || defaultProfilePic,
            },
            text: reply.content,
            timestamp: formatTime(reply.createdAt),
            likes: reply.likesCount || 0,
            liked: reply.isLiked || false,
          })),
        }));

        if (page === 0) {
          setComments(newComments);
          setTotalComments(responseData.totalComments);
        } else {
          setComments((prev) => [...prev, ...newComments]);
        }

        setHasMore(responseData.hasMore);
        setPage((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !commentLoading && hasMore) {
          DisplayCommentApi();
        }
      },
      {
        root: null,
        rootMargin: "20px",
        threshold: 0.1,
      }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => {
      if (triggerRef.current) {
        observer.unobserve(triggerRef.current);
      }
      observer.disconnect();
    };
  }, [commentLoading, hasMore, page]);

  const handleVideoLike = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-like/${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoId: data.video._id,
          }),
        }
      );
      if (response.ok) {
        // update state optimistically after server acknowledgement
        const newLike = !isLiked;
        setIsLiked(newLike);
        setLikesCount((prev) => (newLike ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/add-comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            videoId: data.video?._id,
            userId: user._id,
            content: commentText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const newComment = {
        id: result.commentId,
        user: {
          _id: userData._id,
          name: userData?.userName || "You",
          avatar: userData?.profilePic,
        },
        text: commentText.trim(),
        timestamp: "now",
        likes: 0,
        liked: false,
      };

      setComments([newComment, ...comments]);
      setCommentText("");
      setTotalComments((count) => count + 1);
    } catch (err) {
      console.error("Error adding comment:", err.message);
    }
  };

  const handleCommentLike = async (commentId, userId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-like-comment/${userId}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ commentId: commentId }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        
        setComments(
          comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  liked: responseData.isLiked,
                  likes: responseData.likesCount,
                }
              : comment
          )
        );
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const deleteCommentApi = async (videoId, commentId) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/videos/delete-comment/${videoId}/${commentId}`,
        {
          method: "DELETE",
        }
      );
      setComments(comments.filter((comment) => comment.id !== commentId));
      setTotalComments((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err.message);
    }
  };

  const submitReplyApi = async (videoId, commentId, replyContent) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/add-reply/${videoId}/${commentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user._id,
            content: replyContent,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        setComments((prevComments) =>
          prevComments.map((comment) => {
            if (comment.id === commentId) {
              const newReply = {
                id: result.replyId,
                user: {
                  _id: user._id,
                  name: user?.userName || "You",
                  avatar: user?.profilePic || defaultProfilePic,
                },
                text: replyContent,
                timestamp: "now",
                likes: 0,
                liked: false,
              };
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply],
              };
            }
            return comment;
          })
        );

        setReplyingToCommentId(null);
        setReplyText("");
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const deleteReplyApi = async (videoId, commentId, replyId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API}/videos/delete-reply/${videoId}/${commentId}/${replyId}`,
        {
          method: "DELETE",
        }
      );

      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: (comment.replies || []).filter((r) => r.id !== replyId),
            };
          }
          return comment;
        })
      );
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleReplyLike = async (commentId, replyId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-like-reply/${data.video._id}/${commentId}/${replyId}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ userId: user._id }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to toggle reply like: ${response.statusText}`);
      }

      const data_response = await response.json();

      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: (comment.replies || []).map((reply) =>
                reply.id === replyId
                  ? {
                      ...reply,
                      liked: data_response.isLiked,
                      likes: data_response.likesCount,
                    }
                  : reply
              ),
            };
          }
          return comment;
        })
      );
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleSaveClickApi = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-save/${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoId: data.video._id }),
        }
      );

      if (response.ok) {
        setSaved(!saved);
      }
    } catch (err) {
      console.error("internal server error");
    }
  };

  // Initialize when video id changes and reset all state
  useEffect(() => {
    if (data?.video?._id) {
      // Reset state when video changes
      setPage(0);
      setComments([]);
      setHasMore(true);
      setCommentLoading(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setReplyingToCommentId(null);
      setReplyText("");
      setExpandedReplies({});
      
      // Set like state
      setIsLiked(data.video.isLiked || false);
      setLikesCount(data.video.likesCount || 0);
      
      // Load comments for the new video
      DisplayCommentApi();
      
      // Pause video when switching
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [data?.video?._id]);

  useEffect(() => {
    if (highlightCommentId && comments.length > 0) {
      const commentExists = comments.some((c) => c.id === highlightCommentId);

      if (!commentExists && hasMore && !commentLoading) {
        console.log("Comment not found, loading more...");
        DisplayCommentApi();
        return;
      }

      if (commentExists && commentRefs.current[highlightCommentId]) {
        setTimeout(() => {
          const element = commentRefs.current[highlightCommentId];

          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            element.style.borderLeft = "3px solid var(--primary-color)";
            element.style.paddingLeft = "8px";
            element.style.transition = "all 0.3s ease";

            setTimeout(() => {
              element.style.borderLeft = "none";
              element.style.paddingLeft = "0";
            }, 3000);
          }
        }, 500);
      }
    }
  }, [highlightCommentId, comments, hasMore, commentLoading]);
  
  return (
    <>
      <div
        className="modal-overlay"
        style={{ display: display ? "flex" : "none" }}
      >
        <div className="modal display-modal">
          <div className="modal-header modal-display-header">
            <div className="display-modal-user">
              <div className="display-modal-user-avatar">
                <img
                  onClick={() => {
                    navigate(`/user/${userData?.userName}`);
                    handleCancel();
                  }}
                  src={
                    userData?.profilePic
                      ? userData.profilePic
                      : defaultProfilePic
                  }
                  width="100%"
                  style={{ borderRadius: "50%", cursor: "pointer" }}
                  alt="Avatar Image"
                />
              </div>
              <div>
                <div
                  className="display-modal-user-name"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    navigate(`/user/${userData?.userName}`);
                    handleCancel();
                  }}
                >
                  {userData?.userName}
                </div>
                <div className="display-modal-user-time">
                  {formatTime(data?.video.createdAt)}
                </div>
              </div>
            </div>
            <button className="close-btn" onClick={() => handleCancel()}>
              &times;
            </button>
          </div>

          <div className="display-modal-post-content">
            <p>{data?.video.description}</p>
          </div>

          <div className="custom-video-container">
            <video
              ref={videoRef}
              className="custom-video"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              src={data?.video.videoUrl}
            />

            {!isPlaying && (
              <div className="video-play-overlay">
                <button
                  onClick={togglePlayPause}
                  className="play-button-center"
                >
                  <Play size={40} weight="fill" />
                </button>
              </div>
            )}

            <div className="video-controls">
              <div className="video-controls-content">
                <span className="video-time">
                  {formatVideoTime(currentTime)}
                </span>

                <button onClick={toggleMute} className="mute-button">
                  {isMuted ? <SpeakerX size={20} /> : <SpeakerHigh size={20} />}
                </button>
              </div>
            </div>
          </div>

          <div className="social-actions">
            <button
              className={`social-btn like-btn ${isLiked ? "liked" : ""}`}
              onClick={handleVideoLike}
            >
              <Heart size={24} weight={isLiked ? "fill" : "bold"} />
              <span className="social-count">{likesCount}</span>
            </button>

            <button
              className="social-btn comment-btn"
              onClick={scrollToComments}
            >
              <ChatCircle size={24} weight="bold" />
              <span className="social-count">{totalComments}</span>
            </button>

            <button
              className="social-btn share-btn"
              onClick={() =>
                shareUrl(
                  userData.userName,
                  data?.video.description || "Check out this post!",
                  `${import.meta.env.VITE_CLIENT_URL}/user/${
                    userData.userName
                  }/video/${data?.video._id}`
                )
              }
            >
              <Share size={24} weight="bold" />
              <span style={{ fontSize: "0.9rem" }}>{t("Share")}</span>
            </button>

            <button
              className="social-btn save-btn"
              onClick={handleSaveClickApi}
            >
              <BookmarkSimple size={30} weight={saved ? "fill" : "bold"} />
              <span style={{ fontSize: "0.9rem" }}> </span>
            </button>
          </div>

          <div className="comment-input-container">
            <form
              onSubmit={handleCommentSubmit}
              className="comment-input-section"
            >
              <div className="comment-input-avatar">
                <img
                  src={
                    userData?.profilePic
                      ? userData.profilePic
                      : defaultProfilePic
                  }
                  alt="avatar image"
                  width="35px"
                  style={{ borderRadius: "50%" }}
                />
              </div>
              <div className="comment-input-wrapper">
                <input
                  type="text"
                  className="comment-input"
                  placeholder={t("Add a comment...")}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength="100"
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={commentText ? false : true}
                >
                  <PaperPlaneTilt size={22} weight="fill" />
                </button>
              </div>
            </form>
          </div>

          <div className="comment-title">
            <h3>{t("Comments")} ({totalComments})</h3>
          </div>

          <div
            className="comments-section"
            id="comments-section"
            ref={commentsSectionRef}
          >
            {comments.length > 0 ? (
              <>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="comment"
                    ref={(el) => (commentRefs.current[comment.id] = el)}
                  >
                    <div className="comment-avatar">
                      <img
                        onClick={() => {
                          navigate(`/user/${comment.user.name}`);
                          handleCancel();
                        }}
                        src={comment.user.avatar || defaultProfilePic}
                        alt="avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                        }}
                      />
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span
                          className="comment-user"
                          onClick={() => {
                            navigate(`/user/${comment.user.name}`);
                            handleCancel();
                          }}
                        >
                          {comment.user.name}
                        </span>
                        <span className="comment-time">
                          {comment.timestamp}
                        </span>
                        {comment.user._id === user._id ? (
                          <button
                            className="comment-delete"
                            onClick={() =>
                              deleteCommentApi(data.video?._id, comment.id)
                            }
                          >
                            <Trash size={16} />
                          </button>
                        ) : null}
                      </div>
                      <div className="comment-text">{comment.text}</div>
                      <div className="comment-actions">
                        <button
                          className={`comment-like ${
                            comment.liked ? "liked" : ""
                          }`}
                          onClick={() =>
                            handleCommentLike(comment.id, user._id)
                          }
                        >
                          <Heart
                            size={14}
                            weight={comment.liked ? "fill" : "regular"}
                          />
                          <span>{comment.likes}</span>
                        </button>
                        <button
                          className="comment-reply"
                          onClick={() => setReplyingToCommentId(comment.id)}
                        >
                          {t("Reply")}
                        </button>
                      </div>
                      {replyingToCommentId === comment.id && (
                        <div className="reply-input-section">
                          <input
                            type="text"
                            className="reply-input"
                            placeholder={`${t("Reply to")} ${comment.user.name}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && replyText.trim()) {
                                submitReplyApi(
                                  data.video?._id,
                                  comment.id,
                                  replyText
                                );
                              }
                            }}
                            autoFocus
                          />
                          <button
                            className="reply-submit-btn"
                            onClick={() => {
                              if (replyText.trim()) {
                                submitReplyApi(
                                  data.video?._id,
                                  comment.id,
                                  replyText
                                );
                              }
                            }}
                            disabled={!replyText.trim()}
                          >
                            <PaperPlaneTilt size={16} />
                          </button>
                          <button
                            className="reply-cancel-btn"
                            onClick={() => {
                              setReplyingToCommentId(null);
                              setReplyText("");
                            }}
                          >
                            {t("Cancel")}
                          </button>
                        </div>
                      )}
                      {comment.replies && comment.replies.length > 0 && (
                        <>
                          <button
                            className="show-replies-btn"
                            onClick={() =>
                              setExpandedReplies((prev) => ({
                                ...prev,
                                [comment.id]: !prev[comment.id],
                              }))
                            }
                          >
                            {expandedReplies[comment.id]
                              ? t("Hide replies")
                              : `${t("Show")} ${comment.replies.length} ${
                                  comment.replies.length === 1 ? t("reply") : t("replies")
                                }`}
                          </button>

                          {expandedReplies[comment.id] && (
                            <div className="replies-section">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="reply">
                                  <div className="comment-avatar reply-avatar">
                                    <img
                                      onClick={() => {
                                        navigate(`/user/${reply.user.name}`);
                                        handleCancel();
                                      }}
                                      src={reply.user.avatar || defaultProfilePic}
                                      alt="reply avatar"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: "50%",
                                      }}
                                    />
                                  </div>
                                  <div className="comment-content reply-content">
                                    <div className="comment-header">
                                      <span
                                        className="comment-user"
                                        onClick={() => {
                                          navigate(`/user/${reply.user.name}`);
                                          handleCancel();
                                        }}
                                      >
                                        {reply.user.name}
                                      </span>
                                      <span className="comment-time">
                                        {reply.timestamp}
                                      </span>
                                      {reply.user._id === user._id ? (
                                        <button
                                          className="comment-delete"
                                          onClick={() =>
                                            deleteReplyApi(
                                              data.video?._id,
                                              comment.id,
                                              reply.id
                                            )
                                          }
                                        >
                                          <Trash size={16} />
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="comment-text">
                                      {reply.text}
                                    </div>
                                    <div className="comment-actions">
                                      <button
                                        className={`comment-like ${
                                          reply.liked ? "liked" : ""
                                        }`}
                                        onClick={() =>
                                          handleReplyLike(comment.id, reply.id)
                                        }
                                      >
                                        <Heart
                                          size={14}
                                          weight={
                                            reply.liked ? "fill" : "regular"
                                          }
                                        />
                                        <span>{reply.likes}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div ref={triggerRef} className="comment-loading-trigger">
                    {commentLoading && (
                      <SpinnerGap size={24} className="comment-loading-icon" />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="no-comments-message">
                <p>{t("No comments yet. Be the first to comment!")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}