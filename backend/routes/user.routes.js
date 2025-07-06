import expres from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {getSuggestedUsers, followUnfollowUser, getUserProfile, updateUser, sendMessage, getMessages, getFollowingUsers, deleteMessage, editMessage, getDMPartners, getUnreadDMs, markDMsAsRead, sendImageMessage, clearChatHistory, getLastMessageTime, addReaction, pinMessage, getPinnedMessages, getUserProfileById, submitFeedback, deleteUserAccount } from "../controllers/user.controller.js";
import multer from 'multer';

const router = expres.Router()

const upload = multer({ dest: 'uploads/' });

router.get("/profile/:username",protectRoute,getUserProfile);
router.get("/suggested",protectRoute,getSuggestedUsers);
router.post("/follow/:id",protectRoute,followUnfollowUser);
router.put("/update",protectRoute,updateUser);
router.post("/send-message", protectRoute, sendMessage);
router.get("/messages/:userId", protectRoute, getMessages);
router.get("/following-users", protectRoute, getFollowingUsers);
router.delete("/messages/:messageId", protectRoute, deleteMessage);
router.put("/messages/:messageId", protectRoute, editMessage);
router.get("/messages/partners", protectRoute, getDMPartners);
router.get("/messages/unread", protectRoute, getUnreadDMs);
router.post("/messages/:userId/read", protectRoute, markDMsAsRead);
router.post("/messages/send-image", protectRoute, upload.single('image'), sendImageMessage);
router.post("/messages/:userId/clear", protectRoute, clearChatHistory);
router.get("/messages/:userId/last-message", protectRoute, getLastMessageTime);
router.post("/messages/:messageId/reaction", protectRoute, addReaction);
router.post("/messages/:messageId/pin", protectRoute, pinMessage);
router.get("/messages/:userId/pinned", protectRoute, getPinnedMessages);
router.get('/profile-id/:id', protectRoute, getUserProfileById);
router.post('/feedback', submitFeedback);
router.delete('/account', protectRoute, deleteUserAccount);

export default router;