import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, PaperPlaneTilt, Trash, SpinnerGap, Heart } from "phosphor-react";
import { useAuth } from "../../Context/AuthContext";
import formatTime from "../../Utils/FormatTime";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import "./ReelCommentModal.css";

export default function ReelCommentModal({ display, toggleModal, videoData, userData }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const triggerRef = useRef();
  const { user } = useAuth();

  // Fetch comments
  const DisplayCommentApi = async (pageNum = 0) => {
    if (commentLoading) return;
    setCommentLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/get-comments/${videoData?._id}/${
          user._id
        }?page=${pageNum}`
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

        if (pageNum === 0) {
          setComments(newComments);
        } else {
          setComments((prev) => [...prev, ...newComments]);
        }

        setHasMore(responseData.hasMore);
        setPage(pageNum + 1);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  // Load comments when modal opens
  useEffect(() => {
    if (display && videoData?._id) {
      DisplayCommentApi(0);
    }
  }, [display, videoData?._id]);

  // Add comment
  const submitCommentApi = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/add-comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: videoData?._id,
            userId: user._id,
            content: commentText,
          }),
        }
      );

      if (response.ok) {
        const newComment = {
          id: Math.random().toString(),
          user: {
            _id: user._id,
            name: user.name || user.userName,
            avatar: user.profilePic || defaultProfilePic,
          },
          text: commentText,
          timestamp: "now",
          likes: 0,
          liked: false,
          replies: [],
        };

        setComments((prev) => [newComment, ...prev]);
        setCommentText("");
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  // Delete comment
  const deleteCommentApi = async (commentId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API}/videos/delete-comment/${videoData?._id}/${commentId}`,
        { method: "DELETE" }
      );

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (err) {
      console.error(err.message);
    }
  };

  // Toggle like on comment
  const handleCommentLike = async (commentId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-like-comment/${user._id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentId }),
        }
      );

      if (response.ok) {
        const data_response = await response.json();
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  liked: data_response.isLiked,
                  likes: data_response.likesCount,
                }
              : comment
          )
        );
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  // Add reply
  const submitReplyApi = async (commentId, replyContent) => {
    if (!replyContent.trim()) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/add-reply/${videoData?._id}/${commentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            content: replyContent,
          }),
        }
      );

      if (response.ok) {
        const newReply = {
          id: Math.random().toString(),
          user: {
            _id: user._id,
            name: user.name || user.userName,
            avatar: user.profilePic || defaultProfilePic,
          },
          text: replyContent,
          timestamp: "now",
          likes: 0,
          liked: false,
        };

        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), newReply],
                }
              : comment
          )
        );

        setReplyingToCommentId(null);
        setReplyText("");
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  // Delete reply
  const deleteReplyApi = async (commentId, replyId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API}/videos/delete-reply/${videoData?._id}/${commentId}/${replyId}`,
        { method: "DELETE" }
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

  // Toggle like on reply
  const handleReplyLike = async (commentId, replyId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/videos/toggle-like-reply/${videoData._id}/${commentId}/${replyId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  if (!display) return null;

  return (
    <div className="reel-comment-modal-overlay" onClick={toggleModal}>
      <div className="reel-comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reel-comment-header">
          <h3>{t("Comments")}</h3>
          <button className="reel-comment-close" onClick={toggleModal}>
            <X size={24} />
          </button>
        </div>

        <div className="reel-comments-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="reel-comment-item">
                <img
                  src={comment.user.avatar}
                  alt={comment.user.name}
                  className="reel-comment-avatar"
                  onClick={() => navigate(`/user/${comment.user.name}`)}
                  style={{ cursor: "pointer" }}
                />
                <div className="reel-comment-content">
                  <div className="reel-comment-header-info">
                    <span
                      className="reel-comment-user"
                      onClick={() => navigate(`/user/${comment.user.name}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {comment.user.name}
                    </span>
                    <span className="reel-comment-time">{comment.timestamp}</span>
                  </div>
                  <p className="reel-comment-text">{comment.text}</p>

                  <div className="reel-comment-actions">
                    <button
                      className={`reel-comment-like ${comment.liked ? "liked" : ""}`}
                      onClick={() => handleCommentLike(comment.id)}
                    >
                      <Heart
                        size={12}
                        weight={comment.liked ? "fill" : "regular"}
                      />
                      <span>{comment.likes}</span>
                    </button>
                    <button
                      className="reel-comment-reply-btn"
                      onClick={() => setReplyingToCommentId(comment.id)}
                    >
                      {t("Reply")}
                    </button>
                  </div>

                  {replyingToCommentId === comment.id && (
                    <div className="reel-reply-input-section">
                      <input
                        type="text"
                        placeholder={`${t("Reply to")} ${comment.user.name}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && replyText.trim()) {
                            submitReplyApi(comment.id, replyText);
                          }
                        }}
                        className="reel-reply-input"
                        autoFocus
                      />
                      <button
                        className="reel-reply-submit-btn"
                        onClick={() => {
                          if (replyText.trim()) {
                            submitReplyApi(comment.id, replyText);
                          }
                        }}
                        disabled={!replyText.trim()}
                      >
                        <PaperPlaneTilt size={16} />
                      </button>
                      <button
                        className="reel-reply-cancel-btn"
                        onClick={() => {
                          setReplyingToCommentId(null);
                          setReplyText("");
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {comment.replies && comment.replies.length > 0 && (
                    <>
                      <button
                        className="reel-show-replies-btn"
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
                        <div className="reel-replies-section">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="reel-reply">
                              <img
                                src={reply.user.avatar}
                                alt={reply.user.name}
                                className="reel-reply-avatar"
                                onClick={() => navigate(`/user/${reply.user.name}`)}
                                style={{ cursor: "pointer" }}
                              />
                              <div className="reel-reply-content">
                                <div className="reel-reply-header">
                                  <span
                                    className="reel-reply-user"
                                    onClick={() => navigate(`/user/${reply.user.name}`)}
                                    style={{ cursor: "pointer" }}
                                  >
                                    {reply.user.name}
                                  </span>
                                  <span className="reel-reply-time">
                                    {reply.timestamp}
                                  </span>
                                  {reply.user._id === user._id ? (
                                    <button
                                      className="reel-reply-delete"
                                      onClick={() =>
                                        deleteReplyApi(comment.id, reply.id)
                                      }
                                    >
                                      <Trash size={12} />
                                    </button>
                                  ) : null}
                                </div>
                                <p className="reel-reply-text">{reply.text}</p>
                                <div className="reel-reply-actions">
                                  <button
                                    className={`reel-reply-like ${
                                      reply.liked ? "liked" : ""
                                    }`}
                                    onClick={() =>
                                      handleReplyLike(comment.id, reply.id)
                                    }
                                  >
                                    <Heart
                                      size={12}
                                      weight={reply.liked ? "fill" : "regular"}
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

                {comment.user._id === user._id ? (
                  <button
                    className="reel-comment-delete"
                    onClick={() => deleteCommentApi(comment.id)}
                  >
                    <Trash size={16} />
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="reel-no-comments">
              <p>{t("No comments yet. Be the first to comment!")}</p>
            </div>
          )}

          {commentLoading && (
            <div className="reel-comments-loading">
              <SpinnerGap size={24} className="spinner" />
            </div>
          )}

          {hasMore && !commentLoading && (
            <button className="reel-load-more-btn" onClick={() => DisplayCommentApi(page)}>
              {t("Load More Comments")}
            </button>
          )}
        </div>

        <div className="reel-comment-input">
          <input
            type="text"
            placeholder={t("Add a comment...")}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                submitCommentApi();
              }
            }}
            className="reel-comment-input-field"
          />
          <button
            className="reel-comment-submit-btn"
            onClick={submitCommentApi}
            disabled={!commentText.trim()}
          >
            <PaperPlaneTilt size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}