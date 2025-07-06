import express from "express"
import { getMe, signup, login, logout, forgotPassword, resetPassword, verifyOTP, resendOTP, forgotPasswordOTP, resetPasswordOTP } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", protectRoute, getMe);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

router.post("/forgot-password-otp", forgotPasswordOTP);
router.post("/reset-password-otp", resetPasswordOTP);

export default router;