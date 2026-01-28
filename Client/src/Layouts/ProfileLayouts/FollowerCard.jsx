import { useTranslation } from "react-i18next";
import "./ProfileLayouts.css";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";

export default function FollowerCard({
  picture,
  username,
  name,
  userId,
  isCurrentUser,
  isFollowing,
  onRemove,
  onToggleFollow,
  getActionButtonClass,
  getActionButtonText,
}) {
  const { t } = useTranslation();

  return (
    <div className="follower-card">
      <img
        src={picture || defaultProfilePic}
        alt={`${name}'s profile`}
        className="follower-picture"
      />
      <div className="follower-content">
        <div className="follower-info">
          <h3 className="follower-username">
            <a href={`/user/${username}`}>{username}</a>
          </h3>
          <p className="follower-name">{name}</p>
        </div>
        <div className="follower-actions">
          {!isCurrentUser && (
            <button
              className={
                getActionButtonClass
                  ? getActionButtonClass()
                  : (isFollowing ? "btn-secondary" : "btn-primary") +
                    " follower-button"
              }
              onClick={onToggleFollow}
            >
              {getActionButtonText
                ? getActionButtonText()
                : isFollowing
                ? t("Following")
                : t("Follow")}
            </button>
          )}
          <button className="btn-secondary follower-button" onClick={onRemove}>
            {t("Remove")}
          </button>
        </div>
      </div>
    </div>
  );
}