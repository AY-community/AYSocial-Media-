// ExploreCard.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  ChatCircle,
  BookmarkSimple,
  Share,
  DotsThree,
  Flag,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
} from 'phosphor-react';
import defaultProfilePic from '../../assets/Profile/defaultProfilePic.jpg';
import './ExploreCard.css';

const ExploreCard = ({
  item, // Can be post or video
  currentUserId,
  followingUsers,
  requestedUsers,
  animatingLikeId,
  isMuted,
  videoRef,
  onLike,
  onSave,
  onFollowToggle,
  onCommentClick,
  onDoubleClick,
  onTouchTap,
  onToggleMute,
  onShare,
  onReport,
  formatTime,
  getFollowButtonText,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState(false);

  const handleReport = () => {
    setOpenMenu(false);
    if (onReport) {
      onReport(item._id, item.type);
    }
  };

  return (
    <article className="explore-card">
      {/* Header */}
      <div className="explore-card-header">
        <img
          src={item.user.profilePic || defaultProfilePic}
          alt={item.user.userName}
          className="explore-card-avatar clickable"
          onClick={() => navigate(`/user/${item.user.userName}`)}
        />
        <div className="explore-card-user-info">
          <h3
            className="explore-card-username clickable"
            onClick={() => navigate(`/user/${item.user.userName}`)}
          >
            {item.user.userName}
          </h3>
          <span
            className="explore-card-handle clickable"
            onClick={() => navigate(`/user/${item.user.userName}`)}
          >
            {item.user.name}
          </span>
        </div>
        <div className="explore-card-time">{formatTime(item.createdAt)}</div>

        {/* Follow Button */}
        {item.user._id !== currentUserId && (
          <button
            className={`explore-card-follow-btn ${
              followingUsers.has(item.user._id) ? 'nfollow' : ''
            } ${requestedUsers.has(item.user._id) ? 'requested' : ''}`}
            onClick={() => onFollowToggle(item.user._id)}
          >
            {getFollowButtonText(item.user._id)}
          </button>
        )}

        {/* Menu */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            className="explore-card-menu"
            onClick={() => setOpenMenu(!openMenu)}
          >
            <DotsThree size={24} weight="bold" />
          </button>
          {openMenu && (
            <div className="explore-card-menu-dropdown">
              <ul>
                <li className="report-item" onClick={handleReport}>
                  <Flag size={20} />
                  <span>{t("Report")}</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="explore-card-content">
        <p className="explore-card-text">{item.description}</p>
      </div>

      {/* Media - Image */}
      {item.type === 'post' && item.images?.length > 0 && (
        <div
          className="explore-card-media"
          onDoubleClick={() => onDoubleClick(item._id, item.type)}
          onTouchEnd={() => onTouchTap(item._id, item.type)}
        >
          <img src={item.images[0]} alt="Post" />
          {animatingLikeId === item._id && (
            <div className="like-heart-animation">
              <Heart size={80} weight="fill" color="var(--primary-color)" />
            </div>
          )}
        </div>
      )}

      {/* Media - Video */}
      {item.type === 'video' && item.videoUrl && (
        <div
          className="explore-card-media explore-card-video"
          onDoubleClick={() => onDoubleClick(item._id, item.type)}
          onTouchEnd={() => onTouchTap(item._id, item.type)}
        >
          <video
            src={item.videoUrl}
            ref={videoRef}
            muted={isMuted}
            loop
            playsInline
            autoPlay
          />
          <button className="explore-card-video-mute-btn" onClick={onToggleMute}>
            {isMuted ? (
              <SpeakerSimpleSlash size={24} color="white" />
            ) : (
              <SpeakerSimpleHigh size={24} color="white" />
            )}
          </button>
          {animatingLikeId === item._id && (
            <div className="like-heart-animation">
              <Heart size={80} weight="fill" color="var(--primary-color)" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="social-actions">
        <button
          className={`social-btn like-btn ${item.userLiked ? 'liked' : ''}`}
          onClick={() => onLike(item._id, item.type)}
        >
          <Heart size={24} weight={item.userLiked ? 'fill' : 'bold'} />
          <span className="social-count">{item.likesCount}</span>
        </button>
        <button className="social-btn comment-btn" onClick={() => onCommentClick(item)}>
          <ChatCircle size={24} weight="bold" />
          <span className="social-count">{item.commentsCount}</span>
        </button>
        <button className="social-btn share-btn" onClick={() => onShare(item)}>
          <Share size={24} weight="bold" />
          <span style={{ fontSize: '0.9rem' }}>{t("Share")}</span>
        </button>
        <button className="social-btn save-btn" onClick={() => onSave(item._id, item.type)}>
          <BookmarkSimple size={30} weight={item.userSaved ? 'fill' : 'bold'} />
        </button>
      </div>
    </article>
  );
};

export default ExploreCard;