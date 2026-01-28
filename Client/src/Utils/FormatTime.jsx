import i18n from '../i18n'; // Adjust the path based on your i18n config location

const formatTime = (timestamp) => {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diff = now - postTime;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return i18n.t("just now");
  if (minutes < 60) return `${minutes}${i18n.t("m ago")}`;
  if (hours < 24) return `${hours}${i18n.t("h ago")}`;
  if (days < 30) return `${days}${i18n.t("d ago")}`;
  if (months < 12) return `${months}${i18n.t("mo ago")}`;
  return `${years}${i18n.t("y ago")}`;
};

export default formatTime;