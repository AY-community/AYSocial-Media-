import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function VerifyPage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAccount = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API}/verify/${token}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        const profileToken = data.token;

        if (response.ok) {
          navigate("/auth", { state: { token: profileToken } });
        } else {
        }
      } catch (err) {
        navigate("/error");
      }
    };

    verifyAccount();
  }, [token, navigate]);

  return <p>{t("verifying account, please wait")}</p>;
}