import { useTranslation } from "react-i18next";
import Planning from "../../assets/Brazuca - Planning1.png";
import Planning2 from "../../assets/Brazuca - Planning2.png";

export default function ContentModal({
  toggleModal,
  display,
  userName,
  postNumber,
  videoNumber,
}) {
  const { t } = useTranslation();

  return (
    <div
      className="modal-overlay"
      style={{ display: display ? "flex" : "none" }}
    >
      <div className="modal" style={{ overflow: "hidden" }}>
        {postNumber === 0 && videoNumber === 0 ? (
          <div className="modal-content-number-body">
            <img src={Planning2} width="45%" alt="contentImage" />
            <h2>{t("No Content yet")}</h2>
            <p>
              {userName} {t("hasn't created any posts or videos yet. Starting to share content is the first step to growing an audience — the sooner they begin, the faster their reach will grow!")}
            </p>
          </div>
        ) : (
          <div className="modal-content-number-body">
            <img src={Planning} width="50%" alt="contentImage" />
            <h2>{t("total of Content")}</h2>
            <p>
              {userName} {t("has created a total of")} {postNumber} {t("posts and")} {videoNumber} {t("videos. The more posts and videos they share, the bigger their audience will grow over time.")}
            </p>
          </div>
        )}

        <div className="modal-actions" style={{ borderTop: "none" }}>
          <button
            className="btn btn-primary"
            id="applyBtn"
            onClick={toggleModal}
          >
            {t("Ok")}
          </button>
        </div>
      </div>
    </div>
  );
}