import React from "react";
import { useTranslation } from "react-i18next";

const BlockConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  username,
  buttonLoading,
}) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className={`delete-modal ${isOpen ? "open" : ""}`} id="blockModal">
      <div className="delete-modal-content">
        <div className="delete-modal-header">
          <div className="delete-modal-title-section">
            <h3 className="delete-modal-title">
              {t("Block @")}
              {username}?
            </h3>
          </div>
          <button className="delete-modal-close" onClick={onClose}></button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-modal-message">
            {t("They will not be able to follow you or view your posts, and you will not see posts or notifications from")} @{username}.
          </p>

          <div className="delete-modal-actions">
            <button className="delete-modal-btn cancel" onClick={onClose}>
              {t("Cancel")}
            </button>
            <button
              className="delete-modal-btn delete"
              onClick={onConfirm}
              disabled={buttonLoading}
            >
              {buttonLoading ? t("Blocking...") : t("Block")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockConfirmationModal;