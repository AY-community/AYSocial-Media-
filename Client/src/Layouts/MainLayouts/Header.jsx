import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import {
  Sun,
  Moon,
  GearSix,
  ChatCircleText,
  MagnifyingGlass,
  Bell,
  CaretDown,
  List,
  ArrowLeft,
} from "phosphor-react";
import { useAuth } from "../../Context/AuthContext";
import { useTheme } from "../../Context/ThemeContext";
import ProfileDropdown from "../../Components/Profile/ProfileDropDown";
import { useTranslation } from "react-i18next";
import SearchHistory from "./SearchHistory";

import "../Layouts.css";

function Header({ className, hideOnMobile = false }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchHistoryVisible, setIsSearchHistoryVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [pressedIcon, setPressedIcon] = useState(null);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const isProfilePage = location.pathname === `/user/${user.userName}`;

  const isSettingsPage = location.pathname.startsWith("/settings");
  const isChatPage = location.pathname.startsWith("/chat");
  const isSearchPage = location.pathname.startsWith("/search");

  const isDirectSettingsPage = /^\/settings(\/.*)?$/.test(location.pathname);
  const isDirectSearchPage = /^\/search(\/.*)?$/.test(location.pathname);
  const isExploreSharedPage =
    /^\/explore\/(post|video)\/[^/]+$/.test(location.pathname) &&
    windowWidth <= 1000;

  const shouldHideOnMobile = hideOnMobile && windowWidth <= 1000;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchHistoryVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchSearchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API}/feed/search-history`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.history);
      }
    } catch (error) {
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isSearchHistoryVisible) {
      fetchSearchHistory();
    }
  }, [isSearchHistoryVisible]);

  const handleUserClick = () => {
    if (isMobile) {
      setPressedIcon('profile');
      setTimeout(() => setPressedIcon(null), 200);
      navigate(`/user/${user.userName}`);
    } else {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const handleNotificationClick = () => {
    setPressedIcon('bell');
    setTimeout(() => setPressedIcon(null), 200);
    navigate('/notifications');
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const trimmedQuery = searchQuery.trim();
      try {
        await fetch(`${import.meta.env.VITE_API}/feed/search-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ text: trimmedQuery }),
        });
        setSearchQuery('');
        fetchSearchHistory();
        setIsSearchHistoryVisible(false);
        navigate(`/search/${trimmedQuery}`);
      } catch (error) {
      }
    }
  };

  const handleClearHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API}/feed/search-history`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setSearchHistory([]);
      }
    } catch (error) {
    }
  };

  const handleRemoveItem = async (searchId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API}/feed/search-history/${searchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setSearchHistory(currentHistory => currentHistory.filter(item => item._id !== searchId));
      }
    } catch (error) {
    }
  };

  const handleHistoryItemClick = (query) => {
    if (query) {
      setIsSearchHistoryVisible(false);
      navigate(`/search/${query}`);
    }
  };

  if (shouldHideOnMobile) {
    return null;
  }

  return (
    <>
      <header className={className}>
        {((isDirectSettingsPage || isDirectSearchPage) && windowWidth <= 1000) || isExploreSharedPage ? (
          <>
            <ArrowLeft
              size={30}
              className="back-arrow"
              onClick={() => navigate(-1)}
              style={{ cursor: "pointer" }}
            />
            <h1
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                margin: 0,
              }}
            >
              AYS
            </h1>
          </>
        ) : (
          <h1>AYS</h1>
        )}
        {!((isDirectSettingsPage || isDirectSearchPage) && windowWidth <= 1000) && !isExploreSharedPage && (
          <div className="inputContainer" ref={searchContainerRef}>
            <MagnifyingGlass size={20} className="i" />
            <input
              placeholder={t("Search")}
              className="input-header"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchHistoryVisible(true)}
              onKeyDown={handleSearch}
            />
            <SearchHistory
              show={isSearchHistoryVisible}
              history={searchHistory}
              loading={loadingHistory}
              onClearHistory={handleClearHistory}
              onRemoveItem={handleRemoveItem}
              onHistoryItemClick={handleHistoryItemClick}
            />
          </div>
        )}

        {!((isDirectSettingsPage || isDirectSearchPage) && windowWidth <= 1000) && !isExploreSharedPage && (
          <nav>
          <MagnifyingGlass
            onMouseEnter={() => setHoveredIcon("search")}
            onMouseLeave={() => setHoveredIcon(null)}
            size={26}
            className="i2 nav-child"
            weight={hoveredIcon === "search" ? "bold" : "regular"}
            onClick={() => navigate("/search/mobile")}
            style={{ cursor: "pointer" }}
          />

          {theme === "light" ? (
            <Sun
              onClick={toggleTheme}
              onMouseEnter={() => setHoveredIcon("sun")}
              onMouseLeave={() => setHoveredIcon(null)}
              size={26}
              className="lm nav-child"
              weight={hoveredIcon === "sun" ? "fill" : "regular"}
            />
          ) : (
            <Moon
              onClick={toggleTheme}
              onMouseEnter={() => setHoveredIcon("moon")}
              onMouseLeave={() => setHoveredIcon(null)}
              size={26}
              className="lm nav-child"
              weight={hoveredIcon === "moon" ? "fill" : "regular"}
            />
          )}

          <GearSix
            onMouseEnter={() => setHoveredIcon("gear")}
            onMouseLeave={() => setHoveredIcon(null)}
            weight={hoveredIcon === "gear" ? "fill" : "regular"}
            size={26}
            className={`s nav-child ${isSettingsPage ? "settings-active" : ""}`}
            onClick={() => navigate("/settings")}
          />
          <ChatCircleText
            onMouseEnter={() => setHoveredIcon("chat")}
            onMouseLeave={() => setHoveredIcon(null)}
            size={26}
            className={`m nav-child ${isChatPage ? "settings-active" : ""}`}
            weight={hoveredIcon === "chat" ? "fill" : "regular"}
            onClick={() => navigate("/chat")}
          />

          {!isProfilePage && !isDirectSettingsPage && !isDirectSearchPage && (
            <>
              <Bell
                onMouseEnter={() => setHoveredIcon("bell")}
                onMouseLeave={() => setHoveredIcon(null)}
                size={26}
                className="b nav-child"
                weight="regular"
                onClick={handleNotificationClick}
                style={{
                  cursor: 'pointer'
                }}
              />

              <div
                className="user-image-div"
                onClick={handleUserClick}
                ref={dropdownRef}
              >
                <img
                  width="28px"
                  style={{ borderRadius: "50%" }}
                  className="img nav-child"
                  src={user.profilePic ? user.profilePic : defaultProfilePic}
                />
                <CaretDown
                  size={15}
                  weight="bold"
                  className={`pr nav-child ${isDropdownOpen ? "rotate" : ""}`}
                />

                {isDropdownOpen && !isMobile && <ProfileDropdown user={user} />}
              </div>
            </>
          )}

          {(isProfilePage || isDirectSettingsPage || isDirectSearchPage) && (
            <>
              {isProfilePage && (
                <List
                  size={30}
                  className="nav-child nav-child-list"
                  onClick={() => navigate("/settings")}
                  style={{ cursor: "pointer" }}
                />
              )}
              <div
                className="user-image-div user-image-div-profile-page"
                onClick={handleUserClick}
                ref={dropdownRef}
              >
                <img
                  width="28px"
                  style={{ borderRadius: "50%" }}
                  className="img nav-child"
                  src={user.profilePic ? user.profilePic : defaultProfilePic}
                />
                <CaretDown
                  size={15}
                  weight="bold"
                  className={`pr nav-child ${isDropdownOpen ? "rotate" : ""}`}
                />

                {isDropdownOpen && !isMobile && <ProfileDropdown user={user} />}
              </div>
            </>
          )}
          
        </nav>
        )}
      </header>
    </>
        
  );

}
export default Header;