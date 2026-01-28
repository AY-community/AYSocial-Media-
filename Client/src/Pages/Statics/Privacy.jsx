import "./Statics.css";
import { Shield, Lock, Eye, Fingerprint, ShieldCheck } from "phosphor-react";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import { useTranslation } from "react-i18next";
import SEO from "../../Utils/SEO";

export default function Privacy() {
  const { t } = useTranslation();

  return (
    <>
      <SEO  
        title={t("Privacy Policy ")}
        description={t("At AY Social Media, your privacy is our priority. Learn about our commitment to protecting your data with end-to-end encryption, full transparency, and user control.")}
      />
      <Header />
      <MainSideBar />
      <BottomNav />
      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="privacy-page">
            {/* Hero Section with Plasma Effect */}
            <div className="privacy-hero">
              <div className="plasma-bg">
                <div className="plasma-orb orb-1"></div>
                <div className="plasma-orb orb-2"></div>
                <div className="plasma-orb orb-3"></div>
              </div>

              <div className="hero-content">
                <div className="hero-icon-wrapper">
                  <Shield size={80} weight="duotone" className="hero-shield" />
                </div>
                <h1 className="hero-title">{t("Your Privacy is Our Priority")}</h1>
                <p className="hero-description">
                  {t("We believe in transparency, security, and giving you complete control over your data. At AY Social Media, your trust is everything.")}
                </p>
              </div>
            </div>

            {/* Main Content Section */}
            <div className="privacy-content">
              <div className="content-grid">
                {/* Left Column - Features */}
                <div className="features-column">
                  <div className="feature-item">
                    <div className="feature-icon">
                      <Lock size={28} weight="duotone" />
                    </div>
                    <div className="feature-text">
                      <h3>{t("End-to-End Encryption")}</h3>
                      <p>{t("Your messages and data are encrypted with military-grade security. Only you and your intended recipients can access your content.")}</p>
                    </div>
                  </div>

                  <div className="feature-item">
                    <div className="feature-icon">
                      <Eye size={28} weight="duotone" />
                    </div>
                    <div className="feature-text">
                      <h3>{t("Full Transparency")}</h3>
                      <p>{t("We're upfront about what data we collect and why. No hidden practices, no selling your information to third parties.")}</p>
                    </div>
                  </div>

                  <div className="feature-item">
                    <div className="feature-icon">
                      <Fingerprint size={28} weight="duotone" />
                    </div>
                    <div className="feature-text">
                      <h3>{t("You're in Control")}</h3>
                      <p>{t("Manage your privacy settings, control who sees your content, and delete your data anytime you want.")}</p>
                    </div>
                  </div>

                  <div className="feature-item">
                    <div className="feature-icon">
                      <ShieldCheck size={28} weight="duotone" />
                    </div>
                    <div className="feature-text">
                      <h3>{t("Built on Trust")}</h3>
                      <p>{t("We use industry-standard security measures and continuously update our practices to keep you safe.")}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Commitment Card */}
                <div className="commitment-column">
                  <div className="commitment-card">
                    <h2>{t("Our Commitment to You")}</h2>
                    <div className="commitment-list">
                      <div className="commitment-item">
                        <div className="check-icon">✓</div>
                        <span>{t("We never sell your personal information")}</span>
                      </div>
                      <div className="commitment-item">
                        <div className="check-icon">✓</div>
                        <span>{t("Your data belongs to you, always")}</span>
                      </div>
                      <div className="commitment-item">
                        <div className="check-icon">✓</div>
                        <span>{t("Private by default, visible by choice")}</span>
                      </div>
                      <div className="commitment-item">
                        <div className="check-icon">✓</div>
                        <span>{t("Minimal data collection - only what's necessary")}</span>
                      </div>
                      <div className="commitment-item">
                        <div className="check-icon">✓</div>
                        <span>{t("Delete your account anytime, no questions asked")}</span>
                      </div>
                    </div>

                    <div className="commitment-footer">
                      <p>{t("Have questions about our privacy practices?")}</p>
                      <button className="contact-button">{t("Contact Us")}</button>
                    </div>
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