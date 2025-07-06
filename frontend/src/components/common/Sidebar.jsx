import XSvg from "../svgs/X";

import { MdHomeFilled } from "react-icons/md";
import { IoNotifications } from "react-icons/io5";
import { FaUser, FaComments, FaBookmark, FaBook, FaRegCommentDots } from "react-icons/fa";
import { Link } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useEffect, useState, useRef } from 'react';
import socketIOClient from "socket.io-client";
import NotificationSound from "./NotificationSound";

const Sidebar = () => {
	const queryClient = useQueryClient();
	const { playNotificationSound } = NotificationSound();

	const { mutate:logout } = useMutation({
		mutationFn: async() => {
			try{
				const res = await fetch("/api/auth/logout", {
					method: "POST",
				});
				const authUser = await res.json();

				if(!res.ok) {
					throw new Error (authUser.error || "Something went wrong");
				}
			}catch(error){
				throw new Error(error);
			}
		},
		onSuccess : () => {
			queryClient.invalidateQueries({ queryKey : ["authUser"] })
		},
		onError : () => {
			toast.error("Logout Failed");
		}
	});

	const { data:authUser } = useQuery({ queryKey : ["authUser"] });

	// React Query for unread DM count
	const { data: unreadDMData } = useQuery({
		queryKey: ["unreadDMCount"],
		queryFn: async () => {
			const res = await fetch('/api/users/messages/unread', { credentials: 'include' });
			const data = await res.json();
			if (data && typeof data === 'object' && !Array.isArray(data)) {
				return Object.values(data).reduce((sum, n) => sum + n, 0);
			}
			return 0;
		},
		refetchInterval: 10000, // Refetch every 10 seconds
	});

	// React Query for unread notification count
	const { data: unreadNotificationCount = 0 } = useQuery({
		queryKey: ["unreadNotificationCount"],
		queryFn: async () => {
			const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
			const data = await res.json();
			return data.count || 0;
		},
		refetchInterval: 10000, // Refetch every 10 seconds
	});

	// Socket connection for real-time updates
	useEffect(() => {
		if (!authUser?._id) return;

		const socket = socketIOClient();

		// Join user's personal room
		socket.emit("join-user", authUser._id);

		// Listen for new notifications and update count immediately
		socket.on("newNotification", (notification) => {
			console.log("New notification received in sidebar:", notification);
			// Immediately increment the notification count
			queryClient.setQueryData(["unreadNotificationCount"], (old) => (old || 0) + 1);
			
			// Play notification sound
			playNotificationSound();
			
			// Show toast notification
			const message = notification.type === "follow" 
				? `${notification.from.username} followed you`
				: notification.type === "like" 
				? `${notification.from.username} liked your post`
				: `${notification.from.username} sent you a message`;
			
			toast.success(message, {
				duration: 4000,
				icon: notification.type === "follow" ? "👤" : notification.type === "like" ? "❤️" : "💬",
			});
		});

		// Listen for new messages and update DM count immediately
		socket.on("newMessage", (message) => {
			console.log("New message received in sidebar:", message);
			// Only increment if the message is for the current user
			if (message.receiver === authUser._id) {
				queryClient.setQueryData(["unreadDMCount"], (old) => (old || 0) + 1);
				
				// Play notification sound for messages too
				playNotificationSound();
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [authUser?._id, queryClient, playNotificationSound]);

	console.log('Sidebar unreadDMData:', unreadDMData);

	return (
		<div className='md:flex-[2_2_0] w-18 max-w-52'>
			<div className='sticky top-0 left-0 h-screen flex flex-col border-r border-gray-700 w-20 md:w-full'>
				<Link to='/' className='flex justify-center md:justify-start'>
					<XSvg className='w-14 h-14 px-2 rounded-full fill-white hover:bg-stone-900' />
				</Link>
				<ul className='flex flex-col gap-3 mt-4'>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/'
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<MdHomeFilled className='w-8 h-8' />
							<span className='text-lg hidden md:block'>Home</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<div className="relative">
							<Link
								to='/notifications'
								className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
							>
								<IoNotifications className='w-6 h-6' />
								<span className='text-lg hidden md:block'>Notifications</span>
								{unreadNotificationCount > 0 && (
									<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold shadow">
										{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
									</span>
								)}
							</Link>
						</div>
					</li>
					<li className='flex justify-center md:justify-start'>
						<div className="relative">
							<Link
								to='/chat'
								className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
							>
								<FaComments className='w-6 h-6' />
								<span className='text-lg hidden md:block'>Messages</span>
								{unreadDMData > 0 && (
									<span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold shadow z-10">
										{unreadDMData > 9 ? '9+' : unreadDMData}
									</span>
								)}
							</Link>
						</div>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/bookmarks'
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<FaBookmark className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Bookmarks</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/feedback'
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<FaRegCommentDots className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Feedback</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/readme'
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<FaBook className='w-6 h-6' />
							<span className='text-lg hidden md:block'>README</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to={`/profile/${authUser?.username}`}
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<FaUser className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Profile</span>
						</Link>
					</li>
				</ul>

				{/* Profile/Logout button restored like Twitter */}
				{authUser && (
					<Link
						to={`/profile/${authUser.username}`}
						className='mt-auto mb-10 flex gap-2 items-center transition-all duration-300 hover:bg-[#181818] py-2 px-4 rounded-full'
					>
						<div className='avatar hidden md:inline-flex'>
							<div className='w-8 rounded-full'>
								<img src={authUser?.profileImg || "/avatar-placeholder.png"} alt={authUser?.username} />
							</div>
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-white font-bold text-sm truncate'>{authUser?.fullname}</p>
							<p className='text-slate-500 text-sm truncate'>@{authUser?.username}</p>
						</div>
						<BiLogOut
							className='w-5 h-5 cursor-pointer flex-shrink-0'
							onClick={e => {
								e.preventDefault();
								logout();
							}}
						/>
					</Link>
				)}
			</div>
		</div>
	);
};
export default Sidebar;