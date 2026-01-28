import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MessagesSideBar from "../../Layouts/MainLayouts/MessagesSidebar";
import Header from "../../Layouts/MainLayouts/Header";
import BottomNav from "../../Layouts/MainLayouts/BottomNav";
import { MagnifyingGlass, ChatCircleDots, PaperPlaneTilt, DotsThreeVertical, Image, User, Palette, BellSlash, Bell, Trash, Prohibit, X, DotsThree, Smiley, ArrowBendUpLeft, Copy, ArrowCounterClockwise, ArrowLeft, Check, Checks, CircleNotch } from "phosphor-react";
import ThemeModal from "../../Layouts/MessagesLayouts/ThemeModal";
import DeleteConversationModal from "../../Layouts/MessagesLayouts/DeleteConversationModal";
import BlockConfirmationModal from "../../Layouts/ProfileLayouts/BlockConfirmationModal";
import { showMessageSentNotification } from "../../Components/Notifications/MessageSentNotification"; // ⭐ NEW: Import message notification
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import socket from "../../Utils/Socket";
import { timeAgo } from "../../Utils/timeAgo";
import defaultProfilePic from "../../assets/Profile/defaultProfilePic.jpg";
import "./Messages.css";
  import SEO from "../../Utils/SEO";

export default function Messages() {
const { t } = useTranslation();
const navigate = useNavigate();
const { user: currentUser } = useAuth();
const [searchParams] = useSearchParams();
const userId = searchParams.get('userId');

const [searchQuery, setSearchQuery] = useState("");
const [selectedChat, setSelectedChat] = useState(null);
const [activeTab, setActiveTab] = useState("primary");
const [recipientUser, setRecipientUser] = useState(null);
const [loadingUser, setLoadingUser] = useState(false);
const [conversations, setConversations] = useState([]);
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(true);
const [showSettings, setShowSettings] = useState(false);
const [selectedImage, setSelectedImage] = useState(null);
const [imagePreview, setImagePreview] = useState(null);
const [uploadingImage, setUploadingImage] = useState(false);
const [fullScreenImage, setFullScreenImage] = useState(null);
const [openMessageMenu, setOpenMessageMenu] = useState(null);
const [showReactionPicker, setShowReactionPicker] = useState(null);
const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
const [replyingTo, setReplyingTo] = useState(null);
const [showThemeModal, setShowThemeModal] = useState(false);
const [chatTheme, setChatTheme] = useState('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
const [showBlockModal, setShowBlockModal] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deletingConversation, setDeletingConversation] = useState(false);
const [blockingUser, setBlockingUser] = useState(false);
const [privacy, setPrivacy] = useState(null);
const [canMessage, setCanMessage] = useState(true); 
const [isBlocked, setIsBlocked] = useState(false); // ⭐ NEW: Track if users are blocking each other
const [typingUsers, setTypingUsers] = useState({});
const [typingTimeout, setTypingTimeout] = useState(null);
const [lastSeenTimestamp, setLastSeenTimestamp] = useState(null);
const [messagePage, setMessagePage] = useState(1);
const [hasMoreMessages, setHasMoreMessages] = useState(true);
const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
const [conversationPage, setConversationPage] = useState(1);
const [hasMoreConversations, setHasMoreConversations] = useState(true);
const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
const [isRecipientOnline, setIsRecipientOnline] = useState(false);
const [onlineUsers, setOnlineUsers] = useState(new Set());
const messagesEndRef = useRef(null);
const messagesListRef = useRef(null);
const conversationsListRef = useRef(null);
const settingsRef = useRef(null);
const fileInputRef = useRef(null);
const messageInputRef = useRef(null);

useEffect(() => {
  const handleScroll = () => {
    if (
      messagesListRef.current &&
      messagesListRef.current.scrollTop === 0 &&
      hasMoreMessages &&
      !loadingMoreMessages
    ) {
      fetchConversationMessages(selectedChat._id, messagePage + 1);
    }
  };

  const messagesListEl = messagesListRef.current;
  if (messagesListEl) {
    messagesListEl.addEventListener("scroll", handleScroll);
  }

  return () => {
    if (messagesListEl) {
      messagesListEl.removeEventListener("scroll", handleScroll);
    }
  };
}, [hasMoreMessages, loadingMoreMessages, messagePage, selectedChat]);

// ⭐ NEW: Infinite scroll for conversations list
useEffect(() => {
  const handleConversationsScroll = () => {
    if (
      conversationsListRef.current &&
      conversationsListRef.current.scrollTop + conversationsListRef.current.clientHeight >= conversationsListRef.current.scrollHeight - 50 &&
      hasMoreConversations &&
      !loadingMoreConversations
    ) {
      fetchMoreConversations(conversationPage + 1);
    }
  };

  const conversationsListEl = conversationsListRef.current;
  if (conversationsListEl) {
    conversationsListEl.addEventListener("scroll", handleConversationsScroll);
  }

  return () => {
    if (conversationsListEl) {
      conversationsListEl.removeEventListener("scroll", handleConversationsScroll);
    }
  };
}, [hasMoreConversations, loadingMoreConversations, conversationPage]);

useEffect(() => {
  fetchConversations();
}, []);

// ⭐ FIXED: Global listener for online/offline status (for both chat header and conversation list)
useEffect(() => {
  const handleUserOnline = (onlineUserId) => {
    console.log('🟢 User online:', onlineUserId);
    setOnlineUsers(prev => new Set([...prev, onlineUserId]));
    
    // Also check if this is the current recipient
    if (userId === onlineUserId) {
      setIsRecipientOnline(true);
    }
  };

  const handleUserOffline = (offlineUserId) => {
    console.log('🔴 User offline:', offlineUserId);
    setOnlineUsers(prev => {
      const updated = new Set(prev);
      updated.delete(offlineUserId);
      return updated;
    });
    
    // Also check if this is the current recipient
    if (userId === offlineUserId) {
      setIsRecipientOnline(false);
    }
  };

  socket.on('user-online', handleUserOnline);
  socket.on('user-offline', handleUserOffline);

  return () => {
    socket.off('user-online', handleUserOnline);
    socket.off('user-offline', handleUserOffline);
  };
}, [userId]);

// ⭐ OLD: Removed - using combined effect above
// useEffect(() => {
//   // Use userId from URL params (available immediately)
//   const recipientId = userId;
//   
//   if (!recipientId) return; // Don't set up listeners if no userId
//   
//   const handleUserOnline = (onlineUserId) => {
//     console.log('🟢 User online:', onlineUserId, 'Looking for:', recipientId);
//     if (recipientId === onlineUserId) {
//       console.log('✅ Recipient is online!');
//       setIsRecipientOnline(true);
//     }
//   };
//
//   const handleUserOffline = (offlineUserId) => {
//     console.log('🔴 User offline:', offlineUserId, 'Looking for:', recipientId);
//     if (recipientId === offlineUserId) {
//       console.log('❌ Recipient is offline!');
//       setIsRecipientOnline(false);
//     }
//   };
//
//   socket.on('user-online', handleUserOnline);
//   socket.on('user-offline', handleUserOffline);
//
//   return () => {
//     socket.off('user-online', handleUserOnline);
//     socket.off('user-offline', handleUserOffline);
//   };
// }, [userId]);

// ⭐ FIXED: Global socket listener for conversation list updates
useEffect(() => {
  if (!currentUser?._id) return;

  const connectSocket = () => {
    if (!socket.connected) {
      console.log('🔌 Connecting socket...');
      socket.connect();
    }
    
    if (socket.connected) {
      console.log('✅ Socket already connected, registering user:', currentUser._id);
      socket.emit('register', currentUser._id);
      socket.emit('join-user-room', currentUser._id);
    } else {
      socket.once('connect', () => {
        console.log('✅ Socket connected, registering user:', currentUser._id);
        socket.emit('register', currentUser._id);
        socket.emit('join-user-room', currentUser._id);
      });
    }
  };

  connectSocket();

  // ⭐ FIXED: Handle new messages for conversation list (always listen)
  const handleNewMessageForList = (data) => {
    console.log('📨 New message received for list:', data);
    
    setConversations(prev => {
      const convIndex = prev.findIndex(c => c._id === data.conversationId);
      
      if (convIndex !== -1) {
        const updated = [...prev];
        const conv = { ...updated[convIndex] };
        
        const isSentByMe = (data.message.senderId?._id || data.message.senderId) === currentUser._id;
        conv.lastMessage = data.message;
        conv.time = data.message.timestamp;
        
        // Only increment unread if message is not from me AND I'm not in that chat
        if (!isSentByMe && selectedChat?._id !== data.conversationId) {
          conv.unread = true;
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          
          // ⭐ NEW: Show notification to receiver with sender's user ID and profile pic (only if not muted)
          if (!conv.isMuted) {
            const senderId = data.message.senderId?._id || data.message.senderId;
            const senderProfilePic = data.message.senderId?.profilePic || null;
            showMessageSentNotification({
              userId: senderId,
              recipientName: conv.name,
              profilePic: senderProfilePic
            }, navigate);
          }
        }
        
        // Clear typing indicator when message arrives
        conv.isTyping = false;
        conv.typingUser = null;
        
        // Move conversation to top
        updated.splice(convIndex, 1);
        updated.unshift(conv);
        
        return updated;
      } else {
        // New conversation - refresh the list
        console.log('🔄 New conversation detected, refreshing list');
        fetchConversations();
        return prev;
      }
    });
  };

  // ⭐ FIXED: Handle typing in conversation list
  const handleTypingInList = ({ conversationId, userId, userName }) => {
    console.log('👤 User typing in list:', userName, conversationId);
    
    if (String(userId) === String(currentUser._id)) return;
    if (selectedChat?._id === conversationId) return; // Don't show in list if already in that chat
    
    setConversations(prev => prev.map(conv => {
      if (conv._id === conversationId) {
        return { ...conv, isTyping: true, typingUser: userName };
      }
      return conv;
    }));
    
    // Auto-clear after 3 seconds
    setTimeout(() => {
      setConversations(prev => prev.map(conv => {
        if (conv._id === conversationId) {
          return { ...conv, isTyping: false, typingUser: null };
        }
        return conv;
      }));
    }, 3000);
  };

  // ⭐ FIXED: Handle stop typing in conversation list
  const handleStopTypingInList = ({ conversationId, userId }) => {
    console.log('🛑 User stopped typing in list:', conversationId);
    
    if (String(userId) === String(currentUser._id)) return;
    
    setConversations(prev => prev.map(conv => {
      if (conv._id === conversationId) {
        return { ...conv, isTyping: false, typingUser: null };
      }
      return conv;
    }));
  };

  const handleConnect = () => {
    console.log('✅ Socket reconnected, re-registering user');
    socket.emit('register', currentUser._id);
    socket.emit('join-user-room', currentUser._id);
  };

  const handleDisconnect = () => {
    console.log('❌ Socket disconnected');
  };

  // Listen to user's personal room for updates
  socket.on('new-message', handleNewMessageForList);
  socket.on('user-typing-global', handleTypingInList);
  socket.on('user-stop-typing-global', handleStopTypingInList);
  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);

  return () => {
    socket.off('new-message', handleNewMessageForList);
    socket.off('user-typing-global', handleTypingInList);
    socket.off('user-stop-typing-global', handleStopTypingInList);
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
  };
}, [currentUser?._id, selectedChat?._id]);

