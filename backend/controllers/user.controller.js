import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import Notification from "../models/notification.model.js";
import Message from "../models/message.model.js";
import Post from "../models/post.model.js";
import { io } from "../server.js";
import multer from 'multer';
import Feedback from '../models/feedback.model.js';
import nodemailer from 'nodemailer';
const upload = multer({ dest: 'uploads/' });

export const getUserProfile = async (req, res) => {
    const { username } = req.params;

    try{
        const user = await User.findOne({ username }).select("-password");
        if(!user){
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);

    }catch(error) {
        console.log("Error in getUserProfile:", error.message);
        res.status(500).json({error: error.message});

    }

};

export const  followUnfollowUser = async(req, res) => {
    try{
        const{ id } = req.params;
        const userToModify = await User.findById(id);
        const currentUser =  await User.findById(req.user._id);

        if(id == req.user._id.toString()){
            return res.status(400).json({error: "You can't follow/Unfollow yourself"})
        }
        if(!userToModify || !currentUser) return res.status(400).json({
            error: "User not found"
        })

        const isFollowing = currentUser.following.includes(id);

        if(isFollowing){
            //unfollow user
            await User.findByIdAndUpdate(id, { $pull : { followers: req.user._id }});
            await User.findByIdAndUpdate(req.user._id, { $pull : { following:id }});
            //todo return id of the user as a response

            return res.status(200).json({ message: "User Unfollowed Successfully"});
        }else{
            await User.findByIdAndUpdate(id, { $push : { followers: req.user._id }});
            await User.findByIdAndUpdate(req.user._id, { $push : { following:id }});
            //send notification to user
            const newNotification = new Notification({
                type : "follow",
                from: req.user._id,
                to: userToModify._id,
            });
            await newNotification.save();
            
            // Emit real-time notification to the user being followed
            io.to(`user-${userToModify._id}`).emit("newNotification", {
                type: "follow",
                from: {
                    _id: currentUser._id,
                    username: currentUser.username,
                    profileImg: currentUser.profileImg
                },
                to: userToModify._id,
                notificationId: newNotification._id
            });
            
            //todo return id of the user as a response

            return res.status(200).json({ message: "User Followed Successfully" });
        }
    }catch(error){
        console.log("Error in followUnfollowUser: ",error.message);
        return res.status(500).json({error: error.message});
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const userId = req.user._id;

        const usersFollowedByMe = await User.findById(userId).select("following");

        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne : userId}

                    },
            

            },
            { $sample : {size: 10}},
        ]);

        const filteredUsers = users.filter(user=>!usersFollowedByMe.following.includes(user._id));
        const suggestedUsers = filteredUsers.slice(0,4);

        suggestedUsers.forEach((user) => (user.password = null));
        res.status(200).json(suggestedUsers);

    }catch(error){
        console.log("Error in getSuggestedUsers: ",error.message);
    }

}

