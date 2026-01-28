import "./ChangePassword.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../Layouts/MainLayouts/Header";
import MainSideBar from "../../../Layouts/MainLayouts/MainSideBar";
import { CaretLeft, Key, Eye, EyeClosed, CheckCircle } from "phosphor-react";
import BottomNav from "../../../Layouts/MainLayouts/BottomNav";
import { useTranslation } from "react-i18next";
import SEO from '../../../Utils/SEO';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error and success when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    setSuccess(false);
  };

  const toggleVisibility = (field) => {
    setShowPassword({ ...showPassword, [field]: !showPassword[field] });
  };

  const validatePassword = (password) => {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[^\w\s]/.test(password);

    return hasLetter && hasNumber && hasSpecialChar;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = t("Current password is required");
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = t("New password is required");
    } else if (
      formData.newPassword.length < 6 ||
      formData.newPassword.length > 20
    ) {
      newErrors.newPassword = t("Password must be between 6 and 20 characters");
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = t(
        "Password must contain at least one letter, one number, and one special character"
      );
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t("Please confirm your new password");
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t("Passwords do not match");
    }

    // Check if new password is different from current
    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword = t(
        "New password must be different from current password"
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccess(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific errors
        if (response.status === 401) {
          setErrors({
            currentPassword: data.error || t("Incorrect current password"),
          });
        } else if (response.status === 400) {
          setErrors({ newPassword: data.error || t("Invalid password") });
        } else {
          setErrors({ general: data.error || t("Failed to update password") });
        }
        return;
      }

      // Success - show message and redirect after delay
      setSuccess(true);
      setTimeout(() => {
        navigate("/settings");
      }, 2000);
    } catch (error) {
      console.error("Error updating password:", error);
      setErrors({ general: t("Network error. Please try again.") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={"Change Password"}
        description={"Change your account password to keep your profile secure."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container"></div>

        <div style={{ width: "100%" }}>
          <div className="cp-container">
            <div className="cp-info-banner">
              <button
                className="cp-back-btn"
                onClick={() => navigate("/settings")}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back to Settings")}
              </button>
              <div className="cp-header-content">
                <Key size={32} weight="duotone" />
                <h1>{t("Change Password")}</h1>
                <p>
                  {t("Ensure your account is using a long, random password to stay secure.")}
                </p>
              </div>
            </div>

            <div className="cp-card">
              <form onSubmit={handleSubmit}>
                {/* Current Password */}
                <div className="input-group">
                  <label>{t("Current Password")}</label>
                  <div className="input-wrapper">
                    <div className="input-icon">
                      <Key size={20} weight="duotone" />
                    </div>
                    <input
                      type={showPassword.current ? "text" : "password"}
                      name="currentPassword"
                      placeholder={t("Enter current password")}
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className={errors.currentPassword ? "input-error" : ""}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => toggleVisibility("current")}
                    >
                      {showPassword.current ? (
                        <EyeClosed size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="error-message">{errors.currentPassword}</p>
                  )}
                </div>

                <div className="divider"></div>

                {/* New Password */}
                <div className="input-group">
                  <label>{t("New Password")}</label>
                  <div className="input-wrapper">
                    <div className="input-icon">
                      <Key size={20} weight="duotone" />
                    </div>
                    <input
                      type={showPassword.new ? "text" : "password"}
                      name="newPassword"
                      placeholder={t("Enter new password")}
                      value={formData.newPassword}
                      onChange={handleChange}
                      className={
                        errors.newPassword
                          ? "input-error"
                          : success
                          ? "input-success"
                          : ""
                      }
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => toggleVisibility("new")}
                    >
                      {showPassword.new ? (
                        <EyeClosed size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  {success ? (
                    <p className="success-message">
                      {t("✓ Password updated successfully! Redirecting...")}
                    </p>
                  ) : errors.newPassword ? (
                    <p className="error-message">{errors.newPassword}</p>
                  ) : (
                    <p className="input-helper">
                      {t("Minimum 6 characters, at least one letter, one number, and one special character.")}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="input-group">
                  <label>{t("Confirm New Password")}</label>
                  <div className="input-wrapper">
                    <div className="input-icon">
                      <Key size={20} weight="duotone" />
                    </div>
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      name="confirmPassword"
                      placeholder={t("Confirm new password")}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={errors.confirmPassword ? "input-error" : ""}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => toggleVisibility("confirm")}
                    >
                      {showPassword.confirm ? (
                        <EyeClosed size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="error-message">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* General Error Message */}
                {errors.general && (
                  <div className="general-error-message">{errors.general}</div>
                )}

                {/* Action Buttons */}
                <div className="cp-actions">
                  <button
                    type="submit"
                    className="btn-save"
                    disabled={isLoading || success}
                  >
                    <CheckCircle size={20} weight="bold" />
                    {isLoading
                      ? t("Updating...")
                      : success
                      ? t("Success!")
                      : t("Update Password")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