// ⭐ Conversation-specific socket listeners (when inside a chat)
useEffect(() => {
  const conversationId = selectedChat?._id;
  if (!conversationId || selectedChat.isNew) {
    setTypingUsers({});
    return;
  }

  if (!socket.connected) {
    console.log('🔌 Socket not connected, connecting...');
    socket.connect();
  }

  const joinRoom = () => {
    console.log("🚪 Joining conversation room:", conversationId);
    socket.emit('join-conversation', conversationId);
    
    markConversationAsDelivered(conversationId);
    
    socket.emit('mark-seen', {
      conversationId,
      userId: currentUser._id
    });
  };

  if (socket.connected) {
    joinRoom();
  } else {
    socket.once('connect', joinRoom);
  }

  const handleNewMessageInRoom = (data) => {
    console.log('💬 New message in current conversation:', data);
    const message = data.message || data;
    const msgConversationId = data.conversationId || message.conversationId;
    
    if (msgConversationId === conversationId) {
      const senderId = message.senderId?._id || message.senderId;
      if (String(senderId) !== String(currentUser._id)) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) {
            console.log('⚠️ Duplicate message prevented');
            return prev;
          }
          console.log('✅ Adding new message to state');
          return [...prev, message];
        });
        
        markConversationAsDelivered(conversationId);
        socket.emit('mark-seen', {
          conversationId,
          userId: currentUser._id
        });
      }
    }
  };

  const handleMessagesDelivered = ({ userId, timestamp }) => {
    console.log('✅ Messages delivered by:', userId);
    if (String(userId) !== String(currentUser._id)) {
      setMessages(prev => prev.map(msg => {
        const senderId = msg.senderId?._id || msg.senderId;
        if (String(senderId) === String(currentUser._id) && !msg.isDelivered) {
          return { ...msg, isDelivered: true, deliveredAt: timestamp || new Date() };
        }
        return msg;
      }));
    }
  };

  const handleUserTyping = ({ userId, userName }) => {
    console.log('👤 User typing in chat:', userName);
    if (String(userId) !== String(currentUser._id)) {
      setTypingUsers(prev => ({ ...prev, [userId]: userName }));
      
      setTimeout(() => {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[userId];
          return newTypingUsers;
        });
      }, 3000);
    }
  };

  const handleUserStopTyping = ({ userId }) => {
    console.log('🛑 User stopped typing in chat:', userId);
    setTypingUsers(prev => {
      const newTypingUsers = { ...prev };
      delete newTypingUsers[userId];
      return newTypingUsers;
    });
  };

  const handleMessagesSeen = (data) => {
    console.log("👁️ Messages seen event:", data);
    const { userId, timestamp } = data;
    
    if (String(userId) !== String(currentUser._id)) {
      setMessages(prev => prev.map(msg => {
        const senderId = msg.senderId?._id || msg.senderId;
        if (String(senderId) === String(currentUser._id) && !msg.isRead) {
          return { ...msg, isRead: true, readAt: timestamp || new Date() };
        }
        return msg;
      }));
    }
  };

  const handleReconnect = () => {
    console.log("🔄 Socket reconnected, rejoining room:", conversationId);
    joinRoom();
  };

  socket.off('new-message', handleNewMessageInRoom);
  socket.off('messages-delivered', handleMessagesDelivered);
  socket.off('user-typing', handleUserTyping);
  socket.off('user-stop-typing', handleUserStopTyping);
  socket.off('messages-seen', handleMessagesSeen);
  socket.off('connect', handleReconnect);

  socket.on('new-message', handleNewMessageInRoom);
  socket.on('messages-delivered', handleMessagesDelivered);
  socket.on('user-typing', handleUserTyping);
  socket.on('user-stop-typing', handleUserStopTyping);
  socket.on('messages-seen', handleMessagesSeen);
  socket.on('connect', handleReconnect);

  return () => {
    console.log("🚪 Leaving conversation room:", conversationId);
    socket.emit('leave-conversation', conversationId);
    socket.off('new-message', handleNewMessageInRoom);
    socket.off('messages-delivered', handleMessagesDelivered);
    socket.off('user-typing', handleUserTyping);
    socket.off('user-stop-typing', handleUserStopTyping);
    socket.off('messages-seen', handleMessagesSeen);
    socket.off('connect', handleReconnect);
  };
}, [selectedChat?._id, currentUser?._id]);

