import OauthButton from "../../Components/Auth/OauthButton";
import { useTranslation } from "react-i18next";

export default function AuthBox({ toggleModal }) {
  const { t } = useTranslation();

  return (
    <div className="auth-box">
      <h1>{t("joinUs")}</h1>
      <OauthButton />
      <hr />
      <div>
        <button className="main-button" onClick={() => toggleModal("signup")}>
          {t("createAccount")}
        </button>
        <span>
          {t("bySigningUp")}{" "}
          <span className="terms">{t("termsOfService")}</span> {t("and")}{" "}
          <span className="terms">{t("privacyPolicy")}</span>,
        </span>
      </div>
      <div>
        <p className="already-have-account">{t("alreadyHaveAccount")}</p>
        <button
          className="secondary-button"
          onClick={() => toggleModal("login")}
        >
          {t("log In")}
        </button>
      </div>
    </div>
  );
}