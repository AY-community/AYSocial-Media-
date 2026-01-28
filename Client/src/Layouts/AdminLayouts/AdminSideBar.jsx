import { useLocation, Link } from "react-router-dom";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import {
  ShieldCheck,
  ChartBar,
  Users,
  FileText,
  MonitorPlay,
  Star,
  Crown,
  Flag,
  Gear,
  ArrowLeft,
} from "phosphor-react";
import { useAuth } from "../../Context/AuthContext";
import { useTranslation } from "react-i18next";

function AdminSideBar() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="main-sidebar admin-sidebar" >
      <nav className="sidebar-nav">
        <ul>
          <div className="profile-li">
            <img
              src={user.profilePic ? user.profilePic : defaultProfilePic}
              alt=""
              width="33px"
              height="33px"
            />
            <div>
              <Link to={`/${user.userName}`}>{user.userName}</Link>
              <span>{t("Admin Panel")}</span>
            </div>
          </div>

          <li className={isActive("/admin/dashboard") ? "active" : ""}>
            <Link to="/admin/dashboard">
              <ShieldCheck className="sidebar-icon" size={22} weight="fill" />
              {t("Dashboard")}
            </Link>
          </li>

          <li className={isActive("/admin/analytics") ? "active" : ""}>
            <Link to="/admin/analytics">
              <ChartBar className="sidebar-icon" size={22} weight="fill" />
              {t("Analytics")}
            </Link>
          </li>

          <li className={isActive("/admin/users") ? "active" : ""}>
            <Link to="/admin/users">
              <Users className="sidebar-icon" size={22} weight="fill" />
              {t("Users")}
            </Link>
          </li>



          <li className={isActive("/admin/roles") ? "active" : ""}>
            <Link to="/admin/roles">
              <Crown   className="sidebar-icon" size={22} weight="fill" />
              {t("Roles")}
            </Link>
          </li>

          <li className={isActive("/admin/reports") ? "active" : ""}>
            <Link to="/admin/reports">
              <Flag className="sidebar-icon" size={22} weight="fill" />
              {t("Reports")}
            </Link>
          </li>

          <li className={isActive("/admin/reviews") ? "active" : ""}>
            <Link to="/admin/reviews">
              <Star className="sidebar-icon" size={22} weight="fill" />
              {t("Reviews")}
            </Link>
          </li>

          <div style={{ 
            margin: "15px 0", 
            borderTop: "1px solid rgba(0,0,0,0.1)" 
          }}></div>

          <li>
            <Link to="/">
              <ArrowLeft className="sidebar-icon" size={22} weight="fill" />
              {t("Back to Site")}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default AdminSideBar;