useEffect(() => {
  if (messages.length > 0 && selectedChat?._id && !selectedChat.isNew && socket.connected) {
    console.log('👁️ Marking conversation as seen via socket');
    socket.emit('mark-seen', {
      conversationId: selectedChat._id,
      userId: currentUser._id
    });
  }
}, [messages.length, selectedChat?._id]);

useEffect(() => {
  const checkConnection = setInterval(() => {
    if (!socket.connected && currentUser?._id) {
      console.warn('⚠️ Socket disconnected, attempting reconnect...');
      socket.connect();
    }
  }, 5000);

  return () => clearInterval(checkConnection);
}, [currentUser?._id]);

useLayoutEffect(() => {
  if (messagePage === 1 && messages.length > 0) {
    scrollToBottom();
  }
}, [messagePage, messages]);

useEffect(() => {
  const messagesList = messagesListRef.current;
  if (messagesList) {
    const isNearBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 100;
    if (isNearBottom) {
      scrollToBottom();
    }
  }
}, [messages]);

useEffect(() => {
  const handleClickOutside = (event) => {
    if (settingsRef.current && !settingsRef.current.contains(event.target)) {
      setShowSettings(false);
    }
    
    const menuDropdown = document.querySelector('.message-menu-dropdown');
    if (openMessageMenu !== null && menuDropdown && !menuDropdown.contains(event.target)) {
      const isActionButton = event.target.closest('.message-action-btn');
      if (!isActionButton) {
        setOpenMessageMenu(null);
      }
    }
    
    if (showReactionPicker !== null && !event.target.closest('.reaction-picker') && !event.target.closest('.message-action-btn')) {
      setShowReactionPicker(null);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [openMessageMenu, showReactionPicker]);

const scrollToBottom = () => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
  }
};

const fetchConversations = async () => {
  try {
    setLoading(true);
    const res = await fetch(`${import.meta.env.VITE_API}/messages/conversations?page=1&limit=20`, {
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('Failed to fetch conversations');
    
    const data = await res.json();
    setConversations(data.conversations || []);
    setHasMoreConversations(data.hasMore || false);
    setConversationPage(1);
  } catch (error) {
    console.error('Error fetching conversations:', error);
  } finally {
    setLoading(false);
  }
};

// ⭐ NEW: Fetch more conversations for infinite scroll
const fetchMoreConversations = async (page) => {
  if (loadingMoreConversations) return;
  
  try {
    setLoadingMoreConversations(true);
    const res = await fetch(`${import.meta.env.VITE_API}/messages/conversations?page=${page}&limit=20`, {
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('Failed to fetch more conversations');
    
    const data = await res.json();
    setConversations(prev => [...prev, ...(data.conversations || [])]);
    setHasMoreConversations(data.hasMore || false);
    setConversationPage(page);
  } catch (error) {
    console.error('Error fetching more conversations:', error);
  } finally {
    setLoadingMoreConversations(false);
  }
};

const markConversationAsDelivered = async (conversationId) => {
  try {
    await fetch(`${import.meta.env.VITE_API}/messages/${conversationId}/delivered`, {
      method: 'PUT',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error marking as delivered:', error);
  }
};

// ⭐ Process conversations for display with typing indicator
const processedConversations = conversations
  .filter(conv => activeTab === "primary" 
    ? conv.status === 'primary' 
    : conv.status === 'request'
  )
  .filter(conv => 
    searchQuery === "" || 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  .map(conv => {
    // Show typing indicator if someone is typing
    if (conv.isTyping && conv.typingUser) {
      return { 
        ...conv, 
        displayStatus: `${conv.typingUser} is typing...`,
        isTypingNow: true 
      };
    }
    
    const lastMessage = conv.lastMessage;
    if (!lastMessage) return { ...conv, displayStatus: 'No messages yet' };

    const isSentByMe = lastMessage.senderId === currentUser?._id;
    let statusText = '';

    if (isSentByMe) {
      let messagePreview = '';
      
      if (lastMessage.type === 'image') {
        messagePreview = '📷 Photo';
      } else {
        messagePreview = lastMessage.text?.substring(0, 30) + (lastMessage.text?.length > 30 ? '...' : '');
      }

      let statusIcon = '';
      if (lastMessage.isRead) {
        statusIcon = '✓✓ ';
      } else if (lastMessage.isDelivered) {
        statusIcon = '✓✓ ';
      } else {
        statusIcon = '✓ ';
      }
      
      statusText = statusIcon + messagePreview;
      
    } else {
      if (lastMessage.type === 'image') {
        statusText = '📷 Photo';
      } else {
        const text = lastMessage.text || 'New message';
        statusText = text.substring(0, 30) + (text.length > 30 ? '...' : '');
      }
    }
    
    return { ...conv, displayStatus: statusText };
  });

useEffect(() => {
  if (userId) {
    const existingConvo = conversations.find(c => 
      c.participants.some(p => p._id === userId)
    );
    
    if (existingConvo) {
      if (selectedChat?._id !== existingConvo._id) {
        setMessages([]);
        setMessagePage(1);
        setHasMoreMessages(true);
        fetchConversationMessages(existingConvo._id, 1);
      }
    } else {
      if (selectedChat?.recipientId !== userId) {
        fetchUserData(userId);
      }
    }
  } else {
    if (selectedChat) {
      setSelectedChat(null);
      setRecipientUser(null);
      setMessages([]);
    }
  }
}, [userId, conversations]);

const fetchConversationMessages = async (conversationId, page = 1) => {
  if (loadingMoreMessages) return;

  setLoadingMoreMessages(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API}/messages/${conversationId}?page=${page}&limit=20`, {
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('Failed to fetch messages');
    
    const data = await res.json();

    const currentScrollHeight = messagesListRef.current?.scrollHeight || 0;

    if (page === 1) {
      setMessages(data.messages || []);
      setSelectedChat(data.conversation);
      // ⭐ NEW: Set blocking status from response
      setIsBlocked(data.conversation.isBlocked || false);
    } else {
      setMessages(prev => [...data.messages, ...prev]);
    }
    
    setHasMoreMessages(data.pagination.hasMore);
    setMessagePage(page);

    if (page > 1) {
      // Restore scroll position after new messages are rendered
      requestAnimationFrame(() => {
        const newScrollHeight = messagesListRef.current?.scrollHeight || 0;
        messagesListRef.current.scrollTop = newScrollHeight - currentScrollHeight;
      });
    }

    if (data.conversation.themeColor) {
      setChatTheme(data.conversation.themeColor);
    } else {
      setChatTheme('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    }
    
    const otherUser = data.conversation.participants.find(
      p => p._id !== currentUser?._id
    );
    setRecipientUser(otherUser);

    if (otherUser) {
      const privacySettings = otherUser.privacySettings;
      if (privacySettings) {
        const whoCanDM = privacySettings.whoCanDM || 'Everyone';
        setPrivacy(whoCanDM);

        if (whoCanDM === 'No One') {
          setCanMessage(false);
        } else if (whoCanDM === 'Friends Only') {
          const isFollower = otherUser.followers.some(follower => follower.follower === currentUser._id);
          const isFollowing = currentUser.following.some(followed => followed.following._id === otherUser._id);
          if (!isFollower || !isFollowing) {
            setCanMessage(false);
          } else {
            setCanMessage(true);
          }
        } else {
          setCanMessage(true);
        }
      } else {
        setCanMessage(true);
        setPrivacy('Everyone');
      }
    }

    
    markConversationAsRead(conversationId);
    markConversationAsDelivered(conversationId);
  } catch (error) {
    console.error('Error fetching messages:', error);
  } finally {
    setLoadingMoreMessages(false);
  }
};

const markConversationAsRead = async (conversationId) => {
  try {
    await fetch(`${import.meta.env.VITE_API}/messages/${conversationId}/read`, {
      method: 'PUT',
      credentials: 'include'
    });
    
    setConversations(prev => prev.map(conv => 
      conv._id === conversationId 
        ? { ...conv, unread: false, unreadCount: 0 }
        : conv
    ));
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

const fetchUserData = async (userId) => {
  setLoadingUser(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API}/user/${userId}`, {
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('User not found');
    
    const data = await res.json();
    
    const recipient = data.user;
    setRecipientUser(recipient);

    const privacySettings = recipient.privacySettings;
    if (privacySettings) {
      const whoCanDM = privacySettings.whoCanDM || 'Everyone';
      setPrivacy(whoCanDM);

      if (whoCanDM === 'No One') {
        setCanMessage(false);
      } else if (whoCanDM === 'Friends Only') {
        const isFollower = recipient.followers.some(follower => follower.follower === currentUser._id);
        const isFollowing = currentUser.following.some(followed => followed.following._id === recipient._id);
        if (!isFollower || !isFollowing) {
          setCanMessage(false);
        } else {
          setCanMessage(true);
        }
      } else {
        setCanMessage(true);
      }
    } else {
      setCanMessage(true);
      setPrivacy('Everyone');
    }

    setSelectedChat({
      isNew: true,
      recipientId: userId,
      recipientData: data.user
    });
    setMessages([]);
    setChatTheme('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
  } catch (error) {
    console.error('Error fetching user:', error);
    navigate('/chat');
  } finally {
    setLoadingUser(false);
  }
};

const renderMessageStatus = (msg) => {
  const isSent = msg.senderId._id === currentUser?._id || msg.senderId === currentUser?._id;
  
  if (!isSent) return null;
  
  if (msg.isRead) {
    return (
      <span className="message-status read" title="Seen">
        <Checks size={16} weight="bold" />
      </span>
    );
  } else if (msg.isDelivered) {
    return (
      <span className="message-status delivered" title="Delivered">
        <Checks size={16} weight="regular" />
      </span>
    );
  } else {
    return (
      <span className="message-status sent" title="Sent">
        <Check size={16} weight="regular" />
      </span>
    );
  }
};

const handleImageSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    console.error('Image too large. Maximum size is 10MB.');
    return;
  }

  setSelectedImage(file);
  const reader = new FileReader();
  reader.onloadend = () => {
    setImagePreview(reader.result);
  };
  reader.readAsDataURL(file);
};

const handleSendImage = async () => {
  if (!selectedImage) return;

  setUploadingImage(true);
  try {
    const formData = new FormData();
    formData.append('image', selectedImage);

    const uploadRes = await fetch(`${import.meta.env.VITE_API}/messages/upload-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!uploadRes.ok) throw new Error('Failed to upload image');

    const uploadData = await uploadRes.json();
    const imageUrl = uploadData.imageUrl;

    if (selectedChat.isNew) {
      const res = await fetch(`${import.meta.env.VITE_API}/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: selectedChat.recipientId,
          message: {
            type: 'image',
            text: '',
            media: { url: imageUrl }
          }
        })
      });

      if (!res.ok) throw new Error('Failed to send image');

      const data = await res.json();
      await fetchConversations();
      setSelectedChat(data.conversation);
      setMessages(data.conversation.messages || []);
    } else {
      const res = await fetch(`${import.meta.env.VITE_API}/messages/${selectedChat._id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'image',
          text: '',
          media: { url: imageUrl }
        })
      });

      if (!res.ok) throw new Error('Failed to send image');

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      await fetchConversations();
    }

    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  } catch (error) {
    console.error('Error sending image:', error);
    console.error('Failed to send image');
  } finally {
    setUploadingImage(false);
  }
};

const handleSendMessage = async (messageText) => {
  if (!messageText.trim() && !replyingTo) return;

  // ⭐ NEW: Check if users are blocking each other
  if (isBlocked) {
    console.error('Cannot send message - user is blocked or has blocked you');
    return;
  }

  if (selectedChat?._id && !selectedChat.isNew && socket.connected) {
    console.log('🛑 Stopping typing indicator');
    socket.emit('stop-typing', { 
      conversationId: selectedChat._id, 
      userId: currentUser._id 
    });
  }

  try {
    if (replyingTo) {
      const res = await fetch(`${import.meta.env.VITE_API}/messages/${selectedChat._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          replyToMessageId: replyingTo._id,
          text: messageText,
          type: 'text'
        })
      });

      if (!res.ok) throw new Error('Failed to send reply');

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setReplyingTo(null);
      await fetchConversations();
      return;
    }

    if (selectedChat.isNew) {
      const res = await fetch(`${import.meta.env.VITE_API}/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: selectedChat.recipientId,
          message: {
            type: 'text',
            text: messageText
          }
        })
      });

      if (!res.ok) {
        const error = await res.json();
        console.error(error.error || 'Failed to send message');
        return;
      }

      const data = await res.json();
      
      await fetchConversations();
      setSelectedChat(data.conversation);
      setMessages(data.conversation.messages || []);
      
    } else {
      const res = await fetch(`${import.meta.env.VITE_API}/messages/${selectedChat._id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'text',
          text: messageText
        })
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      await fetchConversations();
      
      if (socket.connected) {
        socket.emit('message-sent', {
          conversationId: selectedChat._id,
          userId: currentUser._id
        });
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

const handleTyping = () => {
  if (!selectedChat?._id || selectedChat.isNew || !socket.connected) return;

  console.log('👤 Emitting typing event');
  socket.emit('typing', {
    conversationId: selectedChat._id,
    userId: currentUser._id,
    userName: currentUser.userName
  });

  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  const timeout = setTimeout(() => {
    console.log('🛑 Emitting stop typing event');
    socket.emit('stop-typing', {
      conversationId: selectedChat._id,
      userId: currentUser._id
    });
  }, 2000);

  setTypingTimeout(timeout);
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else if (diffInHours < 168) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const reactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const handleReaction = async (messageId, emoji) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API}/messages/${selectedChat._id}/message/${messageId}/reaction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji })
      }
    );

    if (!res.ok) throw new Error('Failed to toggle reaction');

    const data = await res.json();
    
    setMessages(prev => prev.map(msg => 
      msg._id === messageId 
        ? { ...msg, reactions: data.reactions }
        : msg
    ));
    
    setShowReactionPicker(null);
  } catch (error) {
    console.error('Error toggling reaction:', error);
  }
};

