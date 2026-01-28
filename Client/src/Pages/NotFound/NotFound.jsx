import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Ghost, House } from "phosphor-react";
import "./NotFound.css";
import SEO from "../../Utils/SEO";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
        <SEO 
          title={"Page Not Found"}
          description={"The page you are looking for does not exist."}
          noIndex={true}/>
      <Header />
      <MainSideBar />
      <div className="home-page-main-layout">
        <div className="margin-container"></div>

        <div className="notfound-content-wrapper">
          <div className="notfound-container">
            <div className="notfound-icon-wrapper">
              <Ghost size={120} weight="duotone" className="notfound-icon" />
            </div>
            
            <h1 className="notfound-title">404</h1>
            <h2 className="notfound-subtitle">{t("Page Not Found")}</h2>
            <p className="notfound-text">
              {t("The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.")}
            </p>

            <button 
              className="notfound-home-btn" 
              onClick={() => navigate("/")}
            >
              <House size={20} weight="bold" />
              {t("Back to Home")}
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}