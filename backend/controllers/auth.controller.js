import User from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import bcrpyt from "bcryptjs";


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

    const newUSer = new User ({
      fullname,
      username,
      email,
      password: hashedPassword

    })

    if (newUSer){
      generateTokenAndSetCookie(newUSer._id,res)
      await newUSer.save();

      res.status(201).json({
        _id : newUSer._id,
        fullname : newUSer.fullname,
        username : newUSer.username,
        email : newUSer.email,
        followers: newUSer.followers,
        following: newUSer.following,
        profileImg: newUSer.profileImg,
        coverImg: newUSer.coverImg,
      })
    }else{
      res.status(400).json({error: "Invalid user data"});
    }
     
  } catch (error){
    console.log("Error in  singup controller", error.message);

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