import { useState, useEffect } from "react";
import { Eye, EyeClosed } from "phosphor-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import OauthButton from "../../Components/Auth/OauthButton";
import { useTranslation } from "react-i18next";

export default function LoginModal({ toggleModal, success }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(null);
  const [completionMessage, setCompletionMessage] = useState(success);
  const [showPassword, setShowPassword] = useState(false);

  const { setUser } = useAuth();
  let messageContent;

  if (completionMessage) {
    messageContent = (
      <span style={{ color: "darkGreen" }}>{completionMessage}</span>
    );
  } else if (loginSuccess) {
    messageContent = (
      <span style={{ color: "darkGreen", textAlign: "center" }}>
        {loginSuccess}
      </span>
    );
  } else if (error) {
    messageContent = (
      <span style={{ color: "darkRed", textAlign: "center" }}>{error}</span>
    );
  } else {
    messageContent = (
      <span className="info">{t("enter Login Informaions To Log In")}</span>
    );
  }

  useEffect(() => {
    setCompletionMessage(success);
  }, [success]);

  /*  Log In Api  */
  async function handleLogin(e) {
    try {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      const response = await fetch(`${import.meta.env.VITE_API}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setLoginSuccess(result.message);

        try {
          const authResponse = await fetch(
            `${import.meta.env.VITE_API}/auth-check`,
            {
              credentials: "include",
            }
          );

          if (authResponse.status === 403) {
            const userData = await authResponse.json();
            setUser(userData);

            window.location.href = "/";
          } else {
            setError(t("loginSuccessProfileError"));
          }
        } catch (authError) {
          setError(t("loginSuccessProfileError"));
        }
      } else if (response.status === 428) {
        toggleModal(
          "birthday",
          null,
          result.token,
          t("pleaseAddBirthdayToComplete")
        );
      } else {
        setError(result.error);
        setLoginSuccess(null);
      }
    } catch (error) {
      setError(t("loginErrorOccurred"));
    }
  }

  return (
    <form className="nasted-modal" onSubmit={handleLogin}>
      <h1>{t("login")}</h1>
      <OauthButton />
      {messageContent}
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
      <Link className="forgot-password" onClick={() => toggleModal("otp")}>
        {t("forgotPassword")}
      </Link>
      <button className="main-button">{t("log In")}</button>
    </form>
  );
}