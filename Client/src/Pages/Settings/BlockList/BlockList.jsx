import React, { useState, useEffect } from 'react';
import './BlockList.css';
import { useAuth } from '../../../Context/AuthContext';
import { useTranslation } from 'react-i18next';
import Spinner from "../../../Components/Ui/Spinner";
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../../Layouts/MainLayouts/Header';
import MainSideBar from '../../../Layouts/MainLayouts/MainSideBar';
import BottomNav from '../../../Layouts/MainLayouts/BottomNav';
import { ProhibitInset, CaretLeft } from 'phosphor-react';
import SEO from '../../../Utils/SEO';

const BlockList = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API}/blocks`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          setBlockedUsers(data.blockedUsers || []);
        }
      } catch (error) {
        console.error("Failed to fetch blocked users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, []);

  const handleUnblock = async (userIdToUnblock) => {
    // Optimistic UI update
    setBlockedUsers(prevUsers => prevUsers.filter(u => u._id !== userIdToUnblock));

    try {
      const res = await fetch(`${import.meta.env.VITE_API}/unblock/${userIdToUnblock}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to unblock user');
      }
    } catch (error) {
      console.error("Failed to unblock user:", error);
      // Revert on error
      const res = await fetch(`${import.meta.env.VITE_API}/blocks`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setBlockedUsers(data.blockedUsers || []);
      }
    }
  };

  return (
    <>
      <SEO 
        title={"Blocked Accounts"}
        description={"Manage your blocked accounts on AYSocial. View and unblock users you've blocked."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container" />
        
        <div style={{ width: "100%" }}>
          <div className="blocklist-container">
            <div className="blocklist-info-banner">
              <button
                className="blocklist-back-btn"
                onClick={() => navigate("/settings")}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back to Settings")}
              </button>
              <div className="blocklist-header-content">
                <ProhibitInset size={32} weight="duotone" />
                <h1>{t("Blocked Accounts")}</h1>
                <p>
                  {t("Users you've blocked will appear here. They won't be able to find your profile, posts, or story. They are not notified when you block them.")}
                </p>
              </div>
            </div>

            <div className="blocklist-card">
              {loading ? (
                <div className="blocklist-spinner">
                  <Spinner />
                </div>
              ) : blockedUsers.length > 0 ? (
                <>
                  <p className="blocklist-description">
                    {t("You have blocked")} {blockedUsers.length} {blockedUsers.length === 1 ? t("account") : t("accounts")}.
                  </p>
                  <div className="blocked-users-list">
                    {blockedUsers.map(blockedUser => (
                      <div key={blockedUser._id} className="blocked-user-item">
                        <div className="blocked-user-info">
                          <Link to={`/user/${blockedUser.userName}`}>
                            <img 
                              src={blockedUser.profilePic} 
                              alt={blockedUser.userName} 
                              className="blocked-user-avatar" 
                            />
                          </Link>
                          <div className="blocked-user-details">
                            <Link 
                              to={`/user/${blockedUser.userName}`} 
                              className="blocked-user-username"
                            >
                              {blockedUser.userName}
                            </Link>
                            <span className="blocked-user-name">
                              {blockedUser.name || ' '}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnblock(blockedUser._id)} 
                          className="btn btn-secondary unblock-btn"
                        >
                          {t("Unblock")}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-blocklist">
                  <ProhibitInset size={120} weight="duotone" className="empty-blocklist-icon" />
                  <h3>{t("No Blocked Accounts")}</h3>
                  <p>
                    {t("You haven't blocked anyone yet. When you block someone, they'll appear here.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
};

export default BlockList;