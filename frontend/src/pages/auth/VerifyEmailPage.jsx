import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import XSvg from "../../components/svgs/X";

const VerifyEmailPage = () => {
	const { token } = useParams();
	const navigate = useNavigate();
	const [verificationStatus, setVerificationStatus] = useState("verifying");

	const { mutate: verifyEmail, isPending } = useMutation({
		mutationFn: async (token) => {
			const res = await fetch(`/api/auth/verify-email/${token}`, {
				method: "GET",
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Verification failed");
			return data;
		},
		onSuccess: () => {
			setVerificationStatus("success");
			toast.success("Email verified successfully! You can now log in.");
		},
		onError: (error) => {
			setVerificationStatus("error");
			toast.error(error.message);
		},
	});

	const { mutate: resendVerification, isPending: isResending } = useMutation({
		mutationFn: async (email) => {
			const res = await fetch("/api/auth/resend-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to resend verification email");
			return data;
		},
		onSuccess: () => {
			toast.success("Verification email sent successfully!");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (token) {
			verifyEmail(token);
		}
	}, [token, verifyEmail]);

	const handleResendVerification = (e) => {
		e.preventDefault();
		const email = e.target.email.value;
		if (email) {
			resendVerification(email);
		}
	};

	return (
		<div className='max-w-screen-xl mx-auto flex h-screen px-10'>
			<div className='flex-1 hidden lg:flex items-center justify-center'>
				<XSvg className='w-40 h-40' />
			</div>
			<div className='flex-1 flex flex-col justify-center items-center'>
				<div className='lg:w-2/3 mx-auto md:mx-20 flex gap-4 flex-col'>
					<XSvg className='w-24 h-24 lg:hidden' />
					
					{verificationStatus === "verifying" && (
						<div className='text-center'>
							<h1 className='text-4xl font-extrabold text-white mb-4'>Verifying Email...</h1>
							<div className='loading loading-spinner loading-lg'></div>
							<p className='text-gray-300 mt-4'>Please wait while we verify your email address.</p>
						</div>
					)}

					{verificationStatus === "success" && (
						<div className='text-center'>
							<div className='text-green-500 text-6xl mb-4'>✓</div>
							<h1 className='text-4xl font-extrabold text-white mb-4'>Email Verified!</h1>
							<p className='text-gray-300 mb-6'>Your email has been successfully verified. You can now log in to your account.</p>
							<Link to='/login'>
								<button className='btn rounded-full btn-primary text-white'>
									Continue to Login
								</button>
							</Link>
						</div>
					)}

					{verificationStatus === "error" && (
						<div className='text-center'>
							<div className='text-red-500 text-6xl mb-4'>✗</div>
							<h1 className='text-4xl font-extrabold text-white mb-4'>Verification Failed</h1>
							<p className='text-gray-300 mb-6'>
								The verification link is invalid or has expired. You can request a new verification email.
							</p>
							
							<form onSubmit={handleResendVerification} className='mb-6'>
								<label className='input input-bordered rounded flex items-center gap-2 mb-4'>
									<input
										type='email'
										className='grow'
										placeholder='Enter your email address'
										name='email'
										required
									/>
								</label>
								<button 
									type='submit' 
									className='btn rounded-full btn-primary text-white mb-4'
									disabled={isResending}
								>
									{isResending ? "Sending..." : "Resend Verification Email"}
								</button>
							</form>

							<Link to='/login'>
								<button className='btn rounded-full btn-outline text-white'>
									Back to Login
								</button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default VerifyEmailPage; 