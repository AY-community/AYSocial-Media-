import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CaretLeft,
  Star,
  ChatCircleText,
  PaperPlaneTilt,
  Heart,
} from "phosphor-react";
import "./Statics.css";
import Header from "../../Layouts/MainLayouts/Header.jsx";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar.jsx";
import BottomNav from "../../Layouts/MainLayouts/BottomNav.jsx";
import { useTranslation } from "react-i18next";
import SEO from "../../Utils/SEO.jsx";

const API_URL = import.meta.env.VITE_API;

export default function Reviews() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({
    feedback: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    setSuccess(false);
  };

  const handleStarClick = (value) => {
    setRating(value);
    if (errors.rating) {
      setErrors({ ...errors, rating: "" });
    }
    setSuccess(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (rating === 0) {
      newErrors.rating = t("Please select a rating");
    }

    if (!formData.feedback.trim()) {
      newErrors.feedback = t("Please provide your feedback");
    } else if (formData.feedback.trim().length < 10) {
      newErrors.feedback = t("Please provide more details (at least 10 characters)");
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
      const response = await fetch(`${API_URL}/review/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          rating: rating,
          feedback: formData.feedback,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ general: data.error || t("Please login to submit a review") });
        } else if (response.status === 400) {
          setErrors({ general: data.error || t("Invalid review data") });
        } else if (response.status === 404) {
          setErrors({ general: data.error || t("User not found") });
        } else {
          setErrors({ general: data.error || t("Failed to submit review") });
        }
        return;
      }

      setSuccess(true);
      setRating(0);
      setFormData({ feedback: "" });

      setTimeout(() => {
        navigate(-1);
      }, 2500);
    } catch (error) {
      console.error("Error submitting review:", error);
      setErrors({ general: t("Network error. Please try again.") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={"Rate Your Experience with AY Social Media"}
        description={"Share your feedback and help us improve AY Social Media. Let us know what you love and what we can do better. Your opinion matters!"}
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
                <Heart size={32} weight="duotone" />
                <h1>{t("Rate Your Experience")}</h1>
                <p>
                  {t("Your feedback helps us improve AY Social Media. Share your thoughts with us!")}
                </p>
              </div>
            </div>

            <div className="rp-card">
              <form onSubmit={handleSubmit}>
                {/* Star Rating */}
                <div className="input-group">
                  <label>{t("Your Rating")}</label>
                  <div className="star-rating-container">
                    <div className="star-rating">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="star-button"
                          onClick={() => handleStarClick(value)}
                          onMouseEnter={() => setHoveredRating(value)}
                          onMouseLeave={() => setHoveredRating(0)}
                        >
                          <Star
                            size={28}
                            weight={(hoveredRating || rating) >= value ? "fill" : "regular"}
                            className={`star-icon ${
                              (hoveredRating || rating) >= value ? "filled" : ""
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="rating-text">
                        {rating <= 2 && t("Poor")}
                        {rating >= 3 && rating <= 4 && t("Fair")}
                        {rating >= 5 && rating <= 6 && t("Good")}
                        {rating >= 7 && rating <= 8 && t("Very Good")}
                        {rating >= 9 && rating <= 10 && t("Excellent")}
                        <span className="rating-number"> ({rating}/10)</span>
                      </p>
                    )}
                  </div>
                  {errors.rating && (
                    <p className="error-message">{errors.rating}</p>
                  )}
                </div>

                <div className="divider"></div>

                {/* Feedback */}
                <div className="input-group">
                  <label>{t("Your Feedback")}</label>
                  <div className="textarea-wrapper">
                    <div className="input-icon">
                      <ChatCircleText size={20} weight="duotone" />
                    </div>
                    <textarea
                      name="feedback"
                      placeholder={t("Tell us about your experience with AY Social Media...")}
                      value={formData.feedback}
                      onChange={handleChange}
                      className={errors.feedback ? "input-error" : ""}
                      disabled={isLoading || success}
                      rows={5}
                    />
                  </div>
                  {errors.feedback ? (
                    <p className="error-message">{errors.feedback}</p>
                  ) : (
                    <p className="input-helper">
                      {t("Share what you love or what we can improve. Your honest feedback matters!")}
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {success && (
                  <div className="success-banner">
                    {t("✓ Thank you for your feedback! We truly appreciate you taking the time to share your thoughts.")}
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
                    disabled={isLoading || success}
                  >
                    <PaperPlaneTilt size={20} weight="bold" />
                    {isLoading
                      ? t("Submitting...")
                      : success
                      ? t("Submitted!")
                      : t("Submit Review")}
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