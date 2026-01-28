import { useTranslation } from "react-i18next";

export default function AuthSection() {
  const { t } = useTranslation();

  return (
    <div className="auth-section">
      <h1>{t("appName")}</h1>
      <h3>{t("tagline")}</h3>
      <p>{t("appDescription")}</p>
    </div>
  );
}