export const shareUrl = async (title, description, url) => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: title,
        text: description,
        url: url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  } catch (err) {
    try {
      await navigator.clipboard.writeText(url);
    } catch (clipboardErr) {}
  }
};
