import "./Statics.css";
import { useTranslation } from "react-i18next";
import { 
  Lightning, 
  Heart,
  Users,
  Sparkle
} from "phosphor-react";

import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import  SEO from "../../Utils/SEO";

export default function About() {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t("About AYS - A New Way to Connect")}
        description={t("Discover AYS, a social platform built for authentic connections. Learn about our story, values, and commitment to privacy and user control. Join us in creating a better social media experience.")}
      />
      <Header />
      <MainSideBar />
      <BottomNav />

    <div className="main-layout">
      <div className="margin-container"></div>
      <div style={{ width: "100%" }}>
        <div className="about-ays-page">
          
          {/* Hero Section */}
          <div className="about-ays-hero">
            <div className="about-ays-gradient-orbs">
              <div className="about-ays-orb about-ays-orb-1"></div>
              <div className="about-ays-orb about-ays-orb-2"></div>
              <div className="about-ays-orb about-ays-orb-3"></div>
            </div>
            
            <div className="about-ays-hero-content">
              <div className="about-ays-logo-circle">
                <span className="about-ays-logo-text">AYS</span>
              </div>
              
              <h1 className="about-ays-hero-title">
                {t("A New Way to Connect")}
              </h1>
              
              <p className="about-ays-hero-description">
                {t("I'm building a social platform that puts people first. No algorithms designed to keep you scrolling endlessly. No selling your data. Just authentic connections and meaningful interactions.")}
              </p>

              <div className="about-ays-features">
                <div className="about-ays-feature">
                  <Lightning size={32} weight="duotone" />
                  <span>{t("Fast & Responsive")}</span>
                </div>
                <div className="about-ays-feature">
                  <Heart size={32} weight="duotone" />
                  <span>{t("User-Focused")}</span>
                </div>
                <div className="about-ays-feature">
                  <Sparkle size={32} weight="duotone" />
                  <span>{t("Creative Tools")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Story & Values Section */}
          <div className="about-ays-content">
            <div className="about-ays-story-card">
              <div className="about-ays-icon-wrapper">
                <Users size={48} weight="duotone" />
              </div>
              <h2 className="about-ays-card-title">{t("Our Story")}</h2>
              <p className="about-ays-card-text">
                {t("AY Social Media started as a simple idea: social media should bring people together, not drive them apart. I wanted to create a space where you control your experience, where your privacy is respected, and where real connections matter more than vanity metrics.")}
              </p>
              <p className="about-ays-card-text">
                {t("I'm a solo developer passionate about building something different. Something that respects your time, protects your data, and celebrates authentic expression. This is just the beginning of the journey, and I'm grateful to have you here.")}
              </p>
            </div>

            <div className="about-ays-values-grid">
              <div className="about-ays-value-item">
                <h3>{t("Privacy First")}</h3>
                <p>{t("Your data is yours. I don't sell it, I don't exploit it. I protect it.")}</p>
              </div>
              <div className="about-ays-value-item">
                <h3>{t("Authentic Connections")}</h3>
                <p>{t("I prioritize real interactions over artificial engagement metrics.")}</p>
              </div>
              <div className="about-ays-value-item">
                <h3>{t("User Control")}</h3>
                <p>{t("You decide what you see, who sees your content, and how you engage.")}</p>
              </div>
              <div className="about-ays-value-item">
                <h3>{t("Continuous Improvement")}</h3>
                <p>{t("I listen to feedback and constantly work to make the platform better.")}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}