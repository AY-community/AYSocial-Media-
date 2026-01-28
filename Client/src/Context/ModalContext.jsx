import { createContext, useContext, useState } from "react";
import AddPostModal from "../Layouts/PostLayouts/AddPostModal";
import AddVideoModal from "../Layouts/PostLayouts/AddVideoModal";

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const openPostModal = () => {
    setShowPostModal(true);
    setShowVideoModal(false);
  };

  const closePostModal = () => setShowPostModal(false);

  const openVideoModal = () => {
    setShowVideoModal(true);
    setShowPostModal(false);
  };

  const closeVideoModal = () => setShowVideoModal(false);

  return (
    <ModalContext.Provider
      value={{
        openPostModal,
        closePostModal,
        openVideoModal,
        closeVideoModal,
      }}
    >
      {children}

      {showPostModal && (
        <AddPostModal
          toggleModal={closePostModal}
          display={showPostModal}
          onClose={closePostModal}
        />
      )}

      {showVideoModal && (
        <AddVideoModal
          toggleModal={closeVideoModal}
          display={showVideoModal}
          onClose={closeVideoModal}
        />
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => useContext(ModalContext);