const getReactionCounts = (message) => {
  if (!message.reactions || message.reactions.length === 0) return {};
  
  const counts = {};
  message.reactions.forEach(reaction => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
  });
  return counts;
};

const hasUserReacted = (message, emoji) => {
  if (!message.reactions) return false;
  return message.reactions.some(
    r => r.userId === currentUser?._id && r.emoji === emoji
  );
};

const handleCopyMessage = (text) => {
  navigator.clipboard.writeText(text);
  setOpenMessageMenu(null);
};

const handleDeleteMessage = async (messageId) => {
  if (!confirm(t("Delete this message? This will remove it from your view only."))) {
    return;
  }

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API}/messages/${selectedChat._id}/message/${messageId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );

    if (!res.ok) {
      const error = await res.json();
      console.error(error.error || 'Failed to delete message');
      return;
    }

    setMessages(prev => prev.filter(msg => msg._id !== messageId));
    setOpenMessageMenu(null);
    
    await fetchConversations();

  } catch (error) {
    console.error('Error deleting message:', error);
    console.error('Failed to delete message');
  }
};

const handleUnsendMessage = async (messageId) => {
  if (!confirm(t("Unsend this message? It will be removed for everyone."))) {
    return;
  }

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API}/messages/${selectedChat._id}/message/${messageId}/unsend`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );

    if (!res.ok) {
      const error = await res.json();
      console.error(error.error || 'Failed to unsend message');
      return;
    }

    setMessages(prev => prev.filter(msg => msg._id !== messageId));
    setOpenMessageMenu(null);
    
    await fetchConversations();

  } catch (error) {
    console.error('Error unsending message:', error);
    console.error('Failed to unsend message');
  }
};

// ⭐ NEW: Handle toggle mute/unmute
const handleToggleMute = async () => {
  if (!selectedChat?._id) return;

  try {
    const res = await fetch(`${import.meta.env.VITE_API}/messages/${selectedChat._id}/mute`, {
      method: 'PUT',
      credentials: 'include'
    });

    if (!res.ok) throw new Error('Failed to toggle mute');

    const data = await res.json();
    
    // Refetch the conversation to get updated state
    await fetchConversationMessages(selectedChat._id, 1);

    // Update conversations list
    setConversations(prev => prev.map(conv => 
      conv._id === selectedChat._id 
        ? { ...conv, isMuted: data.isMuted }
        : conv
    ));

    setShowSettings(false);
  } catch (error) {
    console.error('Error toggling mute:', error);
  }
};

const handleDeleteConversation = async () => {
  if (!selectedChat?._id) return;

  setDeletingConversation(true);
  try {
    await fetch(`${import.meta.env.VITE_API}/messages/${selectedChat._id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    setShowDeleteModal(false);
    navigate('/chat');
    fetchConversations();
  } catch (error) {
    console.error('Delete error:', error);
  } finally {
    setDeletingConversation(false);
  }
};

