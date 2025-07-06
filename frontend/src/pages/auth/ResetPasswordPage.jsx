import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import XSvg from "../../components/svgs/X";
import { Link } from "react-router-dom";

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 2000);
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
        <form
          onSubmit={handleSubmit}
          className="lg:w-2/3 mx-auto md:mx-20 flex gap-4 flex-col bg-transparent"
        >
          <XSvg className="w-24 h-24 lg:hidden" />
          <h1 className="text-4xl font-extrabold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400 mb-2 text-base">Enter your new password below.</p>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <div className="flex flex-col gap-2 mt-4">
          <Link to="/login">
            <button className="btn rounded-full btn-primary text-white btn-outline w-full">Back to Login</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage; 