import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import XSvg from "../../components/svgs/X";

const OTPVerificationPage = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [email, setEmail] = useState("");
	const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

	useEffect(() => {
		// Get email from location state or localStorage
		const userEmail = location.state?.email || localStorage.getItem("pendingVerificationEmail");
		if (userEmail) {
			setEmail(userEmail);
			localStorage.setItem("pendingVerificationEmail", userEmail);
		} else {
			// If no email, redirect to signup
			navigate("/signup");
		}
	}, [location.state, navigate]);

	useEffect(() => {
		if (timeLeft > 0) {
			const timer = setInterval(() => {
				setTimeLeft(prev => prev - 1);
			}, 1000);
			return () => clearInterval(timer);
		}
	}, [timeLeft]);

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const handleOtpChange = (index, value) => {
		if (value.length > 1) return; // Only allow single digit
		
		const newOtp = [...otp];
		newOtp[index] = value;
		setOtp(newOtp);

		// Auto-focus next input
		if (value && index < 5) {
			const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
			if (nextInput) nextInput.focus();
		}
	};

	const handleKeyDown = (index, e) => {
		if (e.key === "Backspace" && !otp[index] && index > 0) {
			const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
			if (prevInput) prevInput.focus();
		}
	};

	const { mutate: verifyOTP, isPending } = useMutation({
		mutationFn: async ({ email, otp }) => {
			const res = await fetch("/api/auth/verify-otp", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, otp }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Verification failed");
			return data;
		},
		onSuccess: () => {
			toast.success("Email verified successfully! You can now log in.");
			localStorage.removeItem("pendingVerificationEmail");
			navigate("/login");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: resendOTP, isPending: isResending } = useMutation({
		mutationFn: async (email) => {
			const res = await fetch("/api/auth/resend-otp", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to resend OTP");
			return data;
		},
		onSuccess: () => {
			toast.success("OTP sent successfully!");
			setTimeLeft(600); // Reset timer
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		const otpString = otp.join("");
		if (otpString.length !== 6) {
			toast.error("Please enter the complete 6-digit OTP");
			return;
		}
		verifyOTP({ email, otp: otpString });
	};

	const handleResendOTP = () => {
		resendOTP(email);
	};

	return (
		<div className='max-w-screen-xl mx-auto flex h-screen px-10'>
			<div className='flex-1 hidden lg:flex items-center justify-center'>
				<XSvg className='w-40 h-40' />
			</div>
			<div className='flex-1 flex flex-col justify-center items-center'>
				<div className='lg:w-2/3 mx-auto md:mx-20 flex gap-4 flex-col'>
					<XSvg className='w-24 h-24 lg:hidden' />
					
					<div className='text-center'>
						<h1 className='text-4xl font-extrabold text-white mb-4'>Verify Your Email</h1>
						<p className='text-gray-300 mb-6'>
							We've sent a 6-digit verification code to <span className='text-blue-400'>{email}</span>
						</p>

						<form onSubmit={handleSubmit} className='mb-6'>
							<div className='flex justify-center gap-3 mb-6'>
								{otp.map((digit, index) => (
									<input
										key={index}
										type='text'
										name={`otp-${index}`}
										className='w-12 h-12 text-center text-xl font-bold border-2 border-gray-600 rounded-lg bg-transparent text-white focus:border-blue-500 focus:outline-none'
										value={digit}
										onChange={(e) => handleOtpChange(index, e.target.value)}
										onKeyDown={(e) => handleKeyDown(index, e)}
										maxLength={1}
									/>
								))}
							</div>

							<button 
								type='submit' 
								className='btn rounded-full btn-primary text-white w-full mb-4'
								disabled={isPending || otp.join("").length !== 6}
							>
								{isPending ? "Verifying..." : "Verify Email"}
							</button>
						</form>

						<div className='text-center'>
							{timeLeft > 0 ? (
								<p className='text-gray-400 mb-4'>
									Resend OTP in {formatTime(timeLeft)}
								</p>
							) : (
								<button 
									onClick={handleResendOTP}
									disabled={isResending}
									className='text-blue-400 hover:text-blue-300 mb-4'
								>
									{isResending ? "Sending..." : "Resend OTP"}
								</button>
							)}

							<p className='text-gray-500 text-sm'>
								Didn't receive the code? Check your spam folder or try resending.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OTPVerificationPage; 