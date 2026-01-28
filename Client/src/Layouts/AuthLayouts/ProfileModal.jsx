import { useState, useEffect } from "react";
import vectorImage from "/addImage.jpg";
import { useTranslation } from "react-i18next";

export default function ProfileModal({ toggleModal, token }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [buttonContent, setButtonContent] = useState(t("skip"));
  const [loading, setLoading] = useState(false);

  let messageContent;

  if (success) {
    messageContent = <span style={{ color: "darkGreen" }}>{success}</span>;
  } else if (error) {
    messageContent = <span style={{ color: "darkRed" }}>{error}</span>;
  } else {
    messageContent = (
      <span className="info">
        {" "}
        {t("upload your profile picture to help others recognize you")}
      </span>
    );
  }

  useEffect(() => {
    setButtonContent(selectedImage ? t("upload") : t("skip"));
  }, [selectedImage, t]);

  /* Handle Image Selection */

  const handleImageChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const preview = URL.createObjectURL(selected);
      setSelectedImage(preview);
      setFile(selected);
    }
  };

  /* Upload Profile Pic Api */

  const uploadProfilePic = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    if (buttonContent === t("skip") || !file) {
      toggleModal(
        "login",
        null,
        null,
        t("you're all set! log in now to enjoy the full experience")
      );
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("profilePic", file);
    formData.append("token", token);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/add-profile-pic`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        toggleModal(
          "login",
          null,
          null,
          t("you're all set! log in now to enjoy the full experience")
        );
      } else {
        setError(data.error || t("upload failed try again"));
      }
    } catch (err) {
      setError(t("something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="nasted-modal" onSubmit={uploadProfilePic}>
      <h1>{t("add profile pic")}</h1>
      <p>{messageContent}</p>
      <div
        className="image-placeholder"
        style={{
          backgroundImage: `url(${selectedImage || vectorImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      <button className="main-button" disabled={loading}>
        {" "}
        {loading ? t("uploading") : buttonContent}
      </button>
    </form>
  );
}