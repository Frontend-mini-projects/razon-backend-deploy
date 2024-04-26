import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      default: "",
      trim: true
    },
    bio: {
      type: String,
    },
    avatar: {
      type: String,
    },
    password: {
      type: String,
    },
    verificationToken: {
      type: String,
    },
    refreshToken: {
      type: String
    },
    tag: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  } else {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
/*
Use email only for user verification 
do not store email in DB

User :- 
	Username 
	Bio
	avatar 
	password
	refreshToken
	universityTag

Post :- 
	Title? 
	content 
	universityTag
	upvotes 
	downvotes 
	User 

Reply :- 
	content 
	upvotes 
	downvotes 
	replies [
		{
			Reply
		}
	]
	post 
	user

Analytics 
	impressions 
	upvotes 
	downvotes 
	Post 
	
Universities 
	name

*/
