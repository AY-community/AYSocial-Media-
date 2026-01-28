import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Layouts/Layouts.css";
import { X } from "phosphor-react";
import AuthSection from "../Layouts/AuthLayouts/AuthSection";
import AuthBox from "../Layouts/AuthLayouts/AuthBox";
import LoginModal from "../Layouts/AuthLayouts/LoginModal";
import SignUpModal from "../Layouts/AuthLayouts/SignUpModal";
import OtpModal from "../Layouts/AuthLayouts/OtpModal";
import ResetModal from "../Layouts/AuthLayouts/ResetPassword";
import ProfileModal from "../Layouts/AuthLayouts/ProfileModal";
import BirthdayModal from "../Layouts/AuthLayouts/birthdayModal";
import VerifyModal from "../Layouts/AuthLayouts/CreationSuccess";

import SEO from "../Utils/SEO";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [fadeState, setFadeState] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [sharedEmail, setSharedEmail] = useState("");
  const [sharedToken, setSharedToken] = useState("");
  const [tokenConsumed, setTokenConsumed] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const tokenFromState = location.state?.token || "";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API}/auth-check`, {
          credentials: "include",
        });

        if (res.status === 403) {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Auth check failed:", err.message);
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (tokenFromState) {
      setSharedToken(tokenFromState);
      setTokenConsumed(true);
      window.history.replaceState({}, "", window.location.pathname);

      const timeout = setTimeout(() => {
        openModal("birthday", null, tokenFromState);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [tokenFromState]);

  const fadeIn = {
    animationName: "fade",
    animationDuration: "0.5s",
    animationTimingFunction: "ease",
    animationFillMode: "forwards",
  };

  const fadeOut = {
    animationName: "fade-out",
    animationDuration: "0.5s",
    animationTimingFunction: "ease",
    animationFillMode: "forwards",
  };

  const modalCard = () => {
    return (
      <div
        className="card modal-container"
        style={fadeState === "in" ? fadeIn : fadeOut}
      >
        <div className="modal-card">
          <X size={31} className="close-icon" onClick={() => closeModal()} />
          {modalContent === "login" && (
            <LoginModal toggleModal={openModal} success={successMessage} />
          )}
          {modalContent === "signup" && <SignUpModal toggleModal={openModal} />}
          {modalContent === "otp" && <OtpModal toggleModal={openModal} />}
          {modalContent === "verify" && <VerifyModal toggleModal={openModal} />}
          {modalContent === "reset" && (
            <ResetModal
              toggleModal={openModal}
              email={sharedEmail}
              token={sharedToken}
            />
          )}
          {modalContent === "profile" && (
            <ProfileModal toggleModal={openModal} token={sharedToken} />
          )}
          {modalContent === "birthday" && (
            <BirthdayModal toggleModal={openModal} token={sharedToken} />
          )}
        </div>
      </div>
    );
  };

  const openModal = (newContent, Email, Token, success) => {
    if (Email) setSharedEmail(Email);
    if (Token) setSharedToken(Token);
    if (success) setSuccessMessage(success);
    else if (newContent === "login") setSuccessMessage(null); // ← add this

    if (modalContent) {
      setFadeState("out");
      setTimeout(() => {
        setModalContent(newContent);
        setFadeState("in");
      }, 200);
    } else {
      setModalContent(newContent);
      setFadeState("in");
    }
  };

  const closeModal = () => {
    setFadeState("out");
    setTimeout(() => {
      setFadeState(null);
      setModalContent(null);
    }, 300);
  };

  return (
    <>
    <SEO
        title={"Authentication - AY Social Media"}
        description={"Access your AY Social Media account by logging in or signing up. Enjoy a secure and personalized social experience with features like password reset, profile setup, and more."}
      />
      {fadeState && modalCard()}
      <div className="auth-container">

        <AuthSection />
        <AuthBox toggleModal={openModal} />
      </div>
    </>
  );
}
