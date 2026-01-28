import "./AdminLayouts.css";
import "../Layouts.css"
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ChartBar,
  Users,
  Crown,
  Flag,
  Star,
} from "phosphor-react";

export default function AdminBottomNav() {
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      path: "/admin/dashboard",
      icon: ShieldCheck,
      key: "dashboard",
    },
    {
      path: "/admin/analytics",
      icon: ChartBar,
      key: "analytics",
    },
    {
      path: "/admin/users",
      icon: Users,
      key: "users",
    },
    {
      path: "/admin/roles",
      icon: Crown,
      key: "roles",
    },
    {
      path: "/admin/reports",
      icon: Flag,
      key: "reports",
    },
    {
      path: "/admin/reviews",
      icon: Star,
      key: "reviews",
    },
  ];

  return (
    <nav className="bottom-nav admin-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        const isHovered = hoveredIcon === item.key;

        return (
          <a
            key={item.key}
            onClick={() => navigate(item.path)}
            onMouseEnter={() => setHoveredIcon(item.key)}
            onMouseLeave={() => setHoveredIcon(null)}
            style={{ cursor: "pointer" }}
            className={isActive ? "active" : ""}
          >
            <Icon
              className="bottom-nav-icon"
              size={26}
              weight={isActive || isHovered ? "fill" : "regular"}
            />
          </a>
        );
      })}
    </nav>
  );
}