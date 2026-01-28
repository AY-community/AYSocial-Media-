import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function CoverModal({ toggleModal, display }) {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customColor, setCustomColor] = useState();
  const [buttonLoading, setButtonLoading] = useState(false);

  const { userName } = useParams();

  const colors = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)",
    "linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)",
    "linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)",
    "linear-gradient(135deg, #6c5ce7 0%, #74b9ff 100%)",
  ];

  useEffect(() => {
    const colorGrid = document.getElementById("colorGrid");
    if (colorGrid) {
      colorGrid.innerHTML = "";

      // Add gradient color circles
      colors.forEach((gradient, index) => {
        const colorCircle = document.createElement("div");
        colorCircle.className = "color-circle";
        colorCircle.style.background = gradient;
        colorCircle.onclick = () => handleColorSelect(gradient, colorCircle);
        colorGrid.appendChild(colorCircle);
      });

      // Add custom color picker (dashed circle)
      const customCircle = document.createElement("div");
      customCircle.className = "color-circle custom-color";
      customCircle.style.backgroundColor = customColor;
      customCircle.innerHTML = '<span class="plus-icon">+</span>';

      const hiddenInput = document.createElement("input");
      hiddenInput.type = "color";
      hiddenInput.value = customColor;
      hiddenInput.style.display = "none";

      customCircle.onclick = () => {
        hiddenInput.click();
      };

      hiddenInput.onchange = (e) => {
        setCustomColor(e.target.value);
        customCircle.style.backgroundColor = e.target.value;
        handleColorSelect(e.target.value, customCircle);
      };

      colorGrid.appendChild(customCircle);
      colorGrid.appendChild(hiddenInput);
    }
  }, [colors, customColor]);

  const handleColorSelect = (color, element) => {
    setSelectedColor(color);
    setSelectedImage(null);

    // Update visual selection
    document.querySelectorAll(".color-circle").forEach((circle) => {
      circle.classList.remove("selected");
    });
    element.classList.add("selected");

    // Enable apply button
    document.getElementById("applyBtn").disabled = false;
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file); // 🔥 Store the actual file for FormData

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result); // Keep this for preview
        setSelectedColor(null); // Clear color selection

        // Clear color selection
        document.querySelectorAll(".color-circle").forEach((circle) => {
          circle.classList.remove("selected");
        });

        // Enable apply button
        document.getElementById("applyBtn").disabled = false;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    document.getElementById("fileInput").click();
  };

  const uploadCoverPic = async (e) => {
    try {
      e.preventDefault();

      if (buttonLoading) return;
      setButtonLoading(true);
      const formData = new FormData();

      if (selectedImage) {
        formData.append("type", "image");
        formData.append("coverPic", selectedFile);
        formData.append("color", "");
      } else {
        formData.append("type", "color");
        formData.append("color", selectedColor);

        formData.append("coverPic", "");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API}/update-cover-pic/${userName}`,
        {
          method: "PUT",
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        console.log("Cover updated successfully:", data.message);
        handleCancel();
        window.location.reload();
      } else {
        console.error("Update failed:", data.message);
      }
    } catch (err) {
      console.error("Something went wrong:", err);
    } finally {
      setButtonLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedColor(null);
    setSelectedImage(null);
    toggleModal();
  };

  return (
    <div
      className="modal-overlay"
      id="coverModal"
      style={{ display: display ? "flex" : "none" }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{t("Change Cover Photo")}</h2>
          <button className="close-btn" onClick={handleCancel}>
            &times;
          </button>
        </div>

        <div className="modal-section">
          <h3 className="section-title">{t("Choose a Color")}</h3>
          <div className="color-grid" id="colorGrid"></div>
        </div>

        <div className="modal-section">
          <h3 className="section-title">{t("Upload Custom Image")}</h3>
          <div className="upload-section" onClick={handleUploadClick}>
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Selected"
                className="preview-image"
              />
            ) : (
              <>
                <div className="upload-icon">📁</div>
                <div className="upload-text">{t("Click to upload an image")}</div>
                <div className="upload-subtext">
                  {t("JPG, PNG, or GIF up to 10MB")}
                </div>
              </>
            )}
          </div>
          <input
            type="file"
            id="fileInput"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            {t("Cancel")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            id="applyBtn"
            onClick={uploadCoverPic}
            disabled={buttonLoading || (!selectedImage && !selectedColor)}
          >
            {buttonLoading ? t("Uploading...") : t("Apply")}
          </button>
        </div>
      </div>
    </div>
  );
}