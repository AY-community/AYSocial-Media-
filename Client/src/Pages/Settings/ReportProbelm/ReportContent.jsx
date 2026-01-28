import "./reportProblem.css";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../Layouts/MainLayouts/Header";
import MainSideBar from "../../../Layouts/MainLayouts/MainSideBar";
import {
  CaretLeft,
  Warning,
  Article,
  ChatCircleText,
  PaperPlaneTilt,
} from "phosphor-react";
import BottomNav from "../../../Layouts/MainLayouts/BottomNav";
import { useTranslation } from "react-i18next";

import SEO from '../../../Utils/SEO';
const API_URL = import.meta.env.VITE_API;

export default function ReportContent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();

  const [contentInfo, setContentInfo] = useState(null);
  const [loadingContent, setLoadingContent] = useState(true);

  const [formData, setFormData] = useState({
    reason: "",
    additionalInfo: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reportReasons = [
    { value: "spam", label: t("Spam or misleading content") },
    { value: "harassment", label: t("Harassment or bullying") },
    { value: "inappropriate", label: t("Inappropriate or offensive content") },
    { value: "violence", label: t("Violence or dangerous content") },
    { value: "hate_speech", label: t("Hate speech or discrimination") },
    { value: "nudity", label: t("Nudity or sexual content") },
    { value: "false_info", label: t("False information") },
    { value: "copyright", label: t("Copyright violation") },
    { value: "other", label: t("Other") },
  ];

  useEffect(() => {
    fetchContentInfo();
  }, [id]);

  const fetchContentInfo = async () => {
    try {
      setLoadingContent(true);
      const response = await fetch(`${API_URL}/feed/${id}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setContentInfo(data.item);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    setSuccess(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.reason) {
      newErrors.reason = t("Please select a reason for reporting");
    }

    if (!formData.additionalInfo.trim()) {
      newErrors.additionalInfo = t("Please provide additional details");
    } else if (formData.additionalInfo.trim().length < 10) {
      newErrors.additionalInfo = t(
        "Please provide more details (at least 10 characters)"
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm() || !contentInfo) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccess(false);

    try {
      const response = await fetch(`${API_URL}/report/report-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          contentId: id,
          contentType: contentInfo.type,
          reason: formData.reason,
          additionalInfo: formData.additionalInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setErrors({
            general: data.error || t("Content not found"),
          });
        } else if (response.status === 400) {
          setErrors({ general: data.error || t("Invalid report data") });
        } else if (response.status === 401) {
          setErrors({ general: data.error || t("Please login to submit a report") });
        } else {
          setErrors({ general: data.error || t("Failed to submit report") });
        }
        return;
      }

      setSuccess(true);
      setFormData({
        reason: "",
        additionalInfo: "",
      });

      setTimeout(() => {
        navigate(-1);
      }, 2500);
    } catch (error) {
      console.error("Error submitting report:", error);
      setErrors({ general: t("Network error. Please try again.") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={"Report Content"}
        description={"Report inappropriate or violating content on AYSocial to help maintain a safe community."}
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container"></div>

        <div style={{ width: "100%" }}>
          <div className="rp-container">
            <div className="rp-info-banner">
              <button
                className="rp-back-btn"
                onClick={() => navigate(-1)}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back")}
              </button>
              <div className="rp-header-content">
                <Warning size={32} weight="duotone" />
                <h1>{t("Report Content")}</h1>
                <p>
                  {t(
                    "Help us maintain a safe community by reporting posts or videos that violate our guidelines."
                  )}
                </p>
              </div>
            </div>

            {/* Content Preview */}
            {loadingContent ? (
              <div className="rp-card" style={{ textAlign: "center", padding: "2rem" }}>
                <div className="spinner"></div>
                <p>{t("Loading content...")}</p>
              </div>
            ) : contentInfo ? (
              <div className="rp-card" style={{ marginBottom: "1rem" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
                  {t("Content Preview")}
                </h3>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "8px",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "start",
                  }}
                >
                  <img
                    src={contentInfo.user?.profilePic || "https://via.placeholder.com/40"}
                    alt={contentInfo.user?.userName}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                      {contentInfo.user?.userName || t("Unknown User")}
                    </div>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {contentInfo.description || t("No description")}
                    </p>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {contentInfo.type === "video" ? t("Video") : t("Post")} •{" "}
                      {new Date(contentInfo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : <div className="rp-card" style={{ textAlign: "center", padding: "2rem" }}><p>{t("Could not load content to report.")}</p></div>}

            <div className="rp-card">
              <form onSubmit={handleSubmit}>
                {/* Content ID (read-only) */}
                <div className="input-group">
                  <label>{t("Content ID")}</label>
                  <div className="input-wrapper">
                    <div className="input-icon">
                      <Article size={20} weight="duotone" />
                    </div>
                    <input
                      type="text"
                      value={id}
                      disabled
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        cursor: "not-allowed",
                      }}
                    />
                  </div>
                  <p className="input-helper">
                    {contentInfo?.type === "video"
                      ? t("This is the video you are reporting")
                      : t("This is the post you are reporting")}
                  </p>
                </div>

                <div className="divider"></div>

                {/* Reason */}
                <div className="input-group">
                  <label>{t("Reason for Report")}</label>
                  <div className="select-wrapper">
                    <div className="input-icon">
                      <Warning size={20} weight="duotone" />
                    </div>
                    <select
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      className={errors.reason ? "input-error" : ""}
                      disabled={isLoading || success || !contentInfo}
                    >
                      <option value="">{t("Select a reason")}</option>
                      {reportReasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.reason && (
                    <p className="error-message">{errors.reason}</p>
                  )}
                </div>

                {/* Additional Information */}
                <div className="input-group">
                  <label>{t("Additional Information")}</label>
                  <div className="textarea-wrapper">
                    <div className="input-icon">
                      <ChatCircleText size={20} weight="duotone" />
                    </div>
                    <textarea
                      name="additionalInfo"
                      placeholder={t(
                        "Please provide detailed information about why you're reporting this content..."
                      )}
                      value={formData.additionalInfo}
                      onChange={handleChange}
                      className={errors.additionalInfo ? "input-error" : ""}
                      disabled={isLoading || success || !contentInfo}
                      rows={5}
                    />
                  </div>
                  {errors.additionalInfo ? (
                    <p className="error-message">{errors.additionalInfo}</p>
                  ) : (
                    <p className="input-helper">
                      {t(
                        "Provide as much detail as possible to help us review your report."
                      )}
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {success && (
                  <div className="success-banner">
                    {t(
                      "✓ Report submitted successfully! Thank you for helping keep our community safe."
                    )}
                  </div>
                )}

                {/* General Error Message */}
                {errors.general && (
                  <div className="general-error-message">{errors.general}</div>
                )}

                {/* Action Buttons */}
                <div className="rp-actions">
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isLoading || success || !contentInfo}
                  >
                    <PaperPlaneTilt size={20} weight="bold" />
                    {isLoading
                      ? t("Submitting...")
                      : success
                      ? t("Submitted!")
                      : t("Submit Report")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}