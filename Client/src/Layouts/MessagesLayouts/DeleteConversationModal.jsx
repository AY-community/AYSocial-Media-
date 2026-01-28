import React from "react";
import { useTranslation } from "react-i18next";

const DeleteConversationModal = ({
  isOpen,
  onClose,
  onConfirm,
  buttonLoading,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className={`delete-modal ${isOpen ? "open" : ""}`} id="deleteConversationModal">
      <div className="delete-modal-content">
        <div className="delete-modal-header">
          <div className="delete-modal-title-section">
            <h3 className="delete-modal-title">{t("Delete Conversation?")}</h3>
          </div>
          <button className="delete-modal-close" onClick={onClose}></button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-modal-message">
            {t("Are you sure you want to delete this conversation? This action cannot be undone.")}
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
              {buttonLoading ? t("Deleting...") : t("Delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConversationModal;