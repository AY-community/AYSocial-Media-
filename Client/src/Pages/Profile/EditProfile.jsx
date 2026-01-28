import "./profile.css";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import Header from "../../Layouts/MainLayouts/Header";
import MainSideBar from "../../Layouts/MainLayouts/MainSideBar";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import { MapPin, Camera } from "phosphor-react";
import AsyncSelect from "react-select/async";
import Jobs from "../../Data/job-titles.json";
import CoverModal from "../../Layouts/ProfileLayouts/CoverModal";
import FollowerModal from "../../Layouts/ProfileLayouts/FollowerModal";
import FollowingModal from "../../Layouts/ProfileLayouts/FollowingModal";
import ContentModal from "../../Layouts/ProfileLayouts/ContentModal";
import SEO from '../../Utils/SEO';

export default function EditProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userName } = useParams();
  const { user } = useAuth();
  const [charCount, setCharCount] = useState(0);
  const [userData, setUserData] = useState({});
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [originalData, setOriginalData] = useState({});
  const [modalDisplay, setModalDisplay] = useState(false);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showModalContentModal, setShowModalContentModal] = useState(false);

  // Add state for profile picture upload
  const [selectedProfilePic, setSelectedProfilePic] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicLoading, setProfilePicLoading] = useState(false);

  const [error, setError] = useState({
    name: "",
    userName: "",
    bio: "",
    website: "",
    jobs: "",
  });
  const [success, setSuccess] = useState({
    name: false,
    userName: false,
    bio: false,
    website: false,
    jobs: false,
  });

  const [formData, setFormData] = useState({
    userName: "",
    name: "",
    bio: "",
    gender: "",
    website: "",
  });

  const maxChars = 150;
  const maxSelections = 3;

  const loadOptions = useCallback((inputValue, callback) => {
    if (!inputValue || inputValue.length < 2) {
      callback([]);
      return;
    }

    setTimeout(() => {
      const filtered = Jobs["job-titles"]
        .filter((title) =>
          title.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 50)
        .map((title, index) => ({
          label: title,
          value: title.toLowerCase().replace(/\s+/g, "-") + "-" + index,
        }));

      callback(filtered);
    }, 100);
  }, []);

  useEffect(() => {
    if (!user || user.userName !== userName) {
      navigate("/not-found", { replace: true });
    }
  }, []);

  const fetchProfileData = async () => {
    const response = await fetch(
      `${import.meta.env.VITE_API}/edit/${userName}`
    );
    if (response.ok) {
      const data = await response.json();

      setUserData(data);
      setFormData({
        userName: data.userName || "",
        name: data.name || "",
        bio: data.bio || "",
        gender: data.gender || "",
        website: data.website || "",
      });

      setOriginalData({
        ...data,
        jobs: data.jobs || [],
      });
      setSelectedJobs(data.jobs || []);
      setCharCount(data.bio ? data.bio.length : 0);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userName, user?.userName, navigate]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file); // Store the actual file for FormData

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedProfilePic(e.target.result); // For preview
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePic = async () => {
    if (!profilePicFile) return;
    try {
      setProfilePicLoading(true);
      const formData = new FormData();
      formData.append("profilePic", profilePicFile);

      const response = await fetch(
        `${import.meta.env.VITE_API}/update-profile-pic/${userName}`,
        {
          method: "PUT",
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Update the userData to show the new image
        setUserData((prev) => ({ ...prev, profilePic: data.profilePic }));
        // Clear the selected file
        setSelectedProfilePic(null);
        setProfilePicFile(null);
      } else {
        console.error("Update failed:", data.message);
      }
    } catch (err) {
      console.error("Something went wrong:", err);
    } finally {
      setProfilePicLoading(false);
    }
  };

  useEffect(() => {
    if (profilePicFile) {
      uploadProfilePic();
    }
  }, [profilePicFile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError((prev) => ({ ...prev, [name]: "" }));
    setSuccess((prev) => ({ ...prev, [name]: false }));
  };

  const handleBioChange = (e) => {
    const text = e.target.value;

    if (text.length <= maxChars) {
      setCharCount(text.length);
      setFormData((prev) => ({
        ...prev,
        bio: text,
      }));
    }

    setError((prev) => ({ ...prev, bio: "" }));
    setSuccess((prev) => ({ ...prev, bio: false }));
  };

  const handleBioKeyDown = (e) => {
    if (e.key === "Enter") {
      const currentLines = e.target.value.split("\n");
      if (currentLines.length >= 4) {
        e.preventDefault();
      }
    }
  };
  const handleJobChange = (selectedOptions) => {
    if (selectedOptions && selectedOptions.length <= maxSelections) {
      setSelectedJobs(selectedOptions);
    }
  };

  const updateProfileFetch = async (e) => {
    try {
      e.preventDefault();
      const data = { ...formData, jobs: selectedJobs };

      const payload = {};
      let hasChanges = false;
      let newUsername = null;
      let usernameChanged = false;

      if (data.userName !== originalData.userName) {
        payload.userName = data.userName;
        hasChanges = true;
        usernameChanged = true;
        newUsername = formData.userName;
      }

      if (data.name !== (originalData.name || "")) {
        payload.name = data.name;
        hasChanges = true;
      }

      if (data.bio !== (originalData.bio || "")) {
        payload.bio = data.bio;
        hasChanges = true;
      }

      if (data.website !== (originalData.website || "")) {
        payload.website = data.website;
        hasChanges = true;
      }

      if (data.gender !== (originalData.gender || "")) {
        payload.gender = data.gender;
        hasChanges = true;
      }

      if (
        JSON.stringify(selectedJobs) !== JSON.stringify(originalData.jobs || [])
      ) {
        payload.jobs = selectedJobs;
        hasChanges = true;
      }

      if (!hasChanges) {
        alert(t("No changes to save!"));
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API}/edit/${userName}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const resultData = await response.json();

      const newSuccess = {
        userName: payload.userName && !resultData.message?.userName,
        name: payload.name && !resultData.message?.name,
        bio: payload.bio && !resultData.message?.bio,
        website: payload.website && !resultData.message?.website,
        jobs: payload.jobs && !resultData.message?.jobs,
      };

      setSuccess(newSuccess);

      setError({
        userName: resultData.message?.userName || "",
        name: resultData.message?.name || "",
        bio: resultData.message?.bio || "",
        website: resultData.message?.website || "",
        jobs: resultData.message?.jobs || "",
      });

      if (
        usernameChanged &&
        newUsername &&
        !resultData.message?.userName &&
        response.ok
      ) {
        user.userName = newUsername;
        setTimeout(() => {
          navigate(`/edit/${newUsername}`, { replace: true });
        }, 0);
      }

      if (response.ok && resultData.success) {
        setOriginalData((prev) => ({
          ...prev,
          ...payload,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onToggle = () => {
    setModalDisplay((prev) => !prev);
  };

  const deleteProfilePic = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API}/delete-profile-pic/${userName}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
    }
  };

  return (
    <>
      <SEO
        title={"Edit Profile"}
        description={"Edit your profile information on AYSocial."}
        url={`${window.location.origin}/edit/${userName}`}
      />
      <Header />
      <MainSideBar />
      <BottomNav />
      <CoverModal toggleModal={onToggle} display={modalDisplay} />

      <FollowerModal
        display={showFollowerModal}
        toggleModal={() => setShowFollowerModal(false)}
        id={user._id}
        isOwner={true}
        loggedInUserId={user._id}
      />

      <FollowingModal
        display={showFollowingModal}
        toggleModal={() => setShowFollowingModal(false)}
        id={user._id}
        isOwner={true}
        loggedInUserId={user._id}
      />

      <ContentModal
        display={showModalContentModal}
        toggleModal={() => setShowModalContentModal(false)}
        userName={userData.userName}
        postNumber={userData.totalPosts || 0}
        videoNumber={userData.totalVideos || 0}
      />

      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="main-content">
            <div className="profile-header">
              <div
                className="profile-banner"
                style={{
                  background: user.coverPic.image
                    ? `url(${user.coverPic.image})`
                    : user.coverPic.color,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="edit-cover" onClick={onToggle}>
                  <p>
                    <Camera size={18} weight="fill" />
                    {t("Edit cover")}
                  </p>
                </div>
              </div>
              <div className="profile-info">
                <button
                  onClick={deleteProfilePic}
                  className="secondary-button delete-pic"
                >
                  {t("Delete Pic")}
                </button>
                <div
                  className="profile-avatar-large"
                  style={{
                    backgroundImage: `url(${
                      userData.profilePic
                        ? selectedProfilePic || userData.profilePic
                        : defaultProfilePic
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="edit-icon-container">
                    <div className="edit-icon">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                        style={{
                          position: "absolute",
                          width: "100%",
                          height: "100%",
                          margin: "0",
                          padding: "0",
                          opacity: "0",
                          cursor: "pointer",
                        }}
                        disabled={profilePicLoading}
                      />
                      {profilePicLoading ? (
                        <div className="loading-spinner">⏳</div>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                <div className="profile-details">
                  <h1 className="profile-name">{userData.userName}</h1>
                  <p className="profile-handle">{userData.name}</p>
                  <p className="profile-date">
                    {t("joined")}{" "}
                    <span>
                      {new Date(user.createdAt).toLocaleString("default", {
                        day: "numeric",
                      })}{" "}
                      {new Date(userData.createdAt).toLocaleString("default", {
                        month: "long",
                      })}{" "}
                      {new Date(user.createdAt).getFullYear()}{" "}
                    </span>
                  </p>
                  <p className="profile-location">
                    {" "}
                    <MapPin size={18} weight="fill" color="#6b7280" />{" "}
                    {userData.country}{" "}
                  </p>

                  <div className="profile-stats">
                    <div
                      className="stat"
                      onClick={() => {
                        setShowFollowingModal(true);
                      }}
                    >
                      <span className="stat-number">
                        {userData.followingCount || 0}
                      </span>
                      <span className="stat-label">{t("Following")}</span>
                    </div>
                    <div
                      className="stat"
                      onClick={() => setShowFollowerModal(true)}
                    >
                      <span className="stat-number">
                        {userData.followersCount || 0}
                      </span>
                      <span className="stat-label">{t("Followers")}</span>
                    </div>
                    <div
                      className="stat"
                      onClick={() => {
                        setShowModalContentModal(true);
                      }}
                    >
                      <span className="stat-number">{userData.posts || 0}</span>
                      <span className="stat-label">{t("Content")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <form
                className="edit-input-container"
                onSubmit={updateProfileFetch}
              >
                <div className="input-container-child">
                  <label htmlFor="userName">
                    {t("Username")} <span>{t("(required)")}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("e.g. your_username")}
                    value={formData.userName}
                    onChange={handleInputChange}
                    id="userName"
                    name="userName"
                    className={
                      error.userName
                        ? "error-input"
                        : success.userName
                        ? "success-input"
                        : ""
                    }
                  />
                  <span
                    className={
                      error.userName
                        ? "edit-profile-error"
                        : success.userName
                        ? "edit-profile-success"
                        : "edit-profile-message"
                    }
                  >
                    {error.userName ||
                      (success.userName ? t("✅ Looks good!") : "")}
                  </span>
                  <label htmlFor="name">
                    {t("Name")} <span>{t("(optional)")}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("e.g. Michael, Sarah, etc.")}
                    value={formData.name}
                    onChange={handleInputChange}
                    id="name"
                    name="name"
                    className={
                      error.name
                        ? "error-input"
                        : success.name
                        ? "success-input"
                        : ""
                    }
                  />
                  <span
                    className={
                      error.name
                        ? "edit-profile-error"
                        : success.name
                        ? "edit-profile-success"
                        : "edit-profile-message"
                    }
                  >
                    {error.name || (success.name ? t("✅ Looks good!") : "")}
                  </span>

                  <label htmlFor="bio">{t("Bio")}</label>
                  <textarea
                    placeholder={t("Share something about yourself...")}
                    id="bio"
                    name="bio"
                    maxLength="150"
                    value={formData.bio}
                    onChange={handleBioChange}
                    onKeyDown={handleBioKeyDown}
                    className={
                      error.bio
                        ? "error-input"
                        : success.bio
                        ? "success-input"
                        : ""
                    }
                  />
                  <div className="bio-number">
                    <span>{charCount}/150</span>
                  </div>
                  <span
                    className={
                      error.bio
                        ? "edit-profile-error"
                        : success.bio
                        ? "edit-profile-success"
                        : "edit-profile-message"
                    }
                  >
                    {error.bio || (success.bio ? t("✅ Looks good!") : "")}
                  </span>
                </div>

                <div className="input-container-child">
                  <label htmlFor="email">{t("Email")}</label>
                  <input
                    type="email"
                    id="email"
                    value={userData.email || ""}
                    disabled
                  />
                  <span className="edit-profile-error"></span>

                  <label htmlFor="gender">{t("Gender")}</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>
                      {t("Select gender")}
                    </option>
                    <option value="male">{t("Male")}</option>
                    <option value="female">{t("Female")}</option>
                    <option value="prefer-not-to-say">{t("Prefer not to say")}</option>
                  </select>
                  <span className="edit-profile-error"></span>

                  <label htmlFor="website">{t("Website")}</label>
                  <input
                    type="url"
                    placeholder={t("https://www.example.com")}
                    name="website"
                    id="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className={
                      error.website
                        ? "error-input"
                        : success.website
                        ? "success-input"
                        : ""
                    }
                  />

                  <span
                    className={
                      error.website
                        ? "edit-profile-error"
                        : success.website
                        ? "edit-profile-success"
                        : "edit-profile-message"
                    }
                  >
                    {error.website || (success.website ? t("✅ Looks good!") : "")}
                  </span>

                  <label htmlFor="job">{t("Jobs")}</label>
                  <AsyncSelect
                    isMulti
                    cacheOptions
                    loadOptions={loadOptions}
                    defaultOptions
                    placeholder={t("Search job roles...")}
                    value={selectedJobs}
                    onChange={handleJobChange}
                    isOptionDisabled={() =>
                      selectedJobs.length >= maxSelections
                    }
                  />

                  <span
                    className={
                      error.jobs
                        ? "edit-profile-error"
                        : success.jobs
                        ? "edit-profile-success"
                        : "edit-profile-message"
                    }
                    style={{ marginTop: "5px", marginLeft: "5px" }}
                  >
                    {error.jobs || (success.jobs ? t("✓ Looks good!") : "")}
                  </span>

                  <div className="save-edit-container">
                    <button type="submit" className="main-button save-edit">
                      {t("Save")}
                    </button>
                    <button
                      type="button"
                      onClick={deleteProfilePic}
                      className="main-button delete-pic2"
                    >
                      {t("Delete pic")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}