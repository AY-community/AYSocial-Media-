import "./theme.css";
import Header from "../../../Layouts/MainLayouts/Header";
import MainSideBar from "../../../Layouts/MainLayouts/MainSideBar";
import { Palette, CaretLeft, Sun, Moon, Desktop, Check } from "phosphor-react";
import BottomNav from "../../../Layouts/MainLayouts/BottomNav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, COLOR_THEMES } from "../../../Context/ThemeContext";
import { useTranslation } from "react-i18next";
import SEO from '../../../Utils/SEO';

const colorPalettes = [
  { key: "Purple", hex: "#8A2BE2" },
  { key: "Blue", hex: "#3B82F6" },
  { key: "Teal", hex: "#14B8A6" },
  { key: "Pink", hex: "#EC4899" },
  { key: "Orange", hex: "#F97316" },
];

export default function Theme() {
  const navigate = useNavigate();
  const { theme, toggleTheme, accentColor, changeAccentColor } = useTheme();
  const { t } = useTranslation();

  const [themeMode, setThemeMode] = useState(() => {
    const savedMode = localStorage.getItem("themeMode");
    return savedMode || "system";
  });

  const themes = [
    {
      value: "system",
      label: t("System Default"),
      description: t("Automatically matches your operating system's current theme."),
      icon: <Desktop size={20} />,
    },
    {
      value: "light",
      label: t("Light Mode"),
      description: t("A bright, high-contrast theme suitable for daytime use."),
      icon: <Sun size={20} />,
    },
    {
      value: "dark",
      label: t("Dark Mode"),
      description: t("A dark, low-light theme that reduces eye strain at night."),
      icon: <Moon size={20} />,
    },
  ];

  useEffect(() => {
    const handleSystemThemeChange = (e) => {
      if (themeMode === "system") {
        const newTheme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    };

    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkModeQuery.addEventListener("change", handleSystemThemeChange);

    if (themeMode === "system") {
      const systemTheme = darkModeQuery.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", systemTheme);
    } else {
      document.documentElement.setAttribute("data-theme", themeMode);
    }

    return () => {
      darkModeQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  const handleThemeChange = (newMode) => {
    setThemeMode(newMode);
    localStorage.setItem("themeMode", newMode);

    if (newMode === "system") {
      const systemPreference = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.setAttribute("data-theme", systemPreference);
    } else {
      document.documentElement.setAttribute("data-theme", newMode);
    }
  };

  const handleAccentChange = (colorKey) => {
    changeAccentColor(colorKey);
  };

  return (
    <>
      <SEO
        title={"Theme Settings"}
        description={"Customize how the application looks by selecting a theme and accent color."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container"></div>

        <div style={{ width: "100%" }}>
          <div className="theme-container">
            <div className="theme-info-banner">
              <button
                className="theme-back-btn"
                onClick={() => navigate("/settings")}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back to Settings")}
              </button>
              <div className="theme-header-content">
                <Palette size={32} weight="duotone" />
                <h1>{t("Theme")}</h1>
                <p>
                  {t("Customize how the application looks by selecting a theme and accent color.")}
                </p>
              </div>
            </div>

            <div className="theme-card">
              <div className="setting-group">
                <div className="setting-header">
                  <h2>{t("Primary Accent Color")}</h2>
                  <p className="setting-description">
                    {t("Choose your preferred accent color. It adapts to both light and dark modes.")}
                  </p>
                </div>

                <div className="color-swatch-list">
                  {colorPalettes.map((color) => (
                    <div
                      key={color.key}
                      className={`color-swatch-item ${
                        accentColor === color.key.toLowerCase()
                          ? "selected-swatch"
                          : ""
                      }`}
                      onClick={() =>
                        handleAccentChange(color.key.toLowerCase())
                      }
                      style={{ backgroundColor: color.hex }}
                    >
                      {accentColor === color.key.toLowerCase() && (
                        <Check size={20} color="white" weight="bold" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider"></div>

              <div className="setting-group">
                <div className="setting-header">
                  <h2>{t("Light & Dark Mode")}</h2>
                  <p className="setting-description">
                    {t("Select how the app should appear.")}
                  </p>
                </div>

                <div className="theme-options-list">
                  {themes.map((themeOption) => (
                    <label
                      key={themeOption.value}
                      className={`theme-option-item ${
                        themeMode === themeOption.value ? "selected-theme" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme-selector"
                        value={themeOption.value}
                        checked={themeMode === themeOption.value}
                        onChange={() => handleThemeChange(themeOption.value)}
                        className="theme-radio-input"
                      />

                      <div className="theme-details">
                        <div className="theme-icon-label">
                          {themeOption.icon}
                          <h3>{themeOption.label}</h3>
                        </div>
                        <p>{themeOption.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
