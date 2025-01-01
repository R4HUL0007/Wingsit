import User from "../models/user.model.js";
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

export const login = async(req, res) => {
    res.json({
      data: "You have hit the login endpoint"
    });
  };

  export const logout = async(req, res) => {
    res.json({
      data: "You have hit the logout endpoint"
    });
  };