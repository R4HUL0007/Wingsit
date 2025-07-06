import { useState, useEffect } from "react";
import XSvg from "../../components/svgs/X";
import { Link } from "react-router-dom";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: email, 2: otp+password
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const otpString = otp.join("");
      const res = await fetch("/api/auth/reset-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessage(data.message);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessage("OTP resent to your email.");
      setResendCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto flex h-screen">
      <div className="flex-1 hidden lg:flex items-center justify-center">
        <XSvg className="w-40 h-40" />
      </div>
      <div className="flex-1 flex flex-col justify-center items-center">
        {step === 1 && (
          <form
            onSubmit={handleEmailSubmit}
            className="lg:w-2/3 mx-auto md:mx-20 flex gap-4 flex-col bg-transparent"
          >
            <XSvg className="w-24 h-24 lg:hidden" />
            <h1 className="text-4xl font-extrabold text-white mb-2">Forgot Password</h1>
            <p className="text-gray-400 mb-2 text-base">Enter your email to receive a password reset OTP.</p>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered rounded w-full bg-black text-white border-gray-700 focus:border-blue-500 placeholder-gray-500"
              required
            />
            <button
              type="submit"
              className="btn rounded-full btn-primary text-white mt-2"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
            {message && <p className="text-green-400 mt-2">{message}</p>}
            {error && <p className="text-red-400 mt-2">{error}</p>}
          </form>
        )}
        {step === 2 && (
          <form
            onSubmit={handleResetSubmit}
            className="lg:w-2/3 mx-auto md:mx-20 flex gap-4 flex-col bg-transparent"
          >
            <XSvg className="w-24 h-24 lg:hidden" />
            <h1 className="text-3xl font-extrabold text-white mb-2">Enter OTP & New Password</h1>
            <p className="text-gray-400 mb-2 text-base">Check your email for a 6-digit OTP.</p>
            <div className="flex justify-center gap-3 mb-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  name={`otp-${index}`}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-600 rounded-lg bg-transparent text-white focus:border-blue-500 focus:outline-none"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  maxLength={1}
                  required
                />
              ))}
            </div>
            <button
              type="button"
              className="text-blue-400 hover:underline text-sm mb-2 disabled:opacity-50"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 || loading}
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
            </button>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered rounded w-full bg-black text-white border-gray-700 focus:border-blue-500 placeholder-gray-500"
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input input-bordered rounded w-full bg-black text-white border-gray-700 focus:border-blue-500 placeholder-gray-500"
              required
            />
            <button
              type="submit"
              className="btn rounded-full btn-primary text-white mt-2"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            {message && <p className="text-green-400 mt-2">{message}</p>}
            {error && <p className="text-red-400 mt-2">{error}</p>}
          </form>
        )}
        {step === 3 && (
          <div className="flex flex-col items-center">
            <XSvg className="w-24 h-24 mb-4" />
            <h1 className="text-3xl font-extrabold text-green-400 mb-2">Password Reset Successful!</h1>
            <p className="text-white mb-4">You can now log in with your new password.</p>
            <Link to="/login">
              <button className="btn rounded-full btn-primary text-white btn-outline w-full">Back to Login</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 