const handleBlockUser = async () => {
  if (!recipientUser?._id) return;

  setBlockingUser(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API}/user/block/${recipientUser._id}`, {
      method: 'PUT',
      credentials: 'include',
    });

    if (!res.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to block user');
    }
    
    console.log(`${t('Blocked')} ${recipientUser.userName}`);
    
    setShowBlockModal(false);
    navigate('/chat');
    await fetchConversations();

  } catch (error) {
    console.error('Error blocking user:', error);
    console.error(error.message || 'An error occurred while trying to block the user.');
  } finally {
    setBlockingUser(false);
  }
};

const handleMenuOpen = (messageId, event, isSent) => {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  
  const menuWidth = 200;
  const menuHeight = 160;
  const spacing = 8;
  
  let top = rect.bottom + spacing;
  let left = isSent ? rect.right - menuWidth : rect.left;
  
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  
  if (spaceBelow < menuHeight + spacing && spaceAbove > spaceBelow) {
    top = rect.top - menuHeight - spacing;
  }
  
  if (left + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - spacing;
  }
  
  if (left < spacing) {
    left = spacing;
  }
  
  setMenuPosition({ top, left });
  setOpenMessageMenu(openMessageMenu === messageId ? null : messageId);
};

const handleReplyClick = (message) => {
  setReplyingTo(message);
  setOpenMessageMenu(null);
  if (messageInputRef.current) {
    messageInputRef.current.focus();
  }
};

const cancelReply = () => {
  setReplyingTo(null);
};

const handleThemeUpdate = (newTheme) => {
  setChatTheme(newTheme);
};

return (
    <>

            <SEO 
      title={"Messages"}
      description={"Check your messages and stay connected with your friends."}
      noIndex={true}

    />     
      <Header />
      <MessagesSideBar />
      <div className="main-layout">
        <div className="margin-messages-container"></div>

        <div style={{ width: "100%", boxSizing: "border-box" }}>
          <div className={`messages-page-container ${selectedChat ? 'has-active-chat' : ''}`}>
            <h1 className="message-heading">{t("Messages")}</h1>
            
            <div className="messages-card">
              <div className="messages-content">
                
                <div className={`conversations-panel ${selectedChat ? 'hidden' : ''}`}>
                  <div className="conversations-header">
                    <div className="conversations-search">
                      <MagnifyingGlass size={20} className="search-icon" />
                      <input
                        type="text"
                        placeholder={t("Search conversations...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="messages-tabs">
                      <button
                        className={`messages-tab ${activeTab === "primary" ? "active" : ""}`}
                        onClick={() => setActiveTab("primary")}
                      >
                        {t("Primary")}
                      </button>
                      <button
                        className={`messages-tab ${activeTab === "requests" ? "active" : ""}`}
                        onClick={() => setActiveTab("requests")}
                      >
                        {t("Requests")}
                      </button>
                    </div>
                  </div>

                  <div className="conversations-list" ref={conversationsListRef}>
                    {loading ? (
                      <div className="empty-conversations">
                        <CircleNotch size={40} weight="bold" className="rotating-spinner" />
                      </div>
                    ) : processedConversations.length === 0 ? (
                      searchQuery ? (
                        <div className="empty-conversations">
                          <MagnifyingGlass 
                            size={100} 
                            weight="duotone" 
                            className="empty-conversations-icon" 
                          />
                          <h3>{t("No Results Found")}</h3>
                          <p>
                            {t("No conversations match your search. Try a different keyword.")}
                          </p>
                        </div>
                      ) : (
                        <div className="empty-conversations">
                          <ChatCircleDots 
                            size={100} 
                            weight="duotone" 
                            className="empty-conversations-icon" 
                          />
                          <h3>{t("No Messages Yet")}</h3>
                          <p>
                            {t("Start a conversation with someone you follow to see your messages here.")}
                          </p>
                          <button 
                            className="btn btn-primary"
                            onClick={() => navigate("/explore")}
                          >
                            {t("Find People")}
                          </button>
                        </div>
                      )
                    ) : (
                      <>
                        {processedConversations.map((conversation) => {
                          const otherUser = conversation.participants.find(
                            p => p._id !== currentUser?._id
                          );
                          return (
                            <div
                              key={conversation._id}
                              className={`conversation-item ${selectedChat?._id === conversation._id ? 'active' : ''}`}
                              onClick={() => navigate(`/chat?userId=${otherUser?._id}`)}
                            >
                              <div className="conversation-avatar-wrapper">
                                <img
                                  src={otherUser?.profilePic || defaultProfilePic}
                                  alt={otherUser?.userName}
                                  className="conversation-avatar"
                                />
                                {onlineUsers.has(otherUser?._id) && <div className="conversation-online-status"></div>}
                              </div>
                              <div className="conversation-info">
                                <div className="conversation-top">
                                  <span className="conversation-name">
                                    {otherUser?.userName || 'Unknown'}
                                  </span>
                                  <span className="conversation-time">
                                    {formatTime(conversation.time)}
                                  </span>
                                </div>
                                <div className="conversation-bottom">
                                  <p className={`conversation-message ${conversation.unread ? 'unread' : ''} ${conversation.isTypingNow ? 'typing' : ''}`}>
                                    {conversation.displayStatus}
                                  </p>
                                  {conversation.isMuted && (
                                    <div className="mute-icon" title="Muted">
                                      <BellSlash size={16} weight="bold" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {conversation.unread && (
                                <div className="unread-badge">{conversation.unreadCount}</div>
                              )}
                            </div>
                          );
                        })}
                        {loadingMoreConversations && (
                          <div className="loading-more-conversations">
                            <CircleNotch size={24} weight="bold" className="rotating-spinner-infinite" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={`chat-panel ${selectedChat ? 'active' : ''}`}>
                  {loadingUser ? (
                    <div className="empty-chat">
                      <CircleNotch size={50} weight="bold" className="rotating-spinner" />
                    </div>
                  ) : !selectedChat ? (
                    <div className="empty-chat">
                      <PaperPlaneTilt 
                        size={120} 
                        weight="duotone" 
                        className="empty-chat-icon" 
                      />
                      <h3>{t("Your Messages")}</h3>
                      <p>
                        {t("Select a conversation from the list to start chatting, or search for someone new to message.")}
                      </p>
                    </div>
                  ) : (
                    <div className="chat-container">
                      <div className="chat-header">
                        <button 
                          className="back-to-conversations-btn"
                          onClick={() => {
                            setSelectedChat(null);
                            setRecipientUser(null);
                            setMessages([]);
                            navigate('/chat');
                          }}
                        >
                          <ArrowLeft size={24} weight="bold" />
                        </button>
                        <div className="chat-avatar-wrapper">
                          <img 
                            src={recipientUser?.profilePic || defaultProfilePic} 
                            alt={recipientUser?.userName}
                            className="chat-avatar"
                          />
                          {isRecipientOnline && <div className="chat-online-status"></div>}
                        </div>
                        <div className="chat-header-info">
                          <h3>{recipientUser?.userName}</h3>
                          <p>{recipientUser?.name}</p>
                        </div>
                        <div className="chat-settings-wrapper" ref={settingsRef}>
                          <button 
                            className="chat-settings-btn"
                            onClick={() => setShowSettings(!showSettings)}
                          >
                            <DotsThreeVertical size={24} weight="bold" />
                          </button>
                          
                          {showSettings && (
                            <div className="chat-settings-dropdown">
                              <button 
                                className="settings-option"
                                onClick={() => {
                                  navigate(`/user/${recipientUser?.userName}`);
                                  setShowSettings(false);
                                }}
                              >
                                <User size={20} />
                                <span>{t("View Profile")}</span>
                              </button>
                              
                              <button className="settings-option" onClick={() => {
                                setShowThemeModal(true);
                                setShowSettings(false);
                              }}>
                                <Palette size={20} />
                                <span>{t("Change Theme")}</span>
                              </button>
                              
                              <button className="settings-option" onClick={handleToggleMute}>
                                {selectedChat?.isMuted ? <Bell size={20} /> : <BellSlash size={20} />}
                                <span>{selectedChat?.isMuted ? t("Unmute") : t("Mute")}</span>
                              </button>
                              
                              <button 
                                className="settings-option danger"
                                onClick={() => {
                                  setShowDeleteModal(true);
                                  setShowSettings(false);
                                }}
                              >
                                <Trash size={20} />
                                <span>{t("Delete Conversation")}</span>
                              </button>
                              
                              <button 
                                className="settings-option danger"
                                onClick={() => {
                                  setShowBlockModal(true);
                                  setShowSettings(false);
                                }}
                              >
                                <Prohibit size={20} />
                                <span>{t("Block User")}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="messages-area">
                        {selectedChat.isNew ? (
                          <div className="new-conversation-prompt">
                            <img 
                              src={recipientUser?.profilePic || defaultProfilePic} 
                              alt={recipientUser?.userName}
                              className="new-chat-avatar"
                            />
                            <h4>{recipientUser?.userName}</h4>
                            <p>{recipientUser?.bio || t("Say hi to start the conversation!")}</p>
                          </div>
                        ) : (
                          <>
                          {Object.values(typingUsers).length > 0 && (
                            <div className="typing-indicator">
                              <img 
                                src={recipientUser?.profilePic || defaultProfilePic} 
                                alt="typing"
                                className="typing-avatar"
                              />
                              <div className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                              <span className="typing-text">
                                {Object.values(typingUsers)[0]} is typing...
                              </span>
                            </div>
                          )}
                          <div className="messages-list" ref={messagesListRef}>
                            {loadingMoreMessages && <div className="loading-more-messages"><CircleNotch size={32} weight="bold" className="rotating-spinner-infinite" /></div>}
                            {messages.length > 0 && !hasMoreMessages && (
                              <div className="conversation-start">
                                <img 
                                  src={recipientUser?.profilePic || defaultProfilePic} 
                                  alt={recipientUser?.userName}
                                  className="conversation-start-avatar"
                                />
                                <h4>{recipientUser?.userName}</h4>
                                <p>{t("This is the beginning of your conversation with")} {recipientUser?.userName}. {t("Say hi to start!")}</p>
                              </div>
                            )}
                            {messages.map((msg) => {
                              const isSent = msg.senderId._id === currentUser?._id || msg.senderId === currentUser?._id;
                              const reactionCounts = getReactionCounts(msg);
                              
                              return (
                                <div 
                                  key={msg._id}
                                  className={`message ${isSent ? 'sent' : 'received'}`}
                                >
                                  {!isSent && (
                                    <img 
                                      src={recipientUser?.profilePic || defaultProfilePic} 
                                      alt={recipientUser?.userName}
                                      className="message-avatar"
                                    />
                                  )}
                                  
                                  <div className="message-actions">
                                    <button 
                                      className="message-action-btn"
                                      onClick={() => setShowReactionPicker(showReactionPicker === msg._id ? null : msg._id)}
                                      title="React"
                                    >
                                      <Smiley size={18} weight="bold" />
                                    </button>
                                    
                                    <div className="message-menu-wrapper">
                                      <button 
                                        className="message-action-btn"
                                        onClick={(e) => handleMenuOpen(msg._id, e, isSent)}
                                        title="More"
                                      >
                                        <DotsThree size={18} weight="bold" />
                                      </button>
                                    </div>
                                    
                                    {showReactionPicker === msg._id && (
                                      <div className="reaction-picker">
                                        {reactions.map(emoji => (
                                          <button
                                            key={emoji}
                                            className={`reaction-btn ${hasUserReacted(msg, emoji) ? 'active' : ''}`}
                                            onClick={() => handleReaction(msg._id, emoji)}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div 
                                    className={`message-content ${msg.type === 'image' ? 'has-image' : ''}`}
                                    style={{
                                      background: isSent ? chatTheme : 'var(--secondary-color)',
                                      color: isSent ? 'white' : 'var(--text-primary-color)'
                                    }}
                                  >
                                    {msg.replyTo && (
                                      <div className="message-reply-indicator">
                                        <div className="reply-to-label">
                                          {t("Replying to")} {msg.replyTo.senderName}
                                        </div>
                                        <p className="reply-to-text">{msg.replyTo.text}</p>
                                      </div>
                                    )}
                                    
                                    {msg.type === 'image' && msg.media?.url ? (
                                      <div style={{ position: 'relative' }}>
                                        <img 
                                          src={msg.media.url} 
                                          alt="Sent image" 
                                          className="message-image"
                                          onClick={() => setFullScreenImage(msg.media.url)}
                                        />
                                        <span className="message-time-image">
                                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                          {renderMessageStatus(msg)}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <p>{msg.text}</p>
                                        <span className="message-time">
                                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                                            hour: '2-digit',
                                            minute: '2-digit' 
                                          })}
                                          {renderMessageStatus(msg)}
                                        </span>
                                      </>
                                    )}
                                    
                                    
                                    {Object.keys(reactionCounts).length > 0 && (
                                      <div className="message-reactions">
                                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                                          <button
                                            key={emoji}
                                            className={`reaction-display ${hasUserReacted(msg, emoji) ? 'reacted' : ''}`}
                                            onClick={() => handleReaction(msg._id, emoji)}
                                            title={`${count} reaction${count > 1 ? 's' : ''}`}
                                          >
                                            <span className="reaction-emoji">{emoji}</span>
                                            <span className="reaction-count">{count}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </div>
                          </>
                        )}
                      </div>

                      {openMessageMenu !== null && (
                        <div 
                          className="message-menu-dropdown"
                          style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`
                          }}
                        >
                          {messages.find(m => m._id === openMessageMenu)?.type === 'text' && (
                            <button 
                              className="message-menu-option"
                              onClick={() => handleCopyMessage(messages.find(m => m._id === openMessageMenu)?.text)}
                            >
                              <Copy size={16} />
                              <span>{t("Copy")}</span>
                            </button>
                          )}
                          
                          <button 
                            className="message-menu-option"
                            onClick={() => {
                              const msg = messages.find(m => m._id === openMessageMenu);
                              handleReplyClick(msg);
                            }}
                          >
                            <ArrowBendUpLeft size={16} />
                            <span>{t("Reply")}</span>
                          </button>
                          
                          {messages.find(m => m._id === openMessageMenu) && 
                           (messages.find(m => m._id === openMessageMenu).senderId._id === currentUser?._id || 
                            messages.find(m => m._id === openMessageMenu).senderId === currentUser?._id) && (
                            <button 
                              className="message-menu-option danger"
                              onClick={() => handleUnsendMessage(openMessageMenu)}
                            >
                              <ArrowCounterClockwise size={16} />
                              <span>{t("Unsend")}</span>
                            </button>
                          )}
                          
                          <button 
                            className="message-menu-option danger"
                            onClick={() => handleDeleteMessage(openMessageMenu)}
                          >
                            <Trash size={16} />
                            <span>{t("Delete")}</span>
                          </button>
                        </div>
                      )}

                      {imagePreview && (
                        <div className="image-preview-container">
                          <img src={imagePreview} alt="Preview" className="image-preview" />
                          <button 
                            className="remove-image-btn" 
                            onClick={() => { 
                              setSelectedImage(null); 
                              setImagePreview(null); 
                              if (fileInputRef.current) fileInputRef.current.value = ''; 
                            }}
                          >
                            <X size={20} weight="bold" />
                          </button>
                        </div>
                      )}

                      {replyingTo && (
                        <div className="reply-preview-bar">
                          <div className="reply-preview-content">
                            <div className="reply-preview-label">
                              {t("Replying to")} {replyingTo.senderId?.userName || recipientUser?.userName}
                            </div>
                            <p className="reply-preview-text">
                              {replyingTo.text || '[Image]'}
                            </p>
                          </div>
                          <button className="cancel-reply-btn" onClick={cancelReply}>
                            <X size={20} weight="bold" />
                          </button>
                        </div>
                      )}

                      <div className="message-input-container">
                        {isBlocked ? (
                          <div className="blocked-message-area">
                            <div className="blocked-icon">
                              <Prohibit size={48} weight="bold" />
                            </div>
                            <p className="blocked-text">
                              {t("You cannot send messages - user is blocked or has blocked you")}
                            </p>
                          </div>
                        ) : !canMessage ? (
                          <div className="blocked-message-area">
                            <div className="blocked-icon">
                              <Prohibit size={48} weight="bold" />
                            </div>
                            <p className="blocked-text">
                              {privacy === 'No One' 
                                ? t("This user is not receiving messages right now.")
                                : t("You must be friends to message this user.")
                              }
                            </p>
                          </div>
                        ) : currentUser?.privacySettings?.whoCanDM === 'No One' ? (
                          <div className="blocked-message-area">
                            <div className="blocked-icon">
                              <Prohibit size={48} weight="bold" />
                            </div>
                            <p className="blocked-text">
                              {t("You have disabled sending and receiving messages.")}
                            </p>
                          </div>
                        ) : (
                          <>
                            <button className="image-upload-btn" disabled={uploadingImage || imagePreview}>
                              <Image size={24} weight="bold" />
                              <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*"
                                className="image-input-hidden"
                                onChange={handleImageSelect}
                                disabled={uploadingImage || imagePreview}
                              />
                            </button>
                            
                            {imagePreview ? (
                              <button 
                                className="send-button" 
                                onClick={handleSendImage} 
                                disabled={uploadingImage}
                              >
                                {uploadingImage ? t("Sending...") : t("Send Image")}
                              </button>
                            ) : (
                              <>
                                <input 
                                  ref={messageInputRef}
                                  type="text"
                                  placeholder={t("Type a message...")}
                                  className="message-input"
                                  onChange={handleTyping}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSendMessage(e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                                <button 
                                  className="send-button"
                                  onClick={(e) => {
                                    const input = e.target.parentElement.querySelector('.message-input');
                                    handleSendMessage(input.value);
                                    input.value = '';
                                  }}
                                >
                                  {t("Send")}
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <BottomNav />

      {fullScreenImage && (
        <div className="fullscreen-image-overlay" onClick={() => setFullScreenImage(null)}>
          <button className="close-fullscreen-btn" onClick={() => setFullScreenImage(null)}>
            <X size={32} weight="bold" />
          </button>
          <img src={fullScreenImage} alt="Full size" className="fullscreen-image" />
        </div>
      )}

      {showBlockModal && (
        <div className="modal-wrapper">
          <BlockConfirmationModal
            isOpen={showBlockModal}
            onClose={() => setShowBlockModal(false)}
            onConfirm={handleBlockUser}
            username={recipientUser?.userName}
            buttonLoading={blockingUser}
          />
        </div>
      )}

      {showThemeModal && (
        <div className="modal-wrapper">
          <ThemeModal
            isOpen={showThemeModal}
            onClose={() => setShowThemeModal(false)}
            onSelectTheme={handleThemeUpdate}
            currentTheme={chatTheme}
            conversationId={selectedChat?._id}
          />
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-wrapper">
          <DeleteConversationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteConversation}
            buttonLoading={deletingConversation}
          />
        </div>
      )}
    </>
  );
}