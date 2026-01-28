import successImage from "../../Assets/success.png";
import { useTranslation } from "react-i18next";

export default function CreationSuccess({ toggleModal }) {
  const { t } = useTranslation();

  return (
    <div className="nasted-modal">
      <h1>{t("emailVerification")}</h1>
      <p>{t("pleaseCheckYourEmail")}</p>
      <img src={successImage} alt="success" width="40%" />
      <button className="main-button" onClick={() => toggleModal("login")}>
        {t("log In")}
      </button>
    </div>
  );
}