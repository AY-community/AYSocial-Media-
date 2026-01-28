import { useState } from "react";
import { Eye, EyeClosed } from "phosphor-react";
import { useTranslation } from "react-i18next";

export default function ResetModal({ toggleModal, email, token }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [infoMessage, setInfoMessage] = useState(
    t("enter your new password to reset it")
  );

  let messageContent;

  if (success) {
    messageContent = <span style={{ color: "darkGreen" }}>{success}</span>;
  } else if (error) {
    messageContent = <span style={{ color: "darkRed" }}>{error}</span>;
  } else {
    messageContent = <span className="info">{infoMessage}</span>;
  }

  /* Reset Password Api */

  const ResetFetchApi = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPassword = formData.get("newPassword");
    const confirmNewPassword = formData.get("confirmNewPassword");
    const res = await fetch(`${import.meta.env.VITE_API}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmNewPassword, token }),
    });
    const data = await res.json();
    if (res.ok) {
      toggleModal("login");
      e.target.reset();
      setSuccess(data.message);
      setError(null);
    } else {
      setError(data.error);
      setSuccess(null);
    }
  };

  return (
    <form
      className="nasted-modal"
      style={{ marginTop: "15px" }}
      onSubmit={ResetFetchApi}
    >
      <h1 className="large-h1">{t("reset password")}</h1>
      <h1 className="small-h1">{t("reset pass")}</h1>
      <div className="reset-password">
        <p style={{ marginBottom: "10px" }}>{messageContent}</p>
        <input type="email" value={email} readOnly />
        <div className="password-input-container">
          <input
            type={showPassword1 ? "text" : "password"}
            placeholder={t("new password")}
            name="newPassword"
          />
          {showPassword1 ? (
            <Eye
              size={20}
              className="password-icon"
              onClick={() => setShowPassword1(!showPassword1)}
            />
          ) : (
            <EyeClosed
              size={20}
              className="password-icon"
              onClick={() => setShowPassword1(!showPassword1)}
            />
          )}
        </div>
        <div className="password-input-container">
          <input
            type={showPassword2 ? "text" : "password"}
            placeholder={t("confirm password")}
            name="confirmNewPassword"
          />
          {showPassword2 ? (
            <Eye
              size={20}
              className="password-icon"
              onClick={() => setShowPassword2(!showPassword2)}
            />
          ) : (
            <EyeClosed
              size={20}
              className="password-icon"
              onClick={() => setShowPassword2(!showPassword2)}
            />
          )}
        </div>{" "}
        <p></p>
      </div>
      <button className="main-button" style={{ marginBottom: "25px" }}>
        {t("reset")}
      </button>
    </form>
  );
}