import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const COLOR_THEMES = {
  purple: {
    name: "Purple",
    light: "#8A2BE2",
    dark: "#8A2BE2",
  },
  blue: {
    name: "Blue",
    light: "#3B82F6",
    dark: "#60A5FA",
  },
  teal: {
    name: "Teal",
    light: "#14B8A6",
    dark: "#2DD4BF",
  },
  pink: {
    name: "Pink",
    light: "#EC4899",
    dark: "#F472B6",
  },
  orange: {
    name: "Orange",
    light: "#F97316",
    dark: "#FB923C",
  },
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("accentColor") || "purple";
  });

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;

    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = theme === "dark" ? "#090909" : "#ffffff";

    let metaThemeColorMobile = document.querySelector(
      "meta[name='msapplication-TileColor']"
    );
    if (!metaThemeColorMobile) {
      metaThemeColorMobile = document.createElement("meta");
      metaThemeColorMobile.name = "msapplication-TileColor";
      document.head.appendChild(metaThemeColorMobile);
    }
    metaThemeColorMobile.content = theme === "dark" ? "#090909" : "#ffffff";

    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const colorData = COLOR_THEMES[accentColor];
    if (colorData) {
      const root = document.documentElement;

      root.style.setProperty("--primary-light-color", colorData.light);
      root.style.setProperty("--primary-dark-color", colorData.dark);

      localStorage.setItem("accentColor", accentColor);
    }
  }, [accentColor]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const changeAccentColor = (colorKey) => {
    if (COLOR_THEMES[colorKey]) {
      setAccentColor(colorKey);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        accentColor,
        changeAccentColor,
        colorThemes: COLOR_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
