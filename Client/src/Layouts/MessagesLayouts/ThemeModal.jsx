import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ThemeModal.css';

const themes = [
  { name: 'Default', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Hyper', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Kiwi', color: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)' },
  { name: 'Forest', color: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)' },
  { name: 'Night Sky', color: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' },
  { name: 'Plum', color: 'linear-gradient(135deg, #4c1130 0%, #dd2476 100%)' },
  { name: 'Fire', color: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' },
  { name: 'Grape', color: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 100%, #ffaf7b 100%)' },
  { name: 'Ocean', color: 'linear-gradient(135deg, #0052D4 0%, #4364F7 100%, #6FB1FC 100%)' },
  { name: 'Passion', color: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)' },
  { name: 'Ver', color: 'linear-gradient(135deg, #6c5ce7 0%, #74b9ff 100%)' },
  { name: 'Crystalline', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
];

const ThemeModal = ({ isOpen, onClose, onSelectTheme, currentTheme, conversationId }) => {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    const colorGrid = document.getElementById('themeColorGrid');
    if (colorGrid && isOpen) {
      colorGrid.innerHTML = '';

      // Add gradient color circles
      themes.forEach((theme) => {
        const colorCircle = document.createElement('div');
        colorCircle.className = 'color-circle';
        colorCircle.style.background = theme.color;
        if (selectedTheme === theme.color) {
          colorCircle.classList.add('selected');
        }
        colorCircle.onclick = () => handleThemeSelect(theme.color, colorCircle);
        colorGrid.appendChild(colorCircle);
      });
    }
  }, [isOpen, selectedTheme]);

  const handleThemeSelect = (color, element) => {
    setSelectedTheme(color);

    // Update visual selection
    document.querySelectorAll('.color-circle').forEach((circle) => {
      circle.classList.remove('selected');
    });
    element.classList.add('selected');

    // Enable apply button
    const applyBtn = document.getElementById('themeApplyBtn');
    if (applyBtn) {
      applyBtn.disabled = false;
    }
  };

  const handleApply = async () => {
    if (!selectedTheme || buttonLoading || !conversationId) return;
    
    try {
      setButtonLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API}/messages/${conversationId}/theme`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            themeColor: selectedTheme,
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        console.log("Theme updated successfully:", data.message);
        onSelectTheme(selectedTheme);
        onClose();
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
    setSelectedTheme(currentTheme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay theme-modal-container" onClick={handleCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t("Change Theme")}</h2>
          <button className="close-btn" onClick={handleCancel}>
            &times;
          </button>
        </div>

        <div className="modal-section">
          <div className="color-grid" id="themeColorGrid"></div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            {t("Cancel")}
          </button>
          <button
            className="btn btn-primary"
            id="themeApplyBtn"
            onClick={handleApply}
            disabled={buttonLoading || !selectedTheme || !conversationId}
          >
            {buttonLoading ? t("Applying...") : t("Apply")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;