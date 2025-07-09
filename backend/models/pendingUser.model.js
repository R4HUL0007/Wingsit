import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true }, // hashed
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
}, { timestamps: true });

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser; 