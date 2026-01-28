import formatTime from "../../Utils/FormatTime";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

import {
  PaperPlaneTilt,
  Heart,
  Trash,
  ChatCircle,
  Share,
  X,
  SpinnerGap,
  BookmarkSimple,
} from "phosphor-react";
import { useAuth } from "../../Context/AuthContext";
import { shareUrl } from "../../Utils/shareUrl";

export default function DisplayModal({ display, toggleModal, data, userData }) {
  const { t } = useTranslation();
  const location = useLocation();
  const commentRefs = useRef({});
  const triggerRef = useRef();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(data?.post.likesCount);
  const [commentLoading, setCommentLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);
  const [saved, setSaved] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({}); 
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get comment ID from URL query
  const searchParams = new URLSearchParams(location.search);
  const highlightCommentId = searchParams.get("comment");

  useEffect(() => {
    if (data?.post?.isSaved !== undefined) {
      setSaved(data.post.isSaved);
    }
  }, [data?.post?.isSaved]);

  const handleCancel = () => {
    const likeData = {
      postId: data.post._id,
      isLiked: isLiked,
      likesCount: likesCount,
    };

    const saveData = {
      postId: data.post._id,
      isSaved: saved,
    };

    toggleModal(likeData, saveData);
    
    // Reset all state when closing modal
    setPage(0);
    setComments([]);
    setHasMore(true);
    setCommentLoading(false);
  };

  const openFullScreen = (imageIndex) => {
    setFullScreenImageIndex(imageIndex);
    setIsFullScreenOpen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreenOpen(false);
  };

  const handleSaveClickApi = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/toggle-save/${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId: data.post._id }),
        }
      );

      if (response.ok) {
        setSaved(!saved);
      }
    } catch (err) {
      console.error("internal server error");
    }
  };

  const handleFullScreenPrev = () => {
    if (data?.post.images && data.post.images.length > 0) {
      setFullScreenImageIndex((prev) =>
        prev === 0 ? data.post.images.length - 1 : prev - 1
      );
    }
  };

  const handleFullScreenNext = () => {
    if (data?.post.images && data.post.images.length > 0) {
      setFullScreenImageIndex((prev) =>
        prev === data.post.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFullScreenOpen) return;

      if (event.key === "Escape") {
        closeFullScreen();
      } else if (event.key === "ArrowLeft") {
        handleFullScreenPrev();
      } else if (event.key === "ArrowRight") {
        handleFullScreenNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreenOpen]);

  const handlePrevImage = () => {
    if (data?.post.images && data.post.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? data.post.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (data?.post.images && data.post.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === data.post.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleCommentSubmit = async (e) => {
    try {
      e.preventDefault();

      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/add-comment/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId: data.post._id,
            userId: user._id,
            content: commentText,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        if (commentText.trim()) {
          const newComment = {
            id: result.commentId,
            user: {
              _id: user._id,
              name: user?.userName || "You",
              avatar: user?.profilePic || defaultProfilePic,
            },
            text: commentText.trim(),
            timestamp: "now",
            likes: 0,
            liked: false,
          };
          setComments([newComment, ...comments]);
          setTotalComments((count) => count + 1);

          setCommentText("");
        }
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleCommentLike = async (commentId, userId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/toggle-like-comment/${userId}`,
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

  const DisplayCommentApi = async () => {
    if (commentLoading || !hasMore) return;

    setCommentLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/get-comments/${data.post._id}/${user._id}?page=${page}`
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

  const handlePostLike = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/toggle-like/${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId: data.post._id,
          }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        const newLikeStatus = !isLiked;
        setIsLiked(newLikeStatus);
        setLikesCount((prev) =>
          newLikeStatus ? prev + 1 : Math.max(0, prev - 1)
        );
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const deleteCommentApi = async (postId, commentId) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API
        }/posts/delete-comment/${postId}/${commentId}`,
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

  const submitReplyApi = async (postId, commentId, replyContent) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/posts/add-reply/${postId}/${commentId}`,
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

  const deleteReplyApi = async (postId, commentId, replyId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API}/posts/delete-reply/${postId}/${commentId}/${replyId}`,
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
        `${import.meta.env.VITE_API}/posts/toggle-like-reply/${data.post._id}/${commentId}/${replyId}`,
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

  useEffect(() => {
    if (data?.post?._id) {
      // Reset state when post changes
      setPage(0);
      setComments([]);
      setHasMore(true);
      setCommentLoading(false);
      setCurrentImageIndex(0);
      setReplyingToCommentId(null);
      setReplyText("");
      setExpandedReplies({});
      
      // Set like state
      setIsLiked(data.post.isLiked || false);
      setLikesCount(data.post.likesCount || 0);
      
      // Load comments for the new post
      DisplayCommentApi();
    }
  }, [data?.post?._id]);

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
                    data?.post.user.profilePic
                      ? data.post.user.profilePic
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
                  {formatTime(data?.post.createdAt)}
                </div>
              </div>
            </div>
            <button className="close-btn" onClick={() => handleCancel()}>
              &times;
            </button>
          </div>

          <div className="display-modal-post-content">
            <p>{data?.post.description}</p>
          </div>

          {data?.post.images && data.post.images.length > 0 && (
            <div className="post-images-container">
              <div className="image-slider">
                <img
                  src={data.post.images[currentImageIndex]}
                  alt={`Post image ${currentImageIndex + 1}`}
                  className="post-image"
                  onClick={() => openFullScreen(currentImageIndex)}
                  style={{ cursor: "pointer" }}
                />

                {data.post.images.length > 1 && (
                  <>
                    <button
                      className="slider-btn prev-btn"
                      onClick={handlePrevImage}
                    >
                      ‹
                    </button>
                    <button
                      className="slider-btn next-btn"
                      onClick={handleNextImage}
                    >
                      ›
                    </button>

                    <div className="image-indicators">
                      {data.post.images.map((_, index) => (
                        <button
                          key={index}
                          className={`indicator ${
                            index === currentImageIndex ? "active" : ""
                          }`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="social-actions">
            <button
              className={`social-btn like-btn ${isLiked ? "liked" : ""}`}
              onClick={handlePostLike}
            >
              <Heart size={24} weight={isLiked ? "fill" : "bold"} />
              <span className="social-count">{likesCount}</span>
            </button>

            <a className="social-btn comment-btn" href="#comments-section">
              <ChatCircle size={24} weight="bold" />
              <span className="social-count">{totalComments}</span>
            </a>

            <button
              className="social-btn share-btn"
              onClick={() =>
                shareUrl(
                  userData.userName,
                  data?.post.description || "Check out this post!",
                  `${import.meta.env.VITE_CLIENT_URL}/user/${
                    userData.userName
                  }/post/${data?.post._id}`
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
                  src={user?.profilePic ? user.profilePic : defaultProfilePic}
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

          <div className="comments-section" id="comments-section">
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
                              deleteCommentApi(data.post?._id, comment.id)
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
                            placeholder={`${t("Reply to")} ${comment.user.name}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && replyText.trim()) {
                                submitReplyApi(data.post._id, comment.id, replyText);
                              }
                            }}
                            className="reply-input"
                            autoFocus
                          />
                          <button
                            className="reply-submit-btn"
                            onClick={() => {
                              if (replyText.trim()) {
                                submitReplyApi(data.post._id, comment.id, replyText);
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
                                      alt="avatar"
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
                                              data.post?._id,
                                              comment.id,
                                              reply.id
                                            )
                                          }
                                        >
                                          <Trash size={16} />
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="comment-text">{reply.text}</div>
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

      {isFullScreenOpen && (
        <div className="image-lightbox-overlay">
          <button className="lightbox-close-btn" onClick={closeFullScreen}>
            <X size={32} weight="bold" />
          </button>

          {data?.post.images && data.post.images.length > 1 && (
            <>
              <button
                className="lightbox-nav-btn lightbox-prev-btn"
                onClick={handleFullScreenPrev}
              >
                ‹
              </button>
              <button
                className="lightbox-nav-btn lightbox-next-btn"
                onClick={handleFullScreenNext}
              >
                ›
              </button>
            </>
          )}

          <div className="lightbox-image-container">
            <img
              src={data?.post.images[fullScreenImageIndex]}
              alt={`Full screen image ${fullScreenImageIndex + 1}`}
              className="lightbox-main-image"
            />
          </div>

          {data?.post.images && data.post.images.length > 1 && (
            <div className="fullscreen-indicators">
              {data.post.images.map((_, index) => (
                <button
                  key={index}
                  className={`fullscreen-indicator ${
                    index === fullScreenImageIndex ? "active" : ""
                  }`}
                  onClick={() => setFullScreenImageIndex(index)}
                />
              ))}
            </div>
          )}

          <div className="lightbox-backdrop" onClick={closeFullScreen} />
        </div>
      )}
    </>
  );
}