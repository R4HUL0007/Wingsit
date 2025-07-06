import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";
import { formatPostDate } from "../../utils/date";
import { FiMoreVertical, FiShare2, FiRepeat, FiMessageCircle, FiTrash2 } from "react-icons/fi";
import html2canvas from "html2canvas";



const Post = ({ post }) => {
	const [comment, setComment] = useState("");
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const [showMenu, setShowMenu] = useState(false);
	const menuRef = useRef(null);
	const navigate = useNavigate();
	const postRef = useRef(null);

	// Defensive: If post, post.user, or authUser is missing, don't render
	if (!post || !post.user || !authUser) {
		return null;
	}

	const postOwner = post.user;
	const isLiked = Array.isArray(post.likes) && authUser?._id ? post.likes.includes(authUser._id) : false;
	const isMyPost = authUser._id === post.user._id;
	const isBookmarked = Array.isArray(authUser.bookmarks) && authUser.bookmarks.includes(post._id);

	const formattedDate = formatPostDate(post.createdAt);
	
	const repostCount = Array.isArray(post.reposts) ? post.reposts.length : 0;
	const hasReposted = Array.isArray(post.reposts) && post.reposts.includes(authUser._id);

	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/${post._id}`, {
					method: "DELETE",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Post deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		
		},
	});

	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/like/${post._id}`, {
					method: "POST",
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: commentPost, isPending: isCommenting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/comment/${post._id}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text: comment }),
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Comment posted successfully");
			setComment("");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Add delete comment mutation
	const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
		mutationFn: async ({ commentId }) => {
			const res = await fetch(`/api/posts/${post._id}/comment/${commentId}`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to delete comment");
			return data;
		},
		onSuccess: () => {
			toast.success("Comment deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Share post as screenshot
	const handleShare = async () => {
		const postUrl = `${window.location.origin}/post/${post._id}`;
		await navigator.clipboard.writeText(postUrl);
		toast.success("Post link copied to clipboard!");
		setShowMenu(false);
	};

	// Repost functionality
	const handleRepost = async () => {
		try {
			const res = await fetch("/api/posts/repost", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: post.text, img: post.img }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to repost");
			toast.success("Reposted!");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			setShowMenu(false);
		} catch (err) {
			toast.error(err.message);
		}
	};

	// DM functionality
	const handleDM = () => {
		navigate("/chat");
		localStorage.setItem("selected_user", JSON.stringify(postOwner));
		setShowMenu(false);
	};

	// Close menu on outside click
	useEffect(() => {
		const handleClick = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setShowMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const handleDeletePost = () => {
		deletePost();
	};

	const handlePostComment = (e) => {
		e.preventDefault();
		if (isCommenting) return;
		commentPost();
	};

	const handleLikePost = () => {
		if (isLiking) return;
		likePost();
	};

	const { mutate: bookmarkPost, isPending: isBookmarking } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/bookmark/${post._id}`, { method: "POST" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			toast.success(isBookmarked ? "Bookmark removed" : "Bookmarked!");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: repostPost, isPending: isReposting } = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/posts/repost", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ repostedFrom: post._id })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to repost");
			return data;
		},
		onSuccess: () => {
			toast.success("Reposted!");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (err) => {
			toast.error(err.message);
		}
	});

	return (
		<>
			<div ref={postRef} className='flex gap-2 items-start p-4 border-b border-gray-700'>
				<div className='avatar'>
					<Link to={`/profile/${postOwner.username}`} className='w-8 rounded-full overflow-hidden'>
						<img src={postOwner.profileImg || "/avatar-placeholder.png"} />
					</Link>
				</div>
				<div className='flex flex-col flex-1'>
					<div className='flex gap-2 items-center'>
						<Link to={`/profile/${postOwner.username}`} className='font-bold'>
							{postOwner.fullName}
						</Link>
						<span className='text-gray-700 flex gap-1 text-sm'>
							<Link to={`/profile/${postOwner.username}`}>@{postOwner.username}</Link>
							<span>·</span>
							<span>{formattedDate}</span>
						</span>
						<span className='flex justify-end flex-1 relative'>
							<FiMoreVertical
								className='w-6 h-6 cursor-pointer hover:text-slate-400'
								onClick={() => setShowMenu((v) => !v)}
							/>
							{showMenu && (
								<div ref={menuRef} className='absolute right-0 top-8 z-20 bg-[#23272a] border border-gray-700 rounded shadow-lg min-w-[160px] text-white'>
									<button className='flex items-center gap-2 w-full px-4 py-2 hover:bg-stone-900' onClick={handleShare}>
										<FiShare2 /> Share
									</button>
									<button className='flex items-center gap-2 w-full px-4 py-2 hover:bg-stone-900' onClick={handleRepost}>
										<FiRepeat /> Repost
									</button>
									<button className='flex items-center gap-2 w-full px-4 py-2 hover:bg-stone-900' onClick={handleDM}>
										<FiMessageCircle /> DM
									</button>
									{isMyPost && (
										<button className='flex items-center gap-2 w-full px-4 py-2 hover:bg-red-600' onClick={handleDeletePost}>
											<FiTrash2 /> Delete
										</button>
									)}
								</div>
							)}
						</span>
					</div>
					<div className='flex flex-col gap-3 overflow-hidden'>
						<span>{post.text}</span>
						{post.img && (
							<img
								src={post.img}
								className='h-80 object-contain rounded-lg border border-gray-700'
								alt=''
							/>
						)}
					</div>
					<div className='flex justify-between mt-3'>
						<div className='flex gap-4 items-center w-2/3 justify-between'>
							<div
								className='flex gap-1 items-center cursor-pointer group'
								onClick={() => document.getElementById("comments_modal" + post._id).showModal()}
							>
								<FaRegComment className='w-4 h-4  text-slate-500 group-hover:text-sky-400' />
								<span className='text-sm text-slate-500 group-hover:text-sky-400'>
									{post.comments.length}
								</span>
							</div>
							{/* We're using Modal Component from DaisyUI */}
							<dialog id={`comments_modal${post._id}`} className='modal border-none outline-none'>
								<div className='modal-box rounded border border-gray-600'>
									<h3 className='font-bold text-lg mb-4'>COMMENTS</h3>
									<div className='flex flex-col gap-3 max-h-60 overflow-auto'>
										{post.comments.length === 0 && (
											<p className='text-sm text-slate-500'>
												No comments yet 🤔 Be the first one 😉
											</p>
										)}
										{post.comments.map((comment) => {
											const canDelete =
												authUser._id === post.user._id ||
												authUser._id === comment.user._id;
											return (
												<div key={comment._id} className='flex gap-2 items-start'>
													<div className='avatar'>
														<div className='w-8 rounded-full'>
															<img
																src={comment.user.profileImg || "/avatar-placeholder.png"}
															/>
														</div>
													</div>
													<div className='flex flex-col'>
														<div className='flex items-center gap-1'>
															<span className='font-bold'>{comment.user.fullName}</span>
															<span className='text-gray-700 text-sm'>@{comment.user.username}</span>
															{canDelete && (
																<button
																	className='ml-2 text-red-500 hover:text-red-700 text-xs flex items-center gap-1'
																	title='Delete comment'
																	disabled={isDeletingComment}
																	onClick={() => deleteComment({ commentId: comment._id })}
																>
																	<FaTrash className='w-3 h-3' />
																	{isDeletingComment ? 'Deleting...' : 'Delete'}
																</button>
															)}
														</div>
														<div className='text-sm'>{comment.text}</div>
													</div>
												</div>
											);
										})}
									</div>
									<form
										className='flex gap-2 items-center mt-4 border-t border-gray-600 pt-2'
										onSubmit={handlePostComment}
									>
										<textarea
											className='textarea w-full p-1 rounded text-md resize-none border focus:outline-none  border-gray-800'
											placeholder='Add a comment...'
											value={comment}
											onChange={(e) => setComment(e.target.value)}
										/>
										<button className='btn btn-primary rounded-full btn-sm text-white px-4'>
											{isCommenting ? <LoadingSpinner size='md' /> : "Post"}
										</button>
									</form>
								</div>
								<form method='dialog' className='modal-backdrop'>
									<button className='outline-none'>close</button>
								</form>
							</dialog>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => !hasReposted && repostPost()} title={hasReposted ? 'Already reposted' : 'Repost'}>
								<BiRepost className={`w-6 h-6 ${hasReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'} ${isReposting ? 'animate-spin' : ''}`} />
								<span className={`text-sm ${hasReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`}>{repostCount}</span>
							</div>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={handleLikePost}>
								{isLiking && <LoadingSpinner size='sm' />}
								{!isLiked && !isLiking && (
									<FaRegHeart className='w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-500' />
								)}
								{isLiked && !isLiking && (
									<FaRegHeart className='w-4 h-4 cursor-pointer text-pink-500 ' />
								)}

								<span
									className={`text-sm  group-hover:text-pink-500 ${
										isLiked ? "text-pink-500" : "text-slate-500"
									}`}
								>
									{post.likes.length}
								</span>
							</div>
						</div>
						<div className='flex w-1/3 justify-end gap-2 items-center'>
							<span onClick={() => bookmarkPost()} title={isBookmarked ? "Remove bookmark" : "Bookmark"}>
								{isBookmarking ? (
									<LoadingSpinner size='sm' />
								) : isBookmarked ? (
									<FaBookmark className='w-4 h-4 text-blue-500 cursor-pointer' />
								) : (
									<FaRegBookmark className='w-4 h-4 text-slate-500 cursor-pointer' />
								)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
export default Post;