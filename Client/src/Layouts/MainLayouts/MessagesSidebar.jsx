import { useLocation, Link } from "react-router-dom";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import {
  House,
  Planet,
  Bell,
  UserList,
  MonitorPlay,
  BookmarkSimple,
  PlusCircle,
  VideoCamera,
  Aperture,
} from "phosphor-react";
import { useAuth } from "../../Context/AuthContext";
import { useModal } from "../../Context/ModalContext";
import { useTranslation } from "react-i18next";

function MessagesSideBar() {
  const { user } = useAuth();
  const { openPostModal, openVideoModal } = useModal();
  const location = useLocation();
  const { t } = useTranslation();

  const displayMenu = () => {
    const menuElement = document.querySelector(".postMenu");
    if (menuElement) {
      menuElement.style.display = "block";

      const hideMenu = (event) => {
        if (!menuElement.contains(event.target)) {
          menuElement.style.display = "none";
          document.removeEventListener("click", hideMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener("click", hideMenu);
      }, 0);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="main-sidebar messages-sidebar">
      <nav className="sidebar-nav">
        <ul>
          <div className="profile-li">
            <img
              src={user.profilePic ? user.profilePic : defaultProfilePic}
              alt=""
              width="33px"
              height="33px"
            />
          </div>

          <li className={isActive("/") ? "active" : ""}>
            <Link to="/">
              <House className="sidebar-icon" size={25} weight="fill" />
            </Link>
          </li>
          <li className={isActive("/explore") ? "active" : ""}>
            <Link to="/explore">
              <Planet className="sidebar-icon" size={25} weight="fill" />
            </Link>
          </li>
          <li className={isActive("/notifications") ? "active" : ""}>
            <Link to="/notifications">
              <Bell className="sidebar-icon" size={25} weight="fill" />
            </Link>
          </li>

          <li onClick={displayMenu}>
            <Link to="#create">
              <PlusCircle className="sidebar-icon" size={25} weight="fill" />
            </Link>
          </li>

          <li className={isActive("/followers") ? "active" : ""}>
            <Link to="/followers">
              <UserList className="sidebar-icon" size={25} weight="fill" />
            </Link>
          </li>
          <li className={isActive("/saved") ? "active" : ""}>
            <Link to="/saved">
              <BookmarkSimple
                className="sidebar-icon"
                size={25}
                weight="fill"
              />
            </Link>
          </li>
          <li className={isActive("/videos") ? "active" : ""}>
            <Link to="/videos">
              <MonitorPlay className="sidebar-icon" size={25} weight="fill" />
            </Link>
          </li>

          <ul style={{ display: "none" }} className="postMenu">
            <a onClick={openPostModal}>
              <Aperture className="sidebar-icon" size={25} weight="fill" />
              {t("Post")}
            </a>
            <a onClick={openVideoModal}>
              <VideoCamera className="sidebar-icon" size={25} weight="fill" />
              {t("Video")}
            </a>
          </ul>
        </ul>
      </nav>
    </aside>
  );
}

export default MessagesSideBar;
