import User from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import bcrpyt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";


export const signup = async(req, res) => {
  try{
    const { fullname, username, email, password} = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error : "Invalid email address" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error : "Username already exists" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error : "Email already in use" });
    }

    if(password.length < 6){
      return res.status(400).json({ error : "Password must be at least 6 characters "});
    }

    const salt = await bcrpyt.genSalt(10);
    const hashedPassword = await bcrpyt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User ({
      fullname,
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      otp: otp,
      otpExpires: Date.now() + 1000 * 60 * 10 // 10 minutes
    })

    if (newUser){
      await newUser.save();
      
      // Send OTP email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      
      await transporter.sendMail({
        to: newUser.email,
        subject: "Verify Your Email - Wingsit",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1da1f2;">Welcome to Wingsit!</h2>
            <p>Hi ${newUser.fullname},</p>
            <p>Thank you for signing up! Please verify your email address using the OTP below:</p>
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
              <h1 style="color: #1da1f2; font-size: 48px; letter-spacing: 10px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>Best regards,<br>The Wingsit Team</p>
          </div>
        `
      });

      res.status(201).json({
        message: "Account created successfully! Please check your email for the OTP to verify your account.",
        email: newUser.email
      });
    }else{
      res.status(400).json({error: "Invalid user data"});
    }
     
  } catch (error){
    console.log("Error in signup controller", error.message);
    res.status(500).json({error: "Internal server error"});
  }
};

export const login = async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		const isPasswordCorrect = await bcrpyt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid username or password" });
		}

		// Check if email is verified
		if (!user.isVerified) {
			return res.status(400).json({ 
				error: "Please verify your email address before logging in. Check your inbox for the OTP." 
			});
		}

		generateTokenAndSetCookie(user._id, res);

		res.status(200).json({
			_id: user._id,
			fullname: user.fullname,
			username: user.username,
			email: user.email,
			followers: user.followers,
			following: user.following,
			profileImg: user.profileImg,
			coverImg: user.coverImg,
		});
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const logout = async(req, res) => {
    try {
      res.cookie("jwt", "", { maxAge: 0 });
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      console.log("Error in logout controller", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getMe = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select("-password");
		res.status(200).json(user);
	} catch (error) {
		console.log("Error in getMe controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User with this email does not exist" });
    }
    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset",
      html: `<p>You requested a password reset. Click <a href='${resetUrl}'>here</a> to reset your password. This link is valid for 1 hour.</p>`
    });
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.log("Error in forgotPassword controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const salt = await bcrpyt.genSalt(10);
    user.password = await bcrpyt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.log("Error in resetPassword controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({ 
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.log("Error in verifyOTP controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User with this email does not exist" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 1000 * 60 * 10; // 10 minutes
    await user.save();

    // Send OTP email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    await transporter.sendMail({
      to: user.email,
      subject: "Verify Your Email - Wingsit",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1da1f2;">Email Verification - Wingsit</h2>
          <p>Hi ${user.fullname},</p>
          <p>You requested a new OTP. Please verify your email address using the OTP below:</p>
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
            <h1 style="color: #1da1f2; font-size: 48px; letter-spacing: 10px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
          <p>Best regards,<br>The Wingsit Team</p>
        </div>
      `
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.log("Error in resendOTP controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const forgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User with this email does not exist" });
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 1000 * 60 * 10; // 10 min
    await user.save();
    // Send OTP email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      to: user.email,
      subject: "Wingsit Password Reset OTP",
      html: `<div style='font-family:sans-serif;max-width:600px;margin:0 auto;'>
        <h2 style='color:#FFA500;'>Wingsit Password Reset</h2>
        <p>Your OTP for password reset is:</p>
        <div style='font-size:2rem;font-weight:bold;letter-spacing:8px;margin:20px 0;color:#FFA500;'>${otp}</div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>`
    });
    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    console.log("Error in forgotPasswordOTP:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const resetPasswordOTP = async (req, res) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;
    if (!email || !otp || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
    const salt = await bcrpyt.genSalt(10);
    user.password = await bcrpyt.hash(password, salt);
    user.otp = null;
    user.otpExpires = null;
    await user.save();
    res.status(200).json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    console.log("Error in resetPasswordOTP:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};