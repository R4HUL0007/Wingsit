import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { deleteNotifications, getNotifications, getUnreadNotificationCount, getUnreadNotificationCountForUser, markNotificationsAsReadForUser } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.delete("/", protectRoute, deleteNotifications);
router.get('/unread-count', protectRoute, getUnreadNotificationCount);
router.get('/unread-count/:userId', protectRoute, getUnreadNotificationCountForUser);
router.post('/mark-read/:userId', protectRoute, markNotificationsAsReadForUser);

export default router;