import { useState } from "react";
import { Eye, EyeClosed } from "phosphor-react";
import { useTranslation } from "react-i18next";

export default function SignUpModal({ toggleModal }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  let messageContent;

  if (success) {
    messageContent = <span style={{ color: "darkGreen" }}>{success}</span>;
  } else if (error) {
    messageContent = <span style={{ color: "darkRed" }}>{error}</span>;
  } else {
    messageContent = <span className="info">{t("fill the form to get started")}</span>;
  }

  /* Sign Up Api  */

  async function SignUpApi(e) {
    try {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      const response = await fetch(`${import.meta.env.VITE_API}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (response.ok) {
        toggleModal("verify");
        setSuccess(result.message);
        setError(null);

        e.target.reset();
      } else {
        setError(result.error);
        setSuccess(null);
      }
    } catch (error) {
      console.error("Error during signup:", error);
    }
  }

  return (
    <form onSubmit={SignUpApi} className="nasted-modal">
      <h1>{t("sign up")}</h1>

      <p> {messageContent} </p>

      <input type="text" placeholder={t("username")} name="userName" />

      <input type="email" placeholder={t("email")} name="email" />
      <div className="password-input-container">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("password")}
          name="password"
        />
        {showPassword ? (
          <Eye
            size={20}
            className="password-icon"
            onClick={() => setShowPassword(!showPassword)}
          />
        ) : (
          <EyeClosed
            size={20}
            className="password-icon"
            onClick={() => setShowPassword(!showPassword)}
          />
        )}
      </div>
      <span className="right-reserved">
        {t("by signing up, you agree to the terms of service and privacy policy")}
      </span>
      <button className="main-button">{t("sign up")} </button>
    </form>
  );
}