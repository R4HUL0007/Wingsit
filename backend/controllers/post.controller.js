import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import { io } from "../server.js";

export const createPost = async (req, res) => {
	try {
		const { text } = req.body;
		let { img } = req.body;
		const userId = req.user._id.toString();

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		if (!text && !img) {
			return res.status(400).json({ error: "Post must have text or image" });
		}

		if (img) {
			const uploadedResponse = await cloudinary.uploader.upload(img);
			img = uploadedResponse.secure_url;
		}

		const newPost = new Post({
			user: userId,
			text,
			img,
		});

		await newPost.save();
		res.status(201).json(newPost);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
		console.log("Error in createPost controller: ", error);
	}
};

export const deletePost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		if (post.user.toString() !== req.user._id.toString()) {
			return res.status(401).json({ error: "You are not authorized to delete this post" });
		}

		if (post.img) {
			const imgId = post.img.split("/").pop().split(".")[0];
			await cloudinary.uploader.destroy(imgId);
		}

		await Post.findByIdAndDelete(req.params.id);

		res.status(200).json({ message: "Post deleted successfully" });
	} catch (error) {
		console.log("Error in deletePost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const commentOnPost = async (req, res) => {
	try {
		const { text } = req.body;
		const postId = req.params.id;
		const userId = req.user._id;

		if (!text) {
			return res.status(400).json({ error: "Text field is required" });
		}
		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const comment = { user: userId, text };

		post.comments.push(comment);
		await post.save();

		res.status(200).json(post);
	} catch (error) {
		console.log("Error in commentOnPost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const likeUnlikePost = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id: postId } = req.params;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const userLikedPost = post.likes.includes(userId);

		if (userLikedPost) {
			// Unlike post
			await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
			await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

			const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
			res.status(200).json(updatedLikes);
		} else {
			// Like post
			post.likes.push(userId);
			await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
			await post.save();

			const notification = new Notification({
				from: userId,
				to: post.user,
				type: "like",
			});
			await notification.save();

			// Emit real-time notification to the post owner
			io.to(`user-${post.user}`).emit("newNotification", {
				type: "like",
				from: {
					_id: userId,
					username: req.user.username,
					profileImg: req.user.profileImg
				},
				to: post.user,
				notificationId: notification._id
			});

			const updatedLikes = post.likes;
			res.status(200).json(updatedLikes);
		}
	} catch (error) {
		console.log("Error in likeUnlikePost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getAllPosts = async (req, res) => {
	try {
		//populate is used to info about use
		const posts = await Post.find()
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		if (posts.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(posts);
	} catch (error) {
		console.log("Error in getAllPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getLikedPosts = async (req, res) => {
	const userId = req.params.id;

	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(likedPosts);
	} catch (error) {
		console.log("Error in getLikedPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getFollowingPosts = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const following = user.following;

		const feedPosts = await Post.find({ user: { $in: following } })
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(feedPosts);
	} catch (error) {
		console.log("Error in getFollowingPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getUserPosts = async (req, res) => {
	try {
		const { username } = req.params;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ error: "User not found" });

		const posts = await Post.find({ user: user._id })
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(posts);
	} catch (error) {
		console.log("Error in getUserPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const repostPost = async (req, res) => {
	try {
		const { text, img } = req.body;
		const userId = req.user._id;
		const originalPostId = req.body.repostedFrom || null;
		let newPost;
		if (originalPostId) {
			// Repost with reference
			const originalPost = await Post.findById(originalPostId);
			if (!originalPost) return res.status(404).json({ error: 'Original post not found' });
			// Prevent duplicate reposts
			if (originalPost.reposts.includes(userId)) {
				return res.status(400).json({ error: 'You have already reposted this post' });
			}
			originalPost.reposts.push(userId);
			await originalPost.save();
			newPost = await Post.create({
				user: userId,
				text: text || originalPost.text,
				img: img || originalPost.img,
				repostedFrom: originalPost._id,
			});
		} else {
			// Normal repost (legacy)
			newPost = await Post.create({
				user: userId,
				text,
				img,
			});
		}
		res.status(201).json(newPost);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const deleteCommentOnPost = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const userId = req.user._id;
		const post = await Post.findById(postId);
		if (!post) return res.status(404).json({ error: "Post not found" });

		// Find the comment
		const comment = post.comments.id(commentId);
		if (!comment) return res.status(404).json({ error: "Comment not found" });

		// Check permissions: post owner or comment author
		if (
			post.user.toString() !== userId.toString() &&
			comment.user.toString() !== userId.toString()
		) {
			return res.status(403).json({ error: "You are not authorized to delete this comment" });
		}

		// Remove the comment using pull
		post.comments.pull(commentId);
		await post.save();
		res.status(200).json({ message: "Comment deleted successfully" });
	} catch (error) {
		console.log("Error in deleteCommentOnPost controller:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const bookmarkPost = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id: postId } = req.params;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		const alreadyBookmarked = user.bookmarks.includes(postId);
		if (alreadyBookmarked) {
			// Remove bookmark
			user.bookmarks.pull(postId);
			await user.save();
			return res.status(200).json({ message: "Bookmark removed" });
		} else {
			// Add bookmark
			user.bookmarks.push(postId);
			await user.save();
			return res.status(200).json({ message: "Bookmarked" });
		}
	} catch (error) {
		console.log("Error in bookmarkPost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getBookmarks = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		const posts = await Post.find({ _id: { $in: user.bookmarks } })
			.populate({ path: "user", select: "-password" })
			.populate({ path: "comments.user", select: "-password" });
		res.status(200).json(posts);
	} catch (error) {
		console.log("Error in getBookmarks controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};