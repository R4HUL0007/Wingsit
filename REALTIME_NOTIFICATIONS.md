# Real-Time Notification System

This document describes the real-time notification system implemented in the Wingsit application, similar to Twitter's notification system.

## Features

### 🚀 Real-Time Notifications
- **Instant Updates**: Notifications appear immediately when actions occur
- **Socket.io Integration**: Uses WebSocket connections for real-time communication
- **User-Specific Rooms**: Each user has their own notification room for targeted delivery

### 📱 Notification Types
1. **Follow Notifications**: When someone follows you
2. **Like Notifications**: When someone likes your post
3. **Message Notifications**: When someone sends you a direct message

### 🎵 Audio & Visual Feedback
- **Notification Sounds**: Custom beep sound using Web Audio API
- **Toast Notifications**: Pop-up messages with emoji icons
- **Badge Counters**: Real-time badge updates in the sidebar

### 🔄 Real-Time Badge Updates
- **Notification Badge**: Shows unread notification count
- **Message Badge**: Shows unread message count
- **Instant Updates**: Badges update immediately without page refresh

## Technical Implementation

### Backend (Node.js + Socket.io)

#### Socket Events
```javascript
// User joins their personal notification room
socket.emit("join-user", userId);

// Server emits notifications to specific users
io.to(`user-${userId}`).emit("newNotification", notificationData);
```

#### Notification Creation
```javascript
// Follow notification
const newNotification = new Notification({
  type: "follow",
  from: currentUser._id,
  to: userToFollow._id,
});
await newNotification.save();

// Emit real-time notification
io.to(`user-${userToFollow._id}`).emit("newNotification", {
  type: "follow",
  from: { _id, username, profileImg },
  to: userToFollow._id,
  notificationId: newNotification._id
});
```

### Frontend (React + React Query)

#### Real-Time Listening
```javascript
// Socket connection for real-time updates
useEffect(() => {
  const socket = socketIOClient();
  socket.emit("join-user", authUser._id);
  
  socket.on("newNotification", (notification) => {
    // Update notification count immediately
    queryClient.setQueryData(["unreadNotificationCount"], (old) => (old || 0) + 1);
    
    // Play notification sound
    playNotificationSound();
    
    // Show toast notification
    toast.success(message, { icon: "👤" });
  });
}, [authUser._id]);
```

#### React Query Integration
```javascript
// Automatic refetching every 10 seconds
const { data: unreadNotificationCount = 0 } = useQuery({
  queryKey: ["unreadNotificationCount"],
  queryFn: async () => {
    const res = await fetch('/api/notifications/unread-count');
    const data = await res.json();
    return data.count || 0;
  },
  refetchInterval: 10000,
});
```

## API Endpoints

### Notifications
- `GET /api/notifications` - Get all notifications for current user
- `DELETE /api/notifications` - Delete all notifications
- `GET /api/notifications/unread-count` - Get unread notification count
- `GET /api/notifications/unread-count/:userId` - Get unread count from specific user
- `POST /api/notifications/mark-read/:userId` - Mark notifications as read from user

### Messages
- `GET /api/users/messages/unread` - Get unread message counts
- `POST /api/users/messages/:userId/read` - Mark messages as read from user

## Usage Examples

### Testing Notifications
1. **Follow Notification**: Follow another user → notification appears instantly
2. **Like Notification**: Like someone's post → notification appears instantly  
3. **Message Notification**: Send a message → notification appears instantly

### Real-Time Features
- Badge counts update immediately
- Toast notifications appear with sound
- Notification page shows real data (no more dummy data)
- All updates happen without page refresh

## Performance Optimizations

### Debouncing
- Notification fetches are debounced to prevent excessive API calls
- Socket events are handled efficiently with proper cleanup

### Caching
- React Query provides intelligent caching and background updates
- Notification counts are cached and updated optimistically

### Memory Management
- Socket connections are properly cleaned up on component unmount
- Audio contexts are managed to prevent memory leaks

## Browser Compatibility

### Web Audio API
- Modern browsers: Full support with custom notification sounds
- Fallback: Console bell character for older browsers

### Socket.io
- All modern browsers supported
- Automatic fallback to polling if WebSockets unavailable

## Future Enhancements

### Planned Features
- [ ] Push notifications for mobile
- [ ] Notification preferences (sound on/off, types)
- [ ] Notification grouping (multiple likes from same user)
- [ ] Notification history with pagination
- [ ] Email notifications for important events

### Performance Improvements
- [ ] Notification batching for high-frequency events
- [ ] Offline notification queue
- [ ] Notification analytics and insights 