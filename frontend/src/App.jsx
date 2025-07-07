import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/auth/login/LoginPage";
import SignUpPage from "./pages/auth/signup/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import OTPVerificationPage from "./pages/auth/OTPVerificationPage";
import ChatPage from "./pages/home/ChatPage";
import BookmarksPage from "./pages/home/BookmarksPage";
import FeedbackPage from "./pages/home/FeedbackPage";
import ReadmePage from "./pages/home/ReadmePage";

import Sidebar from "./components/common/Sidebar";
import RightPanel from "./components/common/RightPanel";

import NotificationPage from "./pages/notification/NotificationPage";
import ProfilePage from "./pages/profile/ProfilePage";

import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "./components/common/LoadingSpinner";

function App() {

  const { data:authUser, isLoading } =useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if(data.error) return null;
      
      if(!res.ok){
        throw new Error(data.error || "Something went wrong");
      }
      console.log("authUser is here:",data );
      return data;
    } catch(error){
      throw new Error(error)
    }
    },
    retry : false,
  });
  const location = useLocation();
  const navigate = useNavigate();
  if(isLoading){
    return (
      <div className='h-screen flex justify-center items-center'>
        <LoadingSpinner size="lg" /> 
      </div>
      )
    }

  // Fallback for unauthenticated user on any route except auth pages
  const authRoutes = ["/login", "/signup", "/forgot-password"];
  const isResetPassword = location.pathname.startsWith("/reset-password");
  const isOTPVerification = location.pathname.startsWith("/verify-otp");
  if (!authUser && !authRoutes.includes(location.pathname) && !isResetPassword && !isOTPVerification) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-[#181818]">
        <div className="text-white text-2xl mb-4">You are not logged in.</div>
        <button
          className="btn btn-primary rounded-full text-white px-6 py-2"
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
        <button
          className="btn btn-outline rounded-full text-white px-6 py-2 mt-2"
          onClick={() => navigate("/signup")}
        >
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-6xl mx-auto">
      { authUser && < Sidebar />}
      <Routes>
        <Route path="/" element= { authUser ? <HomePage /> : <Navigate to= '/login' /> } />
        <Route path="/login" element= { !authUser ? <LoginPage /> : <Navigate to= '/' /> } />
        <Route path="/signup" element= { !authUser ?  <SignUpPage /> : <Navigate to= '/' /> } />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-otp" element={<OTPVerificationPage />} />
        <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to='/login' />} />
        <Route path="/notifications" element= { authUser? <NotificationPage /> : <Navigate to= '/login' />} />
        <Route path="/profile/:username" element= { authUser? <ProfilePage /> : <Navigate to= '/login' />} />
        <Route path="/bookmarks" element={authUser ? <BookmarksPage /> : <Navigate to='/login' />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/readme" element={<ReadmePage />} />
      </Routes>
      { authUser && <RightPanel />}
      <Toaster />
    </div>

  );
}

export default App
