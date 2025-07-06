import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

import Posts from "../../components/common/Posts";
import ProfileHeaderSkeleton from "../../components/skeletons/ProfileHeaderSkeleton";
import EditProfileModal from "./EditProfileModal";
import DeleteAccountModal from "./DeleteAccountModal";

import { POSTS } from "../../utils/db/dummy";

import { FaArrowLeft } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5";
import { FaLink } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import useFollow from "../../hooks/useFollow";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

const ProfilePage = () => {
	const { username } = useParams();
	const [feedType, setFeedType] = useState("posts");

	const { data: user, isLoading } = useQuery({
		queryKey: ["profile", username],
		queryFn: async () => {
			const res = await fetch(`/api/users/profile/${username}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!username,
	});

	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const { follow, isPending: isFollowPending } = useFollow();

	const isMyProfile = authUser?._id === user?._id;
	const isFollowing = authUser && user && Array.isArray(authUser.following) && authUser.following.includes(user._id);

	const [coverImg, setCoverImg] = useState(null);
	const [profileImg, setProfileImg] = useState(null);
	const coverImgRef = useRef(null);
	const profileImgRef = useRef(null);

	const [showFollowers, setShowFollowers] = useState(false);
	const [showFollowing, setShowFollowing] = useState(false);
	const [followersList, setFollowersList] = useState([]);
	const [followingList, setFollowingList] = useState([]);

	const [isUploading, setIsUploading] = useState(false);

	const [pendingImg, setPendingImg] = useState(null);
	const [pendingType, setPendingType] = useState(null);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	useEffect(() => {
		if (showFollowers && user?.followers?.length) {
			Promise.all(user.followers.map(id => fetch(`/api/users/profile-id/${id}`).then(res => res.json()))).then(setFollowersList);
		}
	}, [showFollowers, user]);

	useEffect(() => {
		if (showFollowing && user?.following?.length) {
			Promise.all(user.following.map(id => fetch(`/api/users/profile-id/${id}`).then(res => res.json()))).then(setFollowingList);
		}
	}, [showFollowing, user]);

	const updateImage = async (imgType, imgData) => {
		setIsUploading(true);
		try {
			const res = await fetch('/api/users/update', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [imgType]: imgData })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to update image');
			toast.success('Image updated!');
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			queryClient.invalidateQueries({ queryKey: ["profile", username] });
			if (imgType === 'coverImg') setCoverImg(imgData);
			if (imgType === 'profileImg') setProfileImg(imgData);
		} catch (err) {
			toast.error(err.message);
		} finally {
			setIsUploading(false);
		}
	};

	const handleImgChange = (e, state) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				setPendingImg(reader.result);
				setPendingType(state);
				setShowConfirmModal(true);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleConfirmImage = () => {
		setShowConfirmModal(false);
		if (pendingType === "coverImg") setCoverImg(pendingImg);
		if (pendingType === "profileImg") setProfileImg(pendingImg);
		updateImage(pendingType, pendingImg);
		setPendingImg(null);
		setPendingType(null);
	};

	const handleCancelImage = () => {
		setShowConfirmModal(false);
		setPendingImg(null);
		setPendingType(null);
	};

	return (
		<div className='flex-[4_4_0] border-r border-gray-700 min-h-screen'>
			{isLoading && <ProfileHeaderSkeleton />}
			{!isLoading && !user && <p className='text-center text-lg mt-4'>User not found</p>}
			{!isLoading && user && (
				<>
					<div className='flex gap-10 px-4 py-2 items-center md:flex-row flex-col md:items-center items-start'>
						<Link to='/'>
							<FaArrowLeft className='w-4 h-4' />
						</Link>
						<div className='flex flex-col'>
							<p className='font-bold text-lg'>{user.fullname}</p>
							<span className='text-sm text-slate-500'>{user.posts?.length || 0} posts</span>
						</div>
					</div>
					<div className='relative group/cover'>
						<img
							src={coverImg || user.coverImg || "/cover.png"}
							className='h-40 md:h-52 w-full object-cover'
							alt='cover image'
						/>
						{isMyProfile && (
							<div
								className='absolute top-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer opacity-0 group-hover/cover:opacity-100 transition duration-200'
								onClick={() => coverImgRef.current.click()}
							>
								{isUploading ? <span className='loader w-5 h-5' /> : <MdEdit className='w-5 h-5 text-white' />}
							</div>
						)}
						<input
							type='file'
							hidden
							accept='image/*'
							ref={coverImgRef}
							onChange={(e) => handleImgChange(e, "coverImg")}
						/>
						<input
							type='file'
							hidden
							accept='image/*'
							ref={profileImgRef}
							onChange={(e) => handleImgChange(e, "profileImg")}
						/>
						<div className='avatar absolute -bottom-16 left-1/2 md:left-4 transform -translate-x-1/2 md:translate-x-0'>
							<div className='w-24 md:w-32 rounded-full relative group/avatar'>
								<img src={profileImg || user.profileImg || "/avatar-placeholder.png"} />
								{isMyProfile && (
									<div className='absolute top-5 right-3 p-1 bg-primary rounded-full group-hover/avatar:opacity-100 opacity-0 cursor-pointer'>
										{isUploading ? <span className='loader w-4 h-4' /> : <MdEdit className='w-4 h-4 text-white' onClick={() => profileImgRef.current.click()} />}
									</div>
								)}
							</div>
						</div>
					</div>
					<div className='flex flex-col md:flex-row justify-end px-4 mt-20 md:mt-5 gap-2'>
						{isMyProfile && (
							<>
								<EditProfileModal />
								<button
									onClick={() => setShowDeleteModal(true)}
									className='rounded-full px-4 py-2 font-bold border border-red-500 text-red-500 bg-black hover:bg-red-500 hover:text-white transition duration-200 flex items-center gap-2 md:w-auto w-full justify-center'
								>
									Delete Account
								</button>
							</>
						)}
						{!isMyProfile && user && authUser && (
							<>
								<button
									className={`rounded-full px-6 py-2 font-bold border transition duration-200 flex items-center gap-2 md:w-auto w-full justify-center ${isFollowing ? 'bg-black text-white border-gray-700 hover:bg-gray-900' : 'bg-white text-black border-primary hover:bg-blue-100'}`}
									disabled={isFollowPending}
									onClick={() => follow(user._id)}
								>
									{isFollowing ? 'Unfollow' : 'Follow'}
								</button>
								<Link
									to={`/chat?user=${user._id}`}
									className='rounded-full px-4 py-2 font-bold border border-primary text-primary bg-black hover:bg-gray-900 transition duration-200 flex items-center gap-2 md:w-auto w-full justify-center'
								>
									Message
								</Link>
							</>
						)}
					</div>
					<div className='flex flex-col gap-4 mt-14 px-4'>
						<div className='flex flex-col'>
							<span className='font-bold text-lg'>{user.fullname}</span>
							<span className='text-sm text-slate-500'>@{user.username}</span>
							<span className='text-sm my-1'>{user.bio}</span>
						</div>
						<div className='flex gap-2 flex-wrap'>
							{user.link && (
								<div className='flex gap-1 items-center '>
									<FaLink className='w-3 h-3 text-slate-500' />
									<a
										href={user.link}
										target='_blank'
										rel='noreferrer'
										className='text-sm text-blue-500 hover:underline'
									>
										{user.link}
									</a>
								</div>
							)}
							<div className='flex gap-2 items-center'>
								<IoCalendarOutline className='w-4 h-4 text-slate-500' />
								<span className='text-sm text-slate-500'>Joined {user.createdAt ? new Date(user.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' }) : ''}</span>
							</div>
						</div>
						<div className='flex gap-2'>
							<div className='flex gap-1 items-center cursor-pointer hover:underline' onClick={() => setShowFollowing(true)}>
								<span className='font-bold text-xs'>{user.following?.length || 0}</span>
								<span className='text-slate-500 text-xs'>Following</span>
							</div>
							<div className='flex gap-1 items-center cursor-pointer hover:underline' onClick={() => setShowFollowers(true)}>
								<span className='font-bold text-xs'>{user.followers?.length || 0}</span>
								<span className='text-slate-500 text-xs'>Followers</span>
							</div>
						</div>
					</div>
					<div className='flex w-full border-b border-gray-700 mt-4'>
						<div
							className={`flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer ${feedType === "posts" ? "font-bold" : ""}`}
							onClick={() => setFeedType("posts")}
						>
							Posts
							{feedType === "posts" && (
								<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
							)}
						</div>
						<div
							className={`flex justify-center flex-1 p-3 text-slate-500 hover:bg-secondary transition duration-300 relative cursor-pointer ${feedType === "likes" ? "font-bold" : ""}`}
							onClick={() => setFeedType("likes")}
						>
							Likes
							{feedType === "likes" && (
								<div className='absolute bottom-0 w-10  h-1 rounded-full bg-primary' />
							)}
						</div>
					</div>
					<Posts feedType={feedType} username={username} userId={feedType === 'likes' ? user._id : undefined} />
				</>
			)}
			{/* Followers Modal */}
			{showFollowers && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 md:p-0 p-2">
					<div className="bg-[#181818] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto relative md:mt-0 mt-8 md:rounded-lg rounded-2xl md:max-w-md max-w-full">
						<h2 className="text-xl font-bold mb-4">Followers</h2>
						<button className="absolute top-4 right-6 text-white text-2xl" onClick={() => setShowFollowers(false)}>&times;</button>
						{followersList.length === 0 ? (
							<p className="text-slate-400">No followers yet.</p>
						) : (
							<ul className="flex flex-col gap-3">
								{followersList.map(u => (
									<li key={u._id} className="flex items-center gap-3 py-2">
										<img src={u.profileImg || "/avatar-placeholder.png"} className="w-10 h-10 rounded-full" alt={u.username} />
										<div>
											<Link to={`/profile/${u.username}`} className="font-bold hover:underline text-base">{u.fullname}</Link>
											<div className="text-slate-500 text-xs">@{u.username}</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}
			{/* Following Modal */}
			{showFollowing && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 md:p-0 p-2">
					<div className="bg-[#181818] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto relative md:mt-0 mt-8 md:rounded-lg rounded-2xl md:max-w-md max-w-full">
						<h2 className="text-xl font-bold mb-4">Following</h2>
						<button className="absolute top-4 right-6 text-white text-2xl" onClick={() => setShowFollowing(false)}>&times;</button>
						{followingList.length === 0 ? (
							<p className="text-slate-400">Not following anyone yet.</p>
						) : (
							<ul className="flex flex-col gap-3">
								{followingList.map(u => (
									<li key={u._id} className="flex items-center gap-3 py-2">
										<img src={u.profileImg || "/avatar-placeholder.png"} className="w-10 h-10 rounded-full" alt={u.username} />
										<div>
											<Link to={`/profile/${u.username}`} className="font-bold hover:underline text-base">{u.fullname}</Link>
											<div className="text-slate-500 text-xs">@{u.username}</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}
			{showConfirmModal && (
				<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
					<div className="bg-[#181818] rounded-lg p-6 w-full max-w-xs flex flex-col items-center">
						<h2 className="text-lg font-bold mb-2">Confirm {pendingType === 'coverImg' ? 'Cover' : 'Profile'} Image</h2>
						<img src={pendingImg} alt="Preview" className="rounded-lg mb-4 w-full object-cover max-h-40" />
						<div className="flex gap-4 w-full">
							<button className="flex-1 py-2 rounded bg-blue-600 text-white font-bold" onClick={handleConfirmImage} disabled={isUploading}>
								{isUploading ? <span className='loader w-4 h-4 mx-auto' /> : 'Confirm'}
							</button>
							<button className="flex-1 py-2 rounded bg-gray-700 text-white font-bold" onClick={handleCancelImage} disabled={isUploading}>Cancel</button>
						</div>
					</div>
				</div>
			)}
			<DeleteAccountModal 
				isOpen={showDeleteModal} 
				onClose={() => setShowDeleteModal(false)} 
			/>
		</div>
	);
};
export default ProfilePage;