export const updateUser = async (req, res) => {
    const { fullname, email, username, currentPassword, newPassword, bio,link} = req.body;
    let {profileImg, coverImg} = req.body;

    const userId = req.user._id;

    try{
        //using let cause we are updating here

        let user = await User.findById(userId);
        if(!user) return res.status(404).json({ message: "User not found" });

        if ((!newPassword && currentPassword) || (!currentPassword && newPassword)){
            return res.status(400).json({ message: "Please enter both current and new password" });
        }

        if (currentPassword && newPassword){
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });
            if(newPassword.length <6) {
                return res.status(400).json({ message: "Password must be at least 6 characters"});
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }
        if (profileImg) {
            // to destroy the older photo so it couldn't take more space in cloudinary
            if(user.profileImg){
                await  cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
            }

            //upload the new profile image
            const uploadResponse =await cloudinary.uploader.upload(profileImg);
            profileImg = uploadResponse.secure_url;

        }
        if (coverImg) {

            if(user.coverImg){
                await  cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
            }

            const uploadResponse =await cloudinary.uploader.upload(coverImg);
            coverImg = uploadResponse.secure_url;

        }

        user.fullname = fullname || user.fullname;
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        user = await user.save();

        user.password= null;

        return res.status(200).json(user);

    }catch(error){
        console.log("Error in updateUser",error.message);
        return res.status(500).json({ error: error.message });


    }
}

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;
    const message = await Message.create({ 
      sender: senderId, 
      receiver: receiverId, 
      content, 
      read: false,
      status: 'sent' // Start with 'sent' status
    });
    
    // Create notification for new message
    const newNotification = new Notification({
      type: "message",
      from: senderId,
      to: receiverId,
    });
    await newNotification.save();
    
    // Emit message to receiver in real time
    io.emit("newMessage", message);
    
    // Emit real-time notification to the message receiver
    io.to(`user-${receiverId}`).emit("newNotification", {
      type: "message",
      from: {
        _id: senderId,
        username: req.user.username,
        profileImg: req.user.profileImg
      },
      to: receiverId,
      notificationId: newNotification._id
    });
    
    // Update status to 'delivered' after a short delay (simulating delivery)
    setTimeout(async () => {
      try {
        await Message.findByIdAndUpdate(message._id, { status: 'delivered' });
        io.emit("messageStatusUpdate", { messageId: message._id, status: 'delivered' });
      } catch (error) {
        console.log('Error updating message status to delivered:', error);
      }
    }, 1000);
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getUnreadDMs = async (req, res) => {
  try {
    console.log('getUnreadDMs req.user:', req.user);
    const myId = req.user?._id;
    if (!myId) {
      console.error('getUnreadDMs: myId is missing or invalid:', myId);
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    // Find all unread messages where the user is the receiver
    const unreadMessages = await Message.find({ receiver: myId, read: false });
    // Count unread messages per sender
    const unreadCount = {};
    unreadMessages.forEach(msg => {
      const senderId = msg.sender.toString();
      unreadCount[senderId] = (unreadCount[senderId] || 0) + 1;
    });
    res.status(200).json(unreadCount);
  } catch (error) {
    console.error('Error in getUnreadDMs:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markDMsAsRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;
    
    // Get messages that will be marked as read
    const messagesToUpdate = await Message.find({ 
      sender: userId, 
      receiver: myId, 
      read: false 
    });
    
    // Mark all messages from userId to me as read
    await Message.updateMany(
      { sender: userId, receiver: myId, read: false }, 
      { $set: { read: true, status: 'read' } }
    );
    
    // Emit status updates for each message
    messagesToUpdate.forEach(msg => {
      io.emit("messageStatusUpdate", { messageId: msg._id, status: 'read' });
    });
    
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.log('Error in markDMsAsRead:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;
    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      clearedFor: { $ne: myId },
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const getFollowingUsers = async (req, res) => {
  try {
    console.log('getFollowingUsers req.user:', req.user);
    const user = await User.findById(req.user._id).populate({
      path: 'following',
      select: '-password',
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Filter out any nulls (in case some followed users were deleted)
    const following = (user.following || []).filter(Boolean);
    res.status(200).json(following);
  } catch (error) {
    console.log('Error in getFollowingUsers:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message and check if the user is the sender
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only allow deletion if the user is the sender of the message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Emit socket event to notify other user about message deletion
    io.emit("messageDeleted", { messageId, deletedBy: userId });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage:", error.message);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    // Find the message and check if the user is the sender
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only allow editing if the user is the sender of the message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    // Update the message and set edited flag
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { content: content.trim(), edited: true },
      { new: true }
    );

    // Emit socket event to notify other user about message edit
    io.emit("messageEdited", { 
      messageId, 
      editedBy: userId, 
      newContent: content.trim(),
      updatedMessage 
    });

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.log("Error in editMessage:", error.message);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

export const getDMPartners = async (req, res) => {
  try {
    console.log('getDMPartners req.user:', req.user);
    const myId = req.user._id;
    // Find all messages where the user is sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: myId },
        { receiver: myId }
      ]
    }).select('sender receiver');

    // Collect unique user IDs (excluding self)
    const partnerIds = new Set();
    messages.forEach(msg => {
      if (msg.sender.toString() !== myId.toString()) partnerIds.add(msg.sender.toString());
      if (msg.receiver.toString() !== myId.toString()) partnerIds.add(msg.receiver.toString());
    });

    // Fetch user info for these IDs
    const partners = await User.find({ _id: { $in: Array.from(partnerIds) } }).select('-password');
    res.status(200).json(partners);
  } catch (error) {
    console.log('Error in getDMPartners:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendImageMessage = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    // Upload to cloudinary
    const uploadResponse = await cloudinary.uploader.upload(req.file.path);
    const imageUrl = uploadResponse.secure_url;
    // Save message
    const message = await Message.create({ sender: senderId, receiver: receiverId, imageUrl, content: '', type: 'image', read: false });
    
    // Create notification for new image message
    const newNotification = new Notification({
      type: "message",
      from: senderId,
      to: receiverId,
    });
    await newNotification.save();
    
    io.emit('newMessage', message);
    res.status(201).json(message);
  } catch (error) {
    console.log('Error in sendImageMessage:', error);
    res.status(500).json({ error: 'Failed to send image message' });
  }
};

export const clearChatHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;
    // Delete all messages in this conversation for both users
    await Message.deleteMany({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ]
    });
    res.status(200).json({ message: 'Chat history deleted from database' });
  } catch (error) {
    console.log('Error in clearChatHistory:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getLastMessageTime = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;
    
    // Find the most recent message in the conversation
    const lastMessage = await Message.findOne({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      clearedFor: { $ne: myId },
    }).sort({ createdAt: -1 }).select('createdAt');
    
    res.status(200).json({ 
      lastMessageTime: lastMessage ? lastMessage.createdAt : null 
    });
  } catch (error) {
    console.log("Error in getLastMessageTime:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction if already exists
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
      );
    } else {
      // Remove any existing reaction from this user and add new one
      message.reactions = message.reactions.filter(
        r => r.user.toString() !== userId.toString()
      );
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();
    
    // Emit socket event for real-time updates
    io.emit("messageReaction", { messageId, reactions: message.reactions });

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in addReaction:", error);
    res.status(500).json({ error: error.message });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can pin their own message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only pin your own messages" });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    // Emit socket event for real-time updates
    io.emit("messagePinned", { messageId, isPinned: message.isPinned });

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in pinMessage:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getPinnedMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const pinnedMessages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      isPinned: true,
      clearedFor: { $ne: myId },
    }).populate('sender', 'username profileImg').sort({ createdAt: -1 });

    res.status(200).json(pinnedMessages);
  } catch (error) {
    console.log("Error in getPinnedMessages:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getUserProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const { message, email } = req.body;
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: 'Feedback message is too short.' });
    }
    const feedback = new Feedback({ message, email });
    await feedback.save();

    // Send email notification
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.FEEDBACK_EMAIL_USER,
        pass: process.env.FEEDBACK_EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.FEEDBACK_EMAIL_USER,
      to: 'rmdm283@gmail.com',
      subject: 'New User Feedback Received',
      text: `Feedback message: ${message}\nFrom: ${email || 'Anonymous'}`,
    });

    res.status(201).json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password before deletion
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // Get user's followers and following before deletion
    const userFollowers = user.followers || [];
    const userFollowing = user.following || [];

    // Remove user from all followers' following lists
    if (userFollowers.length > 0) {
      await User.updateMany(
        { _id: { $in: userFollowers } },
        { $pull: { following: userId } }
      );
    }

    // Remove user from all following users' followers lists
    if (userFollowing.length > 0) {
      await User.updateMany(
        { _id: { $in: userFollowing } },
        { $pull: { followers: userId } }
      );
    }

    // Remove user from liked posts
    if (user.likedPosts && user.likedPosts.length > 0) {
      await Post.updateMany(
        { _id: { $in: user.likedPosts } },
        { $pull: { likes: userId } }
      );
    }

    // Remove user from bookmarked posts
    if (user.bookmarks && user.bookmarks.length > 0) {
      await Post.updateMany(
        { _id: { $in: user.bookmarks } },
        { $pull: { bookmarks: userId } }
      );
    }

    // Delete user's posts
    await Post.deleteMany({ user: userId });

    // Delete user's comments from all posts
    await Post.updateMany(
      {},
      { $pull: { comments: { user: userId } } }
    );

    // Delete user's notifications
    await Notification.deleteMany({
      $or: [
        { to: userId },
        { from: userId }
      ]
    });

    // Delete user's messages
    await Message.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });

    // Delete user's feedback
    await Feedback.deleteMany({ user: userId });

    // Delete user's profile and cover images from cloudinary if they exist
    if (user.profileImg) {
      try {
        const publicId = user.profileImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log("Error deleting profile image:", error.message);
      }
    }

    if (user.coverImg) {
      try {
        const publicId = user.coverImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log("Error deleting cover image:", error.message);
      }
    }

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    // Clear JWT cookie
    res.cookie("jwt", "", { maxAge: 0 });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.log("Error in deleteUserAccount:", error.message);
    res.status(500).json({ error: "Failed to delete account" });
  }
};