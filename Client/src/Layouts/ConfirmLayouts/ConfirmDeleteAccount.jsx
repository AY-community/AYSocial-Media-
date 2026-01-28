import { useTranslation } from "react-i18next";

export default function ConfirmDeleteAcccountModal({
  openModal,
  onConfirm,
  onClose,
  buttonLoading,
  type
}) {
  const { t } = useTranslation();

  const closeModal = () => {
    if (onClose) onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  if (!openModal) return null;

  return (
    <div className={`delete-modal ${openModal ? "open" : ""}`} id="deleteModal">
      <div className="delete-modal-content">
        <div className="delete-modal-header">
          <div className="delete-modal-title-section">
            <h3 className="delete-modal-title">
              {t("Are you sure you want to Delete")} {type}?
            </h3>
          </div>
          <button
            className="delete-modal-close"
            onClick={closeModal}
          ></button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-modal-message">
            {t("Note: This will permanently delete your account and all associated data")}
          </p>

          <div className="delete-modal-actions">
            <button
              className="delete-modal-btn cancel"
              onClick={closeModal}
            >
              {t("Cancel")}
            </button>
            <button
              className="delete-modal-btn delete"
              onClick={handleConfirm}
              disabled={buttonLoading}
            >
              {buttonLoading ? t("Deleting...") : t("Delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}