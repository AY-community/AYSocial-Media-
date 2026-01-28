import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <footer className="main-footer">
      <ul>
        <li onClick={() => navigate("/about")} style={{ cursor: "pointer" }}>
          {t("About")}
        </li>
        <li onClick={() => navigate("/creator")} style={{ cursor: "pointer" }}>
          {t("Creator")}
        </li>
        <li onClick={() => navigate("/privacy")} style={{ cursor: "pointer" }}>
          {t("Privacy")}
        </li>
        <li onClick={() => navigate("/reviews")} style={{ cursor: "pointer" }}>
          {t("Reviews")}
        </li>
      </ul>
      <p>
        {" "}
        <span>© {new Date().getFullYear()} </span> AY Social Media. {t("All rights reserved.")}
      </p>
    </footer>
  );
}