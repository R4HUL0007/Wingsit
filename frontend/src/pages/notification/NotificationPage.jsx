import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { IoSettingsOutline } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";
import { FaComments } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import socketIOClient from "socket.io-client";

const NotificationPage = () => {
	const [notifications, setNotifications] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const queryClient = useQueryClient();

	// Fetch notifications
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const fetchNotifications = async () => {
		try {
			const res = await fetch("/api/notifications");
			const data = await res.json();
			if (res.ok) {
				setNotifications(data);
			} else {
				toast.error(data.message || "Failed to fetch notifications");
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
			toast.error("Failed to fetch notifications");
		} finally {
			setIsLoading(false);
		}
	};

	// Delete notifications mutation
	const { mutate: deleteNotifications } = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/notifications", {
				method: "DELETE",
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to delete notifications");
			}
			return data;
		},
		onSuccess: () => {
			setNotifications([]);
			toast.success("All notifications deleted");
			// Invalidate notification count queries
			queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Socket connection for real-time notifications
	useEffect(() => {
		if (!authUser?._id) return;

		const socket = socketIOClient();

		// Join user's personal room
		socket.emit("join-user", authUser._id);

		// Listen for new notifications
		socket.on("newNotification", (notification) => {
			console.log("New notification received:", notification);
			setNotifications(prev => [notification, ...prev]);
			// Invalidate notification count queries
			queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
		});

		return () => {
			socket.disconnect();
		};
	}, [authUser?._id, queryClient]);

	// Fetch notifications on mount
	useEffect(() => {
		fetchNotifications();
	}, []);

	const handleDeleteNotifications = () => {
		if (notifications.length === 0) {
			toast.error("No notifications to delete");
			return;
		}
		deleteNotifications();
	};

	return (
		<>
			<div className='flex-[4_4_0] border-l border-r border-gray-700 min-h-screen'>
				<div className='flex justify-between items-center p-4 border-b border-gray-700'>
					<p className='font-bold'>Notifications</p>
					<div className='dropdown '>
						<div tabIndex={0} role='button' className='m-1'>
							<IoSettingsOutline className='w-4' />
						</div>
						<ul
							tabIndex={0}
							className='dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52'
						>
							<li>
								<a onClick={handleDeleteNotifications}>Delete all notifications</a>
							</li>
						</ul>
					</div>
				</div>
				{isLoading && (
					<div className='flex justify-center h-full items-center'>
						<LoadingSpinner size='lg' />
					</div>
				)}
				{!isLoading && notifications?.length === 0 && (
					<div className='text-center p-4 font-bold'>No notifications 🤔</div>
				)}
				{notifications
					?.slice()
					.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
					.map((notification) => (
						<div className='border-b border-gray-700' key={notification._id}>
							<div className='flex gap-2 p-4'>
								{notification.type === "follow" && <FaUser className='w-7 h-7 text-primary' />}
								{notification.type === "like" && <FaHeart className='w-7 h-7 text-red-500' />}
								{notification.type === "message" && <FaComments className='w-7 h-7 text-blue-500' />}
								<Link to={`/profile/${notification.from.username}`}>
									<div className='avatar'>
										<div className='w-8 rounded-full'>
											<img src={notification.from.profileImg || "/avatar-placeholder.png"} alt={notification.from.username} />
										</div>
									</div>
									<div className='flex gap-1'>
										<span className='font-bold'>@{notification.from.username}</span>{" "}
										{notification.type === "follow" ? "followed you" : 
										 notification.type === "like" ? "liked your post" : 
										 "sent you a message"}
									</div>
								</Link>
							</div>
						</div>
					))}
			</div>
		</>
	);
};
export default NotificationPage;