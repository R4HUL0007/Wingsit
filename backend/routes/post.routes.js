import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	commentOnPost,
	createPost,
	deletePost,
	getAllPosts,
	getFollowingPosts,
	getLikedPosts,
	getUserPosts,
	likeUnlikePost,
	repostPost,
	deleteCommentOnPost,
	bookmarkPost,
	getBookmarks,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.post("/create", protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.post("/repost", protectRoute, repostPost);
router.delete("/:id", protectRoute, deletePost);
router.delete("/:postId/comment/:commentId", protectRoute, deleteCommentOnPost);
router.post("/bookmark/:id", protectRoute, bookmarkPost);
router.get("/bookmarks", protectRoute, getBookmarks);

export default router;