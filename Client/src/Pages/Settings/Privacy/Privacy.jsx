import "./privacy.css";
import Header from "../../../Layouts/MainLayouts/Header";
import MainSideBar from "../../../Layouts/MainLayouts/MainSideBar";
import { Lock, User, EnvelopeSimple, CaretLeft } from "phosphor-react";
import BottomNav from "../../../Layouts/MainLayouts/BottomNav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Context/AuthContext";
import { useTranslation } from "react-i18next";
import SEO from '../../../Utils/SEO';

export default function Privacy() {
  const navigate = useNavigate();
  const { user, updatePrivacySettings } = useAuth();
  const { t } = useTranslation();

  const [settings, setSettings] = useState({
    isAccountPrivate: false,
    whoCanDM: "Everyone",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.privacySettings) {
      setSettings({
        isAccountPrivate: user.privacySettings.isAccountPrivate || false,
        whoCanDM: user.privacySettings.whoCanDM || "Everyone",
      });
    }
  }, [user]);

  const handleToggle = async () => {
    const newValue = !settings.isAccountPrivate;

    setSettings((prev) => ({
      ...prev,
      isAccountPrivate: newValue,
    }));

    setIsSaving(true);
    const result = await updatePrivacySettings({ isAccountPrivate: newValue });
    setIsSaving(false);

    if (!result.success) {
      setSettings((prev) => ({
        ...prev,
        isAccountPrivate: !newValue,
      }));
      alert(t("Failed to update privacy setting. Please try again."));
    }
  };

  const handleSelectChange = async (e) => {
    const newValue = e.target.value;

    setSettings((prev) => ({
      ...prev,
      whoCanDM: newValue,
    }));

    setIsSaving(true);
    const result = await updatePrivacySettings({ whoCanDM: newValue });
    setIsSaving(false);

    if (!result.success) {
      setSettings((prev) => ({
        ...prev,
        whoCanDM: settings.whoCanDM,
      }));
      alert(t("Failed to update DM setting. Please try again."));
    }
  };

  return (
    <>
      <SEO
        title={"Privacy Settings"}
        description={"Manage your privacy settings on AYSocial. Control who can see your profile and send you messages."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container"></div>

        <div style={{ width: "100%" }}>
          <div className="privacy-container">
            <div className="privacy-info-banner">
              <button
                className="privacy-back-btn"
                onClick={() => navigate("/settings")}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back to Settings")}
              </button>
              <div className="privacy-header-content">
                <Lock size={32} weight="duotone" />
                <h1>{t("Privacy")}</h1>
                <p>
                  {t("Manage who can see your profile, send you messages, and find you.")}
                </p>
              </div>
            </div>

            <div className="privacy-card">
              <div className="setting-group">
                <div className="setting-header">
                  <User size={24} weight="duotone" />
                  <h2>{t("Account Visibility")}</h2>
                </div>

                <div className="setting-item">
                  <div className="setting-details">
                    <h3>{t("Private Account")}</h3>
                    <p>
                      {t("When this is turned on, only people you approve can see your posts and activity. This does not hide your name or profile photo.")}
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.isAccountPrivate}
                      onChange={handleToggle}
                      disabled={isSaving}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div className="divider"></div>

              <div className="setting-group">
                <div className="setting-header">
                  <EnvelopeSimple size={24} weight="duotone" />
                  <h2>{t("Messaging & Interactions")}</h2>
                </div>

                <div className="setting-item">
                  <div className="setting-details">
                    <h3>{t("Who can send you direct messages?")}</h3>
                    <p>
                      {t("This filters direct messages from users you don't follow.")}
                    </p>
                  </div>
                  <div className="select-wrapper">
                    <select
                      value={settings.whoCanDM}
                      onChange={handleSelectChange}
                      className="select-control"
                      disabled={isSaving}
                    >
                      <option value="Everyone">{t("Everyone")}</option>
                      <option value="Friends Only">{t("Friends Only")}</option>
                      <option value="No One">{t("No One")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {isSaving && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    color: "#8b5cf6",
                  }}
                >
                  {t("Saving...")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
