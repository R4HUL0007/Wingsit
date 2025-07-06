import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required : true,
        unique: true,
    },

    fullname: {
        type: String,
        required: true,
    },

    password: {
        type: String,
        required: true,
        unique : true,
    },
    
    email:{
        type: String,
        required: true,
        unique: true,
        },

    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref : "User",
            default : []
        }
    ],

    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref : "User",
            default : []
        }
    ],
    
    profileImg: {
        type: String,
        default:"", 
    },

    coverImg:{
        type:String,
        default: "",
    },

    bio: {
        type: String,
        default: "",
    },

    link:{
        type:String,
        default:"",
    },
    likedPosts:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: []
        }
    ],
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
    bookmarks:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: []
        }
    ],
},{ timestamps: true})

const User = mongoose.model("User", userSchema);

export default User;