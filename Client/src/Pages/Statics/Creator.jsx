import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./statics.css";
import { 
  GithubLogo, 
  FacebookLogo,
  Code,
  Brain,
  Sparkle,
  Lightning
} from "phosphor-react";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import cssImg from '../../assets/Skills/css.png';
import expressImg from '../../assets/Skills/express.png';
import jsImg from '../../assets/Skills/js.png';
import mongodbImg from '../../assets/Skills/mongodb.png';
import nodeImg from '../../assets/Skills/node.png';
import reactImg from '../../assets/Skills/react.png';
import SEO from "../../Utils/SEO";


export default function Creator() {
  const { t } = useTranslation();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
    }));
    setParticles(newParticles);
  }, []);

  const philosophies = [
    {
      icon: <Code size={28} weight="duotone" />,
      text: t("Code is poetry written in logic, where every function tells a story and every algorithm solves a puzzle of human need.")
    },
    {
      icon: <Brain size={28} weight="duotone" />,
      text: t("In the intersection of computer science and human experience lies the true art of creation—building bridges between imagination and reality.")
    },
    {
      icon: <Sparkle size={28} weight="duotone" />,
      text: t("Every line of code is a brushstroke on the canvas of possibility. We don't just build applications; we craft experiences that resonate with the human spirit.")
    },
    {
      icon: <Lightning size={28} weight="duotone" />,
      text: t("Technology is the medium, but the message is connection. In a world of infinite digital noise, I choose to build platforms that amplify authentic voices.")
    }
  ];

  return (
    <>
      <SEO
        title={"About the Creator - Aymen Chedri Maamer"}
        description={"Learn about Aymen Chedri Maamer, the visionary Full Stack Developer and Computer Science student behind AYS. Discover his philosophy, skills, and passion for building authentic digital experiences. Connect with Aymen on GitHub and Facebook."}
      />
      <Header />
      <MainSideBar />
      <BottomNav />
    <div className="main-layout creator-main-layout">
      <div className="margin-container"></div>
      <div style={{ width: "100%" }}>
        <div className="creator-page">
          
          {/* Particle Background */}
          <div className="creator-particle-bg">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="creator-particle"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animation: `creator-particle-float ${10 + Math.random() * 10}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>

          {/* Hero Section with 3D Effect */}
          <div 
            className="creator-hero"
            style={{
              transform: `perspective(1000px) rotateX(${(mousePos.y - window.innerHeight / 2) / 400}deg) rotateY(${(mousePos.x - window.innerWidth / 2) / 400}deg)`
            }}
          >
            <div className="creator-hero-glow"></div>
            
            <div className="creator-profile-section">
              <div className="creator-avatar-wrapper">
                <div className="creator-avatar-ring creator-ring-1"></div>
                <div className="creator-avatar-ring creator-ring-2"></div>
                <div className="creator-avatar-ring creator-ring-3"></div>
                <div className="creator-avatar">
                  <span className="creator-avatar-initial"></span>
                </div>
                <div className="creator-tech-orbit">
                  <div className="creator-tech-badge creator-badge-1" style={{ '--orbit-delay': '0s' }}><img src={reactImg} alt="React"/></div>
                  <div className="creator-tech-badge creator-badge-2" style={{ '--orbit-delay': '1s' }}><img src={nodeImg} alt="Node.js"/></div>
                  <div className="creator-tech-badge creator-badge-3" style={{ '--orbit-delay': '2s' }}><img src={mongodbImg} alt="MongoDB"/></div>
                  <div className="creator-tech-badge creator-badge-4" style={{ '--orbit-delay': '3s' }}><img src={expressImg} alt="Express"/></div>
                  <div className="creator-tech-badge creator-badge-5" style={{ '--orbit-delay': '4s' }}><img src={jsImg} alt="JavaScript"/></div>
                  <div className="creator-tech-badge creator-badge-6" style={{ '--orbit-delay': '5s' }}><img src={cssImg} alt="CSS"/></div>
                </div>
              </div>

              <div className="creator-identity">
                <h1 className="creator-name">
                  <span className="creator-name-part">Aymen</span>
                  <span className="creator-name-part creator-name-highlight">Chedri Maamer</span>
                </h1>
                <div className="creator-title-cascade">
                  <span className="creator-role">{t("Full Stack Developer")}</span>
                  <span className="creator-separator">•</span>
                  <span className="creator-role">{t("Computer Science Student")}</span>
                  <span className="creator-separator">•</span>
                  <span className="creator-role">{t("Digital Architect")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Philosophy Section */}
          <div className="creator-philosophy-section">
            <h2 className="creator-section-title">
              <span className="creator-title-line"></span>
              {t("Philosophy & Vision")}
              <span className="creator-title-line"></span>
            </h2>

            <div className="creator-philosophy-grid">
              {philosophies.map((philosophy, index) => (
                <div 
                  key={index} 
                  className="creator-philosophy-card"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="creator-philosophy-icon">
                    {philosophy.icon}
                  </div>
                  <p className="creator-philosophy-text">{philosophy.text}</p>
                  <div className="creator-card-shine"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect Section */}
          <div className="creator-connect-section">
            <div className="creator-connect-content">
              <h2 className="creator-connect-title">{t("Let's Build Something Together")}</h2>
              <p className="creator-connect-subtitle">
                {t("Every great project starts with a conversation. Whether you have an idea, feedback, or just want to connect—I'd love to hear from you.")}
              </p>
              
              <div className="creator-social-buttons">
                <a 
                  href="https://github.com/AY-community" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="creator-social-btn creator-github-btn"
                >
                  <GithubLogo size={24} weight="fill" />
                  <span>{t("View on GitHub")}</span>
                  <div className="creator-btn-glow"></div>
                </a>
                
                <a 
                  href="https://www.facebook.com/chedri.maamer.aymen/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="creator-social-btn creator-facebook-btn"
                >
                  <FacebookLogo size={24} weight="fill" />
                  <span>{t("Connect on Facebook")}</span>
                  <div className="creator-btn-glow"></div>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}