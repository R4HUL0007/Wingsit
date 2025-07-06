import { useEffect, useState, useRef } from "react";
import { io as socketIOClient } from "socket.io-client";
import { FiSearch, FiImage, FiSmile, FiSend, FiMoreVertical, FiTrash2, FiEdit, FiMenu, FiArrowLeft } from "react-icons/fi";
import { Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FaHeart, FaRegHeart, FaEllipsisH, FaThumbtack, FaEdit, FaTrash, FaSmile, FaPaperclip, FaMicrophone, FaStop, FaPlay, FaPause } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { MdEmojiEmotions } from "react-icons/md";
import { BsThreeDotsVertical } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

const CHAT_HISTORY_KEY = "chat_history";
const SELECTED_USER_KEY = "selected_user";

const Chat = ({ showUserList = true }) => {
  const [followingUsers, setFollowingUsers] = useState([]);
  const [dmPartners, setDMPartners] = useState([]);
  const [users, setUsers] = useState([]); // merged, deduped, sorted
  const [selectedUser, setSelectedUser] = useState(null); // null by default
  const [messagesCache, setMessagesCache] = useState({}); // { userId: [messages] }
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadDMs, setUnreadDMs] = useState({});
  const [notificationCounts, setNotificationCounts] = useState({});
  const [userLastMessageTimes, setUserLastMessageTimes] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastNotificationFetch, setLastNotificationFetch] = useState(0);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [theme, setTheme] = useState('dark');
  const fileInputRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // React Query for unread DM count
  const { data: unreadDMData } = useQuery({
    queryKey: ["unreadDMCount"],
    queryFn: async () => {
      const res = await fetch('/api/users/messages/unread');
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data;
      }
      return {};
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // React Query for unread notification count
  const { data: unreadNotificationCount = 0 } = useQuery({
    queryKey: ["unreadNotificationCount"],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      const data = await res.json();
      return data.count || 0;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        setAuthUser(data);
        setAuthLoading(false);
      });
    fetch("/api/users/following-users").then(res => res.json()).then(setFollowingUsers);
    fetch("/api/users/messages/partners").then(res => res.json()).then(setDMPartners);
    socketRef.current = socketIOClient();
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    // Merge and dedupe by _id
    const map = new Map();
    [...(Array.isArray(followingUsers) ? followingUsers : []), ...(Array.isArray(dmPartners) ? dmPartners : [])].forEach(u => {
      if (u && u._id) map.set(u._id, u);
    });
    const mergedUsers = Array.from(map.values());
    setUsers(mergedUsers);
    
    // Fetch notification counts and last message times for all users
    if (mergedUsers.length > 0) {
      fetchNotificationCounts(mergedUsers);
      fetchUserLastMessageTimes(mergedUsers);
    }
  }, [followingUsers, dmPartners]);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }
    const userId = selectedUser._id;
    if (messagesCache[userId]) {
      setMessages(messagesCache[userId]);
    } else {
      setMessages([]);
      setLoadingMessages(true);
    }
    // Always refetch in background
    fetch(`/api/users/messages/${userId}`)
      .then(res => res.json())
      .then(msgs => {
        setMessagesCache(prev => ({ ...prev, [userId]: msgs }));
        setMessages(msgs);
        setLoadingMessages(false);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(msgs));
        
        // Mark messages as read when they are loaded
        if (msgs.length > 0) {
          fetch(`/api/users/messages/${userId}/read`, { method: 'POST' })
            .then(() => {
              // Update message status to 'read' for all messages from this user
              setMessages(prev => 
                prev.map(msg => 
                  msg.sender === userId && msg.status !== 'read'
                    ? { ...msg, status: 'read' }
                    : msg
                )
              );
            })
            .catch(error => console.error('Error marking messages as read:', error));
        }
      });
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;
    const userId = selectedUser._id;
    
    // Join chat room for typing indicators
    socketRef.current.emit("join-chat", { userId: authUser?._id, partnerId: userId });
    
    socketRef.current.on("newMessage", (msg) => {
      if (
        (msg.sender === authUser?._id && msg.receiver === userId) ||
        (msg.sender === userId && msg.receiver === authUser?._id)
      ) {
        setMessagesCache(prev => {
          const updated = [...(prev[userId] || []), msg];
          return { ...prev, [userId]: updated };
        });
        setMessages(prev => {
          const updated = [...prev, msg];
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });
        
        // Update last message time for the sender
        const senderId = msg.sender;
        setUserLastMessageTimes(prev => ({
          ...prev,
          [senderId]: msg.createdAt || new Date().toISOString()
        }));
        
        // Update unread count if message is from other user and not in current chat
        if (msg.sender !== authUser?._id && selectedUser?._id !== msg.sender) {
          setUnreadDMs(prev => ({
            ...prev,
            [msg.sender]: (prev[msg.sender] || 0) + 1
          }));
          
          // Also update notification count for new message
          setNotificationCounts(prev => ({
            ...prev,
            [msg.sender]: (prev[msg.sender] || 0) + 1
          }));
        }
      }
    });
    
    socketRef.current.on("user-typing", (data) => {
      if (data.userId === userId) {
        setPartnerTyping(data.isTyping);
      }
    });
    
    socketRef.current.on("messageReaction", (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    });
    
    socketRef.current.on("messagePinned", (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, isPinned: data.isPinned }
            : msg
        )
      );
    });
    
    socketRef.current.on("messageStatusUpdate", (data) => {
      console.log('Message status update received:', data);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, status: data.status }
            : msg
        )
      );
    });
    
    return () => {
      socketRef.current.off("newMessage");
      socketRef.current.off("user-typing");
      socketRef.current.off("messageReaction");
      socketRef.current.off("messagePinned");
      socketRef.current.off("messageStatusUpdate");
    };
  }, [selectedUser, authUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!authUser) return;
    console.log('ChatPage: Fetching unread DMs for user:', authUser._id);
    fetch('/api/users/messages/unread')
      .then(res => {
        console.log('ChatPage: Unread DMs response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('ChatPage: Unread DMs data:', data);
        if (data && typeof data === 'object' && !Array.isArray(data) && !data.error) {
          console.log('ChatPage: Setting unread DMs:', data);
          setUnreadDMs(data);
        } else {
          console.log('ChatPage: No unread DMs or invalid data format');
          setUnreadDMs({});
        }
      })
      .catch((error) => {
        console.error('ChatPage: Error fetching unread DMs:', error);
        setUnreadDMs({});
      });
    
    // Also refresh notification counts and last message times
    if (users.length > 0) {
      fetchNotificationCounts(users);
      fetchUserLastMessageTimes(users);
    }
  }, [authUser?._id, users.length]); // Only depend on authUser ID, not the entire authUser object

  // Periodic refresh of unread counts - only run when authUser and users are stable
  useEffect(() => {
    if (!authUser || users.length === 0) return;
    
    const interval = setInterval(() => {
      fetch('/api/users/messages/unread')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data === 'object' && !Array.isArray(data) && !data.error) {
            setUnreadDMs(data);
          }
        })
        .catch(() => setUnreadDMs({}));

      fetchNotificationCounts(users);
    }, 10000); // Refresh every 10 seconds instead of 5

    return () => clearInterval(interval);
  }, [authUser?._id, users.length]); // Only depend on authUser ID and users length

  useEffect(() => {
    if (!selectedUser || !authUser) return;
    
    // Mark messages as read when user views them
    const markMessagesAsRead = async () => {
      try {
        const res = await fetch(`/api/users/messages/${selectedUser._id}/read`, { method: 'POST' });
        if (res.ok) {
          setUnreadDMs((prev) => {
            const copy = { ...prev };
            delete copy[selectedUser._id];
            return copy;
          });
          
          // Update message status to 'read' for all messages from this user
          setMessages(prev => 
            prev.map(msg => 
              msg.sender === selectedUser._id && msg.status !== 'read'
                ? { ...msg, status: 'read' }
                : msg
            )
          );
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    // Mark as read immediately when user is selected
    markMessagesAsRead();
    
    // Also mark as read when messages are scrolled into view
    const handleScroll = () => {
      if (messages.length > 0) {
        markMessagesAsRead();
      }
    };
    
    const chatContainer = document.querySelector('.overflow-y-auto');
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, [selectedUser, authUser, messages]);

  // Sync unreadDMs state with unreadDMData from React Query
  useEffect(() => {
    if (unreadDMData && typeof unreadDMData === 'object') {
      setUnreadDMs(unreadDMData);
    }
  }, [unreadDMData]);

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing start
    if (!isTyping && selectedUser) {
      setIsTyping(true);
      socketRef.current.emit("typing-start", { 
        userId: authUser?._id, 
        partnerId: selectedUser._id 
      });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit("typing-stop", { 
        userId: authUser?._id, 
        partnerId: selectedUser._id 
      });
    }, 1000);
  };

  const handleImageIconClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setImageFile(file);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageFile) || !selectedUser) return;
    let optimisticMsg = null;
    if (imageFile) {
      // Show image preview optimistically
      const tempUrl = URL.createObjectURL(imageFile);
      optimisticMsg = {
        _id: `optimistic-img-${Date.now()}`,
        sender: authUser._id,
        receiver: selectedUser._id,
        imageUrl: tempUrl,
        content: '',
        createdAt: new Date().toISOString(),
        optimistic: true,
        type: 'image',
      };
      setMessagesCache(prev => {
        const updated = [...(prev[selectedUser._id] || []), optimisticMsg];
        return { ...prev, [selectedUser._id]: updated };
      });
      setMessages(prev => [...prev, optimisticMsg]);
    }
    if (imageFile) {
      // Send image to backend
      const formData = new FormData();
      formData.append('receiverId', selectedUser._id);
      formData.append('image', imageFile);
      const res = await fetch('/api/users/send-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessagesCache(prev => {
          const filtered = (prev[selectedUser._id] || []).filter(m => m._id !== optimisticMsg._id);
          return { ...prev, [selectedUser._id]: [...filtered, { ...data, sender: authUser._id, receiver: selectedUser._id, type: 'image' }] };
        });
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== optimisticMsg._id);
          return [...filtered, { ...data, sender: authUser._id, receiver: selectedUser._id, type: 'image' }];
        });
      } else {
        setMessagesCache(prev => {
          const filtered = (prev[selectedUser._id] || []).filter(m => m._id !== optimisticMsg._id);
          return { ...prev, [selectedUser._id]: filtered };
        });
        setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
        alert(data.error || 'Failed to send image');
      }
      setImageFile(null);
    }
    if (newMessage.trim()) {
      const optimisticMsg = {
        _id: `optimistic-${Date.now()}`,
        sender: authUser._id,
        receiver: selectedUser._id,
        content: newMessage,
        createdAt: new Date().toISOString(),
        optimistic: true,
      };
      setMessagesCache(prev => {
        const updated = [...(prev[selectedUser._id] || []), optimisticMsg];
        return { ...prev, [selectedUser._id]: updated };
      });
      setMessages(prev => [...prev, optimisticMsg]);
      try {
    const res = await fetch("/api/users/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiverId: selectedUser._id, content: optimisticMsg.content }),
    });
    const data = await res.json();
    if (res.ok) {
          setMessagesCache(prev => {
            const filtered = (prev[selectedUser._id] || []).filter(m => m._id !== optimisticMsg._id);
            return { ...prev, [selectedUser._id]: [...filtered, { ...data, sender: authUser._id, receiver: selectedUser._id }] };
          });
          setMessages(prev => {
            const filtered = prev.filter(m => m._id !== optimisticMsg._id);
            return [...filtered, { ...data, sender: authUser._id, receiver: selectedUser._id }];
          });
          
          // Update last message time for this user
          setUserLastMessageTimes(prev => ({
        ...prev,
            [selectedUser._id]: new Date().toISOString()
          }));
        } else {
          setMessagesCache(prev => {
            const filtered = (prev[selectedUser._id] || []).filter(m => m._id !== optimisticMsg._id);
            return { ...prev, [selectedUser._id]: filtered };
          });
          setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
          alert(data.error || "Failed to send message");
        }
      } catch (error) {
        setMessagesCache(prev => {
          const filtered = (prev[selectedUser._id] || []).filter(m => m._id !== optimisticMsg._id);
          return { ...prev, [selectedUser._id]: filtered };
        });
        setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
        alert("Failed to send message");
    }
    }
    setNewMessage('');
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    
    // Clear unread count for this user immediately
    setUnreadDMs(prev => {
      const copy = { ...prev };
      delete copy[user._id];
      return copy;
    });
    
    // Mark notifications from this user as read
    try {
      const res = await fetch(`/api/notifications/mark-read/${user._id}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`Marked ${data.count} notifications as read from user ${user._id}`);
        
        // Update notification counts locally
        setNotificationCounts(prev => ({
          ...prev,
          [user._id]: 0
        }));
        
        // Refresh all notification counts and last message times to ensure accuracy
        if (users.length > 0) {
          fetchNotificationCounts(users);
          fetchUserLastMessageTimes(users);
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const fetchNotificationCounts = async (userList) => {
    try {
      // Only fetch if we have users and haven't fetched recently
      if (!userList || userList.length === 0) return;
      
      // Debounce: don't fetch more than once every 5 seconds
      const now = Date.now();
      if (now - lastNotificationFetch < 5000) {
        console.log('Skipping notification fetch - too recent');
        return;
      }
      setLastNotificationFetch(now);
      
      console.log('Fetching notification counts for users:', userList.map(u => u._id));
      const promises = userList.map(async (user) => {
        try {
          const res = await fetch(`/api/notifications/unread-count/${user._id}`);
          if (res.ok) {
            const data = await res.json();
            console.log(`User ${user._id} (${user.username}): ${data.count} notifications`);
            return { userId: user._id, count: data.count || 0 };
          }
        } catch (error) {
          console.error(`Error fetching notifications for user ${user._id}:`, error);
        }
        return { userId: user._id, count: 0 };
      });
      
      const results = await Promise.all(promises);
      const counts = {};
      results.forEach(result => {
        counts[result.userId] = result.count;
      });
      console.log('Final notification counts:', counts);
      setNotificationCounts(counts);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  const fetchUserLastMessageTimes = async (userList) => {
    try {
      console.log('Fetching last message times for users:', userList.map(u => u._id));
      const promises = userList.map(async (user) => {
        try {
          const res = await fetch(`/api/users/messages/${user._id}/last-message`);
          if (res.ok) {
            const data = await res.json();
            return { userId: user._id, lastMessageTime: data.lastMessageTime || null };
          }
        } catch (error) {
          console.error(`Error fetching last message time for user ${user._id}:`, error);
        }
        return { userId: user._id, lastMessageTime: null };
      });
      
      const results = await Promise.all(promises);
      const times = {};
      results.forEach(result => {
        times[result.userId] = result.lastMessageTime;
      });
      console.log('Last message times:', times);
      setUserLastMessageTimes(times);
    } catch (error) {
      console.error('Error fetching last message times:', error);
    }
  };

  // Filter and sort users by search and last message time
  const filteredUsers = Array.isArray(users)
    ? users
        .filter(
        (u) =>
          u.fullname.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase())
      )
        .sort((a, b) => {
          const timeA = userLastMessageTimes[a._id];
          const timeB = userLastMessageTimes[b._id];
          
          // If both have message times, sort by most recent first
          if (timeA && timeB) {
            return new Date(timeB) - new Date(timeA);
          }
          
          // If only one has message time, prioritize the one with messages
          if (timeA && !timeB) return -1;
          if (!timeA && timeB) return 1;
          
          // If neither has message time, sort alphabetically by name
          return a.fullname.localeCompare(b.fullname);
        })
    : [];

  const handleDeleteMessage = async (messageId) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    try {
      const res = await fetch(`/api/users/messages/${messageId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setMessages((prev) => {
          const updated = prev.filter(msg => msg._id !== messageId);
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });
        setOpenMenu(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
    }
  };

  const handleEditMessage = async (messageId, currentContent) => {
    setEditingMessage(messageId);
    setEditContent(currentContent);
    setOpenMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      const res = await fetch(`/api/users/messages/${editingMessage}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      
      if (res.ok) {
        setMessages((prev) => {
          const updated = prev.map(msg => 
            msg._id === editingMessage 
              ? { ...msg, content: editContent }
              : msg
          );
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });
        setEditingMessage(null);
        setEditContent("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to edit message");
      }
    } catch (error) {
      console.error("Error editing message:", error);
      alert("Failed to edit message");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await fetch(`/api/users/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      
      if (res.ok) {
        const updatedMessage = await res.json();
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId ? updatedMessage : msg
          )
        );
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
    setShowReactionPicker(null);
  };

  const handlePinMessage = async (messageId) => {
    try {
      const res = await fetch(`/api/users/messages/${messageId}/pin`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const updatedMessage = await res.json();
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId ? updatedMessage : msg
          )
        );
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const fetchPinnedMessages = async () => {
    if (!selectedUser) return;
    
    try {
      const res = await fetch(`/api/users/messages/${selectedUser._id}/pinned`);
      if (res.ok) {
        const pinned = await res.json();
        setPinnedMessages(pinned);
      }
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    }
  };

  const toggleMenu = (messageId) => {
    setOpenMenu(openMenu === messageId ? null : messageId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.message-menu')) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to check if a message is emoji-only
  const isEmojiOnly = (text) => {
    // Regex: only emoji, whitespace, or variation selectors
    return /^([\p{Emoji}\s\uFE0F\u200D]+)$/u.test(text.trim()) && text.trim().length <= 8;
  };

  // Helper to get total unread DMs
  const totalUnreadDMs = Object.values(unreadDMs).reduce((sum, n) => sum + n, 0);
  // Helper to get total notifications
  const totalNotifications = Object.values(notificationCounts).reduce((sum, n) => sum + n, 0);
  
  // Debug logging - only log when there are actual unread messages
  if (totalUnreadDMs > 0 || totalNotifications > 0) {
    console.log('Current unreadDMs state:', unreadDMs);
    console.log('Current notificationCounts state:', notificationCounts);
    console.log('Total unread DMs:', totalUnreadDMs);
    console.log('Total notifications:', totalNotifications);
  }

  // Socket connection for real-time updates
  useEffect(() => {
    if (!authUser?._id) return;

    const socket = socketIOClient();

    // Join user's personal room
    socket.emit("join-user", authUser._id);

    // Listen for new notifications and update count immediately
    socket.on("newNotification", (notification) => {
      console.log("New notification received in chat:", notification);
      // Immediately increment the notification count
      queryClient.setQueryData(["unreadNotificationCount"], (old) => (old || 0) + 1);
      
      // Update notification counts for specific user
      if (notification.from._id) {
        setNotificationCounts(prev => ({
          ...prev,
          [notification.from._id]: (prev[notification.from._id] || 0) + 1
        }));
      }
    });

    // Listen for new messages and update DM count immediately
    socket.on("newMessage", (message) => {
      console.log("New message received in chat:", message);
      // Only increment if the message is for the current user
      if (message.receiver === authUser._id) {
        queryClient.setQueryData(["unreadDMCount"], (old) => {
          const newData = { ...old };
          newData[message.sender] = (newData[message.sender] || 0) + 1;
          return newData;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [authUser?._id, queryClient]);

  useEffect(() => {
    // Auto-select user from query param if present
    const userIdFromQuery = searchParams.get('user');
    if (userIdFromQuery && users.length > 0) {
      const found = users.find(u => u._id === userIdFromQuery);
      if (found) setSelectedUser(found);
    }
  }, [searchParams, users]);

  return (
    <div className="flex h-screen bg-[#181818]">
      {/* Sidebar: always visible on desktop, only visible on mobile if no user is selected */}
      <aside className={`w-full max-w-[320px] md:w-[320px] border-r border-gray-800 flex flex-col bg-[#202327] min-h-[200px] md:min-h-0 shadow-lg z-10 ${selectedUser ? 'hidden' : 'flex'} md:flex`}>
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xl font-bold text-white flex items-center gap-2">
            Messages
            {totalUnreadDMs > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center font-bold ml-2">
                {totalUnreadDMs > 9 ? '9+' : totalUnreadDMs}
              </span>
            )}
            {totalNotifications > 0 && (
              <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center font-bold ml-2">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </span>
          <button className="p-2 rounded-full hover:bg-stone-900 md:hidden" style={{ visibility: 'hidden' }} aria-label="Hidden search">
            <FiSearch className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 rounded-full hover:bg-stone-900 hidden md:block">
              <FiSearch className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        <div className="px-4 pt-3 pb-2 bg-[#202327]">
          <div className="flex items-center bg-[#23272a] rounded-full px-3 py-2 shadow-sm border border-gray-700">
              <FiSearch className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search Direct Messages"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm text-white placeholder-gray-400 min-w-0"
              />
            </div>
          </div>
        <div className="border-b border-gray-800 mx-4" />
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 px-2 py-2 md:items-stretch md:justify-start scrollbar-thin scrollbar-thumb-[#23272a] scrollbar-track-transparent">
            {filteredUsers.length === 0 ? (
              <div className="text-gray-500 text-center mt-8 md:mt-16 px-4 md:px-0 flex-1 flex items-center justify-center">
                {search
                  ? "No users found."
                : "No conversations yet. Start a chat by searching for a user!"}
              </div>
            ) : (
            filteredUsers.map((user) => {
              // Only log if user has unread messages or notifications
              if (unreadDMs[user._id] > 0 || notificationCounts[user._id] > 0) {
                console.log(`User ${user.username} (${user._id}): unreadDMs = ${unreadDMs[user._id]}, notifications = ${notificationCounts[user._id]}`);
              }
              return (
                <div
                  key={user._id}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer rounded-xl transition hover:bg-[#22262c] ${selectedUser?._id === user._id ? "bg-[#23272a]" : ""}`}
                  onClick={() => handleSelectUser(user)}
                >
                <img src={user.profileImg || "/avatar-placeholder.png"} alt="avatar" className="w-12 h-12 rounded-full border-2 border-gray-700 shadow-sm object-cover" />
                  <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate text-base flex items-center gap-2">
                    {user.fullname}
                    {unreadDMs[user._id] > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center font-bold" title="Unread messages">
                        {unreadDMs[user._id]}
                      </span>
                    )}
                    {notificationCounts[user._id] > 0 && (
                      <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center font-bold" title="Notifications">
                        {notificationCounts[user._id] > 9 ? '9+' : notificationCounts[user._id]}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs truncate">@{user.username}</div>
                </div>
              </div>
            );
            })
            )}
          </div>
        </aside>
      {/* Chat area: always visible on desktop, only visible on mobile if a user is selected */}
      <main className={`flex-1 flex flex-col w-full min-h-[300px] ${selectedUser ? '' : 'items-center justify-center'} ${selectedUser ? 'flex' : 'hidden'} md:flex`}>
        {/* Top bar */}
        {selectedUser && (
          <div className="flex items-center gap-4 border-b border-gray-800 px-4 md:px-6 py-4 bg-[#181818] sticky top-0 z-10">
            {/* Mobile back button */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-stone-900 mr-2"
              onClick={() => setSelectedUser(null)}
              aria-label="Back to sidebar"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <img src={selectedUser.profileImg || "/avatar-placeholder.png"} alt="avatar" className="w-10 h-10 rounded-full" />
            <div>
              <div className="font-bold text-lg text-white">{selectedUser.fullname}</div>
              <div className="text-gray-500 text-sm">@{selectedUser.username}</div>
            </div>
            <div className="flex-1" />
            
            {/* Pinned Messages Button */}
            <button
              className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition mr-2"
              onClick={() => {
                setShowPinnedMessages(!showPinnedMessages);
                if (!showPinnedMessages) {
                  fetchPinnedMessages();
                }
              }}
            >
              📌 Pinned
            </button>
            
            {/* Clear Chat Button */}
            <button
              className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition"
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
                  await fetch(`/api/users/messages/${selectedUser._id}/clear`, { method: 'POST' });
                  setMessages([]);
                  setMessagesCache(prev => ({ ...prev, [selectedUser._id]: [] }));
                }
              }}
            >
              Clear Chat
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-6 flex items-center justify-center" style={{ background: '#181818' }}>
          {loadingMessages && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg">Loading messages...</div>
          ) : selectedUser ? (
            <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto">
              {messages.map((msg, idx) => {
                const isMine = msg.sender === authUser?._id;
                const isFirstOfGroup = idx === 0 || messages[idx - 1].sender !== msg.sender;
                const isLastOfGroup = idx === messages.length - 1 || messages[idx + 1].sender !== msg.sender;
                const showAvatar = !isMine && isFirstOfGroup;
                const showName = !isMine && isFirstOfGroup;
                const emojiOnly = msg.type !== 'image' && isEmojiOnly(msg.content);
                const showEdited = msg.edited === true;
                return (
                  <div
                    key={msg._id}
                    className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isFirstOfGroup ? 'mt-4' : 'mt-1'}`}
                  >
                    {/* Left side: avatar for received messages, only for first in group */}
                    {!isMine && showAvatar && (
                      <img
                        src={selectedUser.profileImg || "/avatar-placeholder.png"}
                        alt="avatar"
                        className="w-8 h-8 rounded-full mb-1 mr-2 self-end"
                      />
                    )}
                    <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                      {/* Name for received messages, only for first in group */}
                      {!isMine && showName && (
                        <span className="text-xs text-gray-400 mb-1 ml-1 font-semibold">{selectedUser.fullname}</span>
                      )}
                      <div className="relative flex items-end gap-2 group">
                        {/* Message bubble */}
                      <div
                        className={`p-3 rounded-2xl shadow text-sm break-words ${
                          isMine
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-[#23272a] text-gray-200 rounded-bl-none"
                          } ${emojiOnly ? 'text-3xl leading-tight flex items-center justify-center min-w-[48px] min-h-[48px] p-2' : ''} ${isFirstOfGroup ? '' : isMine ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                          style={{ wordBreak: 'break-word' }}
                        >
                          {editingMessage === msg._id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="p-2 rounded-lg shadow text-sm bg-blue-600 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                rows="1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-full transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-full transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : msg.type === 'image' && msg.imageUrl ? (
                            <img src={msg.imageUrl} alt="sent" className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-700" />
                          ) : (
                            msg.content
                          )}
                        </div>
                        {/* Message reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.reactions.map((reaction, idx) => (
                              <span key={idx} className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Message status indicators */}
                        {isMine && (
                          <div className="flex items-center gap-1 mt-1">
                            {msg.status === 'sent' && <span className="text-gray-400 text-xs font-bold">✓</span>}
                            {msg.status === 'delivered' && <span className="text-gray-400 text-xs font-bold">✓✓</span>}
                            {msg.status === 'read' && <span className="text-orange-500 text-xs font-bold">✓✓</span>}
                          </div>
                        )}
                        
                        {/* Message menu for all messages */}
                        <div className="absolute -top-2 -right-2 flex items-center justify-center message-menu group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-200 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMenu(msg._id);
                            }}
                            className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-1"
                            title="Message options"
                          >
                            <FiMoreVertical className="w-3 h-3" />
                          </button>
                          {openMenu === msg._id && (
                            <div className="absolute top-6 right-0 bg-[#23272a] border border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowReactionPicker(msg._id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                              >
                                😀 React
                              </button>
                              {isMine && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePinMessage(msg._id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                                  >
                                    📌 {msg.isPinned ? 'Unpin' : 'Pin'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMessage(msg._id, msg.content);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Are you sure you want to delete this message?')) {
                                        handleDeleteMessage(msg._id);
                                      }
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Reaction picker */}
                        {showReactionPicker === msg._id && (
                          <div className="absolute top-6 right-0 bg-[#23272a] border border-gray-700 rounded-lg shadow-lg z-10 p-2">
                            <div className="grid grid-cols-5 gap-1">
                              {['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReaction(msg._id, emoji);
                                  }}
                                  className="text-xl hover:bg-gray-700 p-1 rounded"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {isLastOfGroup && (
                          <span className="text-xs text-gray-400 mb-1 whitespace-nowrap flex items-center gap-1">
                            {msg.updatedAt &&
                              new Date(msg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {showEdited && <span className="ml-1 italic text-gray-400">· edited</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicator */}
              {partnerTyping && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={selectedUser.profileImg || "/avatar-placeholder.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="bg-[#23272a] text-gray-200 px-3 py-2 rounded-2xl rounded-bl-none">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">typing</span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-lg">Select a user to chat</div>
          )}
        </div>
        {selectedUser && (
          <form onSubmit={handleSend} className="flex items-center gap-2 px-2 md:px-6 py-4 border-t border-gray-800 bg-[#181818] sticky bottom-0 w-full md:max-w-2xl md:mx-auto rounded-full shadow-lg mt-2">
            <button type="button" className="p-2 rounded-full hover:bg-stone-900" onClick={handleImageIconClick}>
              <FiImage className="w-5 h-5 text-gray-400" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <button type="button" className="p-2 rounded-full hover:bg-stone-900" onClick={() => setShowEmojiPicker((v) => !v)}>
              <FiSmile className="w-5 h-5 text-gray-400" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-0 z-50">
                <Picker onSelect={handleEmojiSelect} theme="dark" />
              </div>
            )}
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              className="flex-1 p-3 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 bg-[#23272a] text-white placeholder-gray-400 min-w-0 mx-2"
              placeholder="Start a new message"
            />
            {imageFile && (
              <div className="ml-2 flex items-center">
                <img src={URL.createObjectURL(imageFile)} alt="preview" className="w-12 h-12 rounded object-cover border border-gray-700" />
                <button type="button" className="ml-1 text-red-400 text-xs" onClick={() => setImageFile(null)}>✕</button>
              </div>
            )}
            <button type="submit" className="bg-blue-600 text-white px-4 md:px-5 py-2 rounded-full font-semibold shadow flex items-center gap-1 text-sm md:text-base hover:bg-blue-700 transition">
              <FiSend className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        )}
        
        {/* Pinned Messages Modal */}
        {showPinnedMessages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23272a] rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold">📌 Pinned Messages</h3>
                <button
                  onClick={() => setShowPinnedMessages(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {pinnedMessages.length === 0 ? (
                <p className="text-gray-400 text-center">No pinned messages</p>
              ) : (
                <div className="space-y-3">
                  {pinnedMessages.map((msg) => (
                    <div key={msg._id} className="bg-[#181818] p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={msg.sender.profileImg || "/avatar-placeholder.png"}
                          alt="avatar"
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-white text-sm font-semibold">
                          {msg.sender.username}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm">{msg.content}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Chat;

// For full screen chat page
export const ChatPage = () => <Chat showUserList={true} />; 