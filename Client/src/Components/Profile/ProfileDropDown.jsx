import { useNavigate } from "react-router-dom";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import { SignOut } from "phosphor-react";
import { useTranslation } from "react-i18next";

export default function ProfileDropDown({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API}/logout`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/auth");
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error(t("Logout failed:"), error);
    }
  };

  return (
    <div className="profile-dropdown">
      <div
        className="dropdown-header"
        onClick={() => navigate(`/user/${user.userName}`)}
      >
        <img
          className="dropdown-avatar"
          src={user.profilePic ? user.profilePic : defaultProfilePic}
          alt={t("Profile")}
        />
        <div className="dropdown-user-info">
          <h4>{user.userName}</h4>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="dropdown-divider"></div>

      <ul className="dropdown-menu">
        <li className="dropdown-item logout" onClick={handleLogout}>
          <SignOut size={20} weight="regular" />
          <span>{t("Logout")}</span>
        </li>
      </ul>
    </div>
  );
}