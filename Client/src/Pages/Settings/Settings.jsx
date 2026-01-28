import "./settings.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import { useAuth } from "../../Context/AuthContext";
import DeleteAccountModal from "../../Layouts/ConfirmLayouts/DeleteAccountModal";
import ConfirmDeleteAcccountModal from "../../Layouts/ConfirmLayouts/ConfirmDeleteAccount";
import {
  Lock,
  ShieldCheck,
  Prohibit,
  Translate,
  Palette,
  ChartBar,
  Key,
  Trash,
  UserCircle,
  CaretRight,
  SignOut,
  BookmarkSimple,
} from "phosphor-react";
import { useTranslation } from "react-i18next";
import SEO from '../../Utils/SEO';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  // State for delete modals
  const [showFirstModal, setShowFirstModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const settingsOptions = [
    {
      id: "account",
      title: t("Account"),
      description: t("Manage your account information"),
      icon: <UserCircle size={24} weight="duotone" />,
      path: `/edit/${user.userName}/`,
    },
    {
      id: "privacy",
      title: t("Privacy"),
      description: t("Control your privacy settings"),
      icon: <Lock size={24} weight="duotone" />,
      path: "/settings/privacy",
    },
    {
      id: "blocklist",
      title: t("Blocklist"),
      description: t("Manage blocked accounts"),
      icon: <Prohibit size={24} weight="duotone" />,
      path: "/settings/blocklist",
    },
    {
      id: "password",
      title: t("Change Password"),
      description: t("Update your password"),
      icon: <Key size={24} weight="duotone" />,
      path: "/settings/change-password",
    },
    {
      id: "language",
      title: t("Language"),
      description: t("Choose your preferred language"),
      icon: <Translate size={24} weight="duotone" />,
      path: "/settings/language",
    },
    {
      id: "theme",
      title: t("Theme"),
      description: t("Customize your appearance"),
      icon: <Palette size={24} weight="duotone" />,
      path: "/settings/theme",
    },
    {
      id: "saved",
      title: t("Saved"),
      description: t("View your saved posts and videos"),
      icon: <BookmarkSimple size={24} weight="duotone" />,
      path: "/saved",
      mobileOnly: true,
    },
    {
      id: "dashboard",
      title: t("Dashboard"),
      description: t("View your analytics and insights"),
      icon: <ChartBar size={24} weight="duotone" />,
      path: "/settings/dashboard",
    },
    {
      id: "logout",
      title: t("Log Out"),
      description: t("Sign out of your account"),
      icon: <SignOut size={24} weight="duotone" />,
      path: "/logout",
    },
    {
      id: "delete",
      title: t("Delete Account"),
      description: t("Permanently delete your account"),
      icon: <Trash size={24} weight="duotone" />,
      path: "/settings/delete",
      danger: true,
    },
  ];

  const handleLogout = async () => {
    try {
      const API_URL = import.meta.env.VITE_API;
      
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      navigate('/auth');
    } catch (err) {
      console.error('Error logging out:', err);
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      navigate('/auth');
    }
  };

  const handleOptionClick = (option) => {
    if (option.id === "logout") {
      handleLogout();
    } else if (option.id === "delete") {
      setShowFirstModal(true);
    } else {
      navigate(option.path);
    }
  };

  const handleFirstConfirm = () => {
    setShowFirstModal(false);
    setShowSecondModal(true);
  };

  const handleFinalDelete = async () => {
    try {
      setButtonLoading(true);

      const API_URL = import.meta.env.VITE_API;
      const userName = user.userName;

      const response = await fetch(`${API_URL}/account/${userName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          credentials: 'include',
        });
        
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        alert(`✅ Account deleted successfully.\n\n📊 Details:\n- Deleted ${data.deletedMedia} media files\n- All posts, videos, and messages removed\n- All social connections cleaned up`);
        
        navigate('/auth');
      } else {
        alert('❌ Failed to delete account: ' + data.error);
        setButtonLoading(false);
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('❌ Error: ' + err.message);
      setButtonLoading(false);
    }
  };

  const closeModals = () => {
    setShowFirstModal(false);
    setShowSecondModal(false);
    setButtonLoading(false);
  };

  return (
    <>
      <SEO
        title={"Settings"}
        description={"Manage your account preferences and settings on AYSocial."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <BottomNav />
      <div className="main-layout ">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="settings-container">
            <div className="settings-header">
              <ShieldCheck size={32} weight="duotone" />
              <h1>{t("Settings")}</h1>
              <p>{t("Manage your account preferences and settings")}</p>
            </div>

            <div className="settings-list">
              {settingsOptions.map((option) => (
                <div
                  key={option.id}
                  className={`settings-item ${option.danger ? "danger" : ""} ${
                    option.mobileOnly ? "mobile-only" : ""
                  }`}
                  onClick={() => handleOptionClick(option)}
                >
                  <div className="settings-item-icon">{option.icon}</div>
                  <div className="settings-item-content">
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                  </div>
                  <div className="settings-item-arrow">
                    <CaretRight size={20} weight="bold" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        openModal={showFirstModal}
        onConfirm={handleFirstConfirm}
        onClose={closeModals}
        type="Account"
      />

      <ConfirmDeleteAcccountModal
        openModal={showSecondModal}
        onConfirm={handleFinalDelete}
        onClose={closeModals}
        buttonLoading={buttonLoading}
        type="Account"
      />
    </>
  );
}