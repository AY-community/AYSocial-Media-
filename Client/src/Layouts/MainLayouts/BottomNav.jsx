import "../Layouts.css";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useModal } from "../../Context/ModalContext";

import {
  House,
  Planet,
  PlusCircle,
  ChatCircleText,
  VideoCamera,
  Aperture,
  MonitorPlay,
} from "phosphor-react";

export default function Nav() {
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const { openPostModal, openVideoModal } = useModal();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isChatPage = location.pathname.startsWith("/chat");
  const isExplorePage = location.pathname.startsWith("/explore");
  const isReelsPage = location.pathname.startsWith("/reels");

  /* Display Post Menu */
  const displayMenu = () => {
    const menuElement = document.querySelector(".postMenu-small");
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

  return (
    <>
      <nav className="bottom-nav">
        <a
          onClick={() => navigate("/")}
          onMouseEnter={() => setHoveredIcon("house")}
          onMouseLeave={() => setHoveredIcon(null)}
          style={{ cursor: "pointer" }}
        >
          <House
            className="bottom-nav-icon"
            size={30}
            weight={location.pathname === "/" || hoveredIcon === "house" ? "fill" : "regular"}
          />
        </a>

        <a
          onClick={() => navigate("/explore")}
          onMouseEnter={() => setHoveredIcon("explore")}
          onMouseLeave={() => setHoveredIcon(null)}
          style={{ cursor: "pointer" }}
        >
          <Planet
            className="bottom-nav-icon"
            size={30}
            weight={isExplorePage || hoveredIcon === "explore" ? "fill" : "regular"}
          />
        </a>

        <a
          onClick={() => navigate("/reel")}
          onMouseEnter={() => setHoveredIcon("reel")}
          onMouseLeave={() => setHoveredIcon(null)}
          style={{ cursor: "pointer" }}
        >
          <MonitorPlay
            className="bottom-nav-icon"
            size={30}
            weight={isReelsPage || hoveredIcon === "reels" ? "fill" : "regular"}
          />
        </a>

        <a
          onMouseEnter={() => setHoveredIcon("add")}
          onMouseLeave={() => setHoveredIcon(null)}
          onClick={displayMenu}
        >
          <PlusCircle
            className="bottom-nav-icon"
            size={30}
            weight={hoveredIcon === "add" ? "fill" : "regular"}
          />
        </a>

        <a
          onClick={() => navigate("/chat")}
          onMouseEnter={() => setHoveredIcon("chat")}
          onMouseLeave={() => setHoveredIcon(null)}
          style={{ cursor: "pointer" }}
        >
          <ChatCircleText
            className="bottom-nav-icon"
            size={30}
            weight={isChatPage || hoveredIcon === "chat" ? "fill" : "regular"}
          />
        </a>

        <ul className="postMenu-small" style={{ display: "none" }}>
          <li onClick={openPostModal}>
            <Aperture className="sidebar-icon " size={18} weight="fill" />
            Post
          </li>
          <li onClick={openVideoModal}>
            <VideoCamera className="sidebar-icon " size={18} weight="fill" />
            Video
          </li>
        </ul>
      </nav>
    </>
  );
}