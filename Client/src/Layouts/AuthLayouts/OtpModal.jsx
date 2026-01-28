import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function OtpModal({ toggleModal }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [infoMessage, setInfoMessage] = useState(
    t("enter email for otp")
  );
  let MessageContent;

  if (success) {
    MessageContent = <span style={{ color: "darkGreen" }}>{success}</span>;
  } else if (error) {
    MessageContent = <span style={{ color: "darkRed" }}>{error}</span>;
  } else {
    MessageContent = <span className="info">{infoMessage}</span>;
  }
  const navigate = useNavigate();

  /* Clear info message after showing success */
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        setInfoMessage(t("enter otp to process"));
        setSuccess(null);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [success, t]);

  /* Send OTP Api  */
  const SendOtp = async () => {
    const res = await fetch(`${import.meta.env.VITE_API}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.ok) {
      setIsSent(true);
      setOtpSent(true);
      setSuccess(data.message);
      setError(null);
    } else {
      setError(data.error);
      setSuccess(null);
    }
  };

  /* Verify OTP Api*/
  const handleAction = async (e) => {
    e.preventDefault();

    if (!isSent) {
      await SendOtp();
    } else {
      const res = await fetch(`${import.meta.env.VITE_API}/confirm-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        const resetToken = data.token;
        setSuccess(t("otp verified success"));
        setError(null);
        toggleModal("reset", email, resetToken);
      } else {
        setError(data.error);
        setSuccess(null);
      }
    }
  };

  /* Resend OTP Api */
  const handleResend = async () => {
    if (!otpSent) {
      setError(t("havent sent otp yet"));
      return;
    }
    await SendOtp();
    setOtp("");
  };

  return (
    <form
      className="nasted-modal"
      style={{ marginTop: "5px" }}
      onSubmit={handleAction}
    >
      <h1>{t("verify otp")}</h1>

      <div className="otp">
        <p style={{ marginTop: "10px" }}>{MessageContent}</p>

        <input
          style={{
            marginTop: "15px",
            backgroundColor: isSent ? "#e6ffed" : "",
            border: isSent ? "1px solid #4ade80" : "",
            color: isSent ? "#16a34a" : "",
          }}
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSent}
        />

        <input
          type="text"
          placeholder={t("enter otp")}
          value={otp}
          maxLength="6"
          onChange={(e) => setOtp(e.target.value)}
          disabled={!isSent}
          style={{
            cursor: !isSent ? "not-allowed" : "text",
          }}
        />
      </div>

      <span style={{ marginTop: "15px" }}>
        {t("didnt receive otp")} <Link onClick={handleResend} style={{ cursor: "pointer" }}>{t("resend")}</Link>
      </span>

      <div>
        <button className="main-button">{isSent ? t("verify") : t("send")}</button>
      </div>
    </form>
  );
}