const router = require("express").Router();
const decodeToken = require("../Middlewares/DecodeToken");
const upload = require("../Config/multerMemory");

const { 
  createConversation,
  sendMessage,
  getConversations,
  getConversation,
  markAsRead,
  markAsDelivered,        // ⭐ ADD THIS LINE
  deleteConversation,
  uploadMessageImage,
  deleteMessage,
  unsendMessage,
  sendReply,
  toggleReaction,
  getMessageReactions,
  updateConversationTheme,
  getConversationTheme,
  checkBlockingStatus,        // ⭐ NEW: Add this
  toggleMute                   // ⭐ NEW: Add this
} = require("../Controllers/MessageController");

// Create new conversation with first message
router.post("/conversations", decodeToken, createConversation);

// Send message to existing conversation
router.post("/:conversationId/send", decodeToken, sendMessage);

// Send reply to a specific message
router.post("/:conversationId/reply", decodeToken, sendReply);

// Get all conversations for current user
router.get("/conversations", decodeToken, getConversations);

// Get specific conversation with all messages
router.get("/:conversationId", decodeToken, getConversation);

// Mark conversation messages as read
router.put("/:conversationId/read", decodeToken, markAsRead);

// ⭐ ADD THIS NEW ROUTE
// Mark conversation messages as delivered
router.put("/:conversationId/delivered", decodeToken, markAsDelivered);

// Delete conversation
router.delete("/:conversationId", decodeToken, deleteConversation);

// Upload image
router.post("/upload-image", upload.single("image"), uploadMessageImage);

// Delete individual message (only for sender)
router.delete("/:conversationId/message/:messageId", decodeToken, deleteMessage);

// Unsend message (removes for everyone, with time limit)
router.delete("/:conversationId/message/:messageId/unsend", decodeToken, unsendMessage);

// Toggle reaction on a message (add/remove/change)
router.post("/:conversationId/message/:messageId/reaction", decodeToken, toggleReaction);

// Get all reactions for a message
router.get("/:conversationId/message/:messageId/reactions", decodeToken, getMessageReactions);

// Update conversation theme color for current user
router.put("/:conversationId/theme", decodeToken, updateConversationTheme);

// Get conversation theme color for current user
router.get("/:conversationId/theme", decodeToken, getConversationTheme);

// ⭐ NEW: Check if users are blocking each other
router.get("/:conversationId/blocking-status", decodeToken, checkBlockingStatus);

// ⭐ NEW: Toggle mute/unmute conversation
router.put("/:conversationId/mute", decodeToken, toggleMute);

module.exports = router;