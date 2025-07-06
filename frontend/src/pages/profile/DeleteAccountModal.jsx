import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { MdWarning } from "react-icons/md";

const DeleteAccountModal = ({ isOpen, onClose }) => {
	const [password, setPassword] = useState("");
	const [isConfirming, setIsConfirming] = useState(false);
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { mutate: deleteAccount, isPending } = useMutation({
		mutationFn: async (password) => {
			const res = await fetch("/api/users/account", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ password }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to delete account");
			return data;
		},
		onSuccess: () => {
			toast.success("Account deleted successfully");
			queryClient.clear(); // Clear all cached data
			navigate("/signup");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleDeleteAccount = (e) => {
		e.preventDefault();
		if (!password.trim()) {
			toast.error("Please enter your password");
			return;
		}
		deleteAccount(password);
	};

	const handleConfirmDelete = () => {
		setIsConfirming(true);
	};

	const handleCancel = () => {
		setIsConfirming(false);
		setPassword("");
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
			<div className="bg-[#181818] rounded-lg p-6 w-full max-w-md">
				{!isConfirming ? (
					<>
						<div className="flex items-center gap-3 mb-4">
							<MdWarning className="text-red-500 text-2xl" />
							<h2 className="text-xl font-bold text-white">Delete Account</h2>
						</div>
						<p className="text-gray-300 mb-6">
							Are you sure you want to delete your account? This action cannot be undone and will permanently remove:
						</p>
						<ul className="text-gray-400 text-sm mb-6 space-y-2">
							<li>• All your posts and comments</li>
							<li>• Your profile and messages</li>
							<li>• All your data and settings</li>
							<li>• Your followers and following relationships</li>
						</ul>
						<div className="flex gap-3">
							<button
								onClick={handleConfirmDelete}
								className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
							>
								Delete Account
							</button>
							<button
								onClick={handleCancel}
								className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
							>
								Cancel
							</button>
						</div>
					</>
				) : (
					<>
						<div className="flex items-center gap-3 mb-4">
							<MdWarning className="text-red-500 text-2xl" />
							<h2 className="text-xl font-bold text-white">Confirm Deletion</h2>
						</div>
						<p className="text-gray-300 mb-4">
							Please enter your password to confirm account deletion:
						</p>
						<form onSubmit={handleDeleteAccount}>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
								className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
								required
							/>
							<div className="flex gap-3">
								<button
									type="submit"
									disabled={isPending}
									className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold rounded-lg transition-colors"
								>
									{isPending ? "Deleting..." : "Confirm Delete"}
								</button>
								<button
									type="button"
									onClick={handleCancel}
									disabled={isPending}
									className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-bold rounded-lg transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					</>
				)}
			</div>
		</div>
	);
};

export default DeleteAccountModal; 