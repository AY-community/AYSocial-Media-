import "./languages.css";
import Header from "../../../Layouts/MainLayouts/Header";
import MainSideBar from "../../../Layouts/MainLayouts/MainSideBar";
import { GlobeSimple, CaretLeft } from "phosphor-react";
import BottomNav from "../../../Layouts/MainLayouts/BottomNav";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from '../../../Utils/SEO';


export default function Language() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleSelectChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <>
      <SEO
        title={"Language Settings"}
        description={"Change the application language to your preferred language."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container"></div>

        <div style={{ width: "100%" }}>
          <div className="language-container">
            {/* Header Banner */}
            <div className="language-info-banner">
              <button
                className="language-back-btn"
                onClick={() => navigate("/settings")}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back to Settings")}
              </button>
              <div className="language-header-content">
                <GlobeSimple size={32} weight="duotone" />
                <h1>{t("Language")}</h1>
                <p>
                  {t("Set your preferred language for the application interface.")}
                </p>
              </div>
            </div>

            {/* The Main Settings Card */}
            <div className="language-card">
              {/* === SECTION 1: INTERFACE LANGUAGE === */}
              <div className="setting-group">
                <div className="setting-header">
                  <h2>{t("Application Language")}</h2>
                </div>

                <div className="setting-item">
                  <div className="setting-details">
                    <h3>{t("Choose Language")}</h3>
                    <p>
                      {t("This changes the language for all text, buttons, and labels in the application.")}
                    </p>
                  </div>
                  <div className="select-wrapper">
                    <select
                      value={i18n.language}
                      onChange={handleSelectChange}
                      className="select-control"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="ru">Русский (Russian)</option>
                      <option value="zh">中文 (Chinese)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
