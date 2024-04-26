import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../model/user.model.js";
import validator from "validator";
import { isEmailValid, isDisposableEmail } from "../utils/emailVerification.js";
import crypto from "crypto";
import uploadImageOnCloudinary from "../utils/cloudinary.js";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong, while generating refresh and access token"
    );
  }
};

// const validateEmail = asyncHandler(async (req, res) => {
//   const { email } = req.body;

//   if(!email) {
//     return res.status(400).json({ error: "Email required" });
//   }

//   if (!validator.isEmail(email)) {
//     return res.status(400).json({ error: "Invalid email format." });
//   }

//   // if (await isDisposableEmail(email)) {
//   //   return res
//   //     .status(400)
//   //     .json({ error: "Disposable email addresses are not allowed." });
//   // }

//   const { isValid, universityName } = await isEmailValid(email);

//   const verificationToken = crypto.randomBytes(20).toString("hex");

//   const user = await User.create({
//     verificationToken,
//     universityTag:  isValid ? universityName : '',
//   });

//   const verificationLink = `https://localhost:8000/api/auth/user/verify?token=${verificationToken}`;
//   return res
//     .status(200)
//     .json(new ApiResponse(200, user, "Please verify the email"));
// });

// const registerUser = asyncHandler(async (req, res) => {
//   // get user details from front-end
//   const { username, bio, password, verificationCode } = req.body;

//   // validations - not empty
//   if (!username) {
//     throw new ApiError(400, "Username is required");
//   }

//   if (!password) {
//     throw new ApiError(400, "Password is required");
//   }

//   // check if user already exists : username
//   const existingUser = await User.findOne({ username });
//   if (existingUser) {
//     throw new ApiError(400, "Username Already exists");
//   }

//   // check for images, check for avatar
//   let avatarLocalPath = req.files?.avatar[0]?.path;
//   if (!avatarLocalPath) {
//     throw new ApiError(400, "Avatar is Required");
//   }

//   // upload them in cloudinary, avatar
//   const avatar = await uploadImageOnCloudinary(avatarLocalPath);
//   if (!avatar) {
//     throw new ApiError(400, "Avatar is required");
//   }

//   // create user object - create entry in DB
//   const user = await User.Create({
//     username,
//     password,
//     bio,
//     verificationToken: verificationCode,
//     avatar: avatar?.url,

//   }
//   );

//   // remove password and refresh token field from response
//   const createdUser = await User.findById(user._id).select(
//     "-password -refreshToken"
//   );

//   // check for user creation
//   if (!createdUser) {
//     throw new ApiError(400, "Registration Failed, Please try again");
//   }
//   // return response
//   return res
//     .status(200)
//     .json(new ApiResponse(200, createdUser, "Registration Successful"));
// });

const registerUser = asyncHandler(async (req, res) => {
  // get user details from front-end
  const { username, password, confirmPassword, bio } = req.body;

  // validations - not empty
  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // if (password === confirmPassword) {
  //   throw new ApiError(400, "Password's are not same");
  // }

  // check if user already exists : username
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ApiError(400, "Username Already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const verificationToken = crypto.randomBytes(20).toString("hex");
  const avatar = await uploadImageOnCloudinary(avatarLocalPath);
  const user = await User.create({
    username,
    password,
    bio,
    avatar: avatar?.url || "https://github.com/shadcn.png",
    verificationToken,
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(400, "Registration Failed, Please try again");
  }
  // return response
  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "Registration Successful"));
});

const verifyUser = asyncHandler(async (req, res) => {
  console.log(req.query);
  const { token } = req.query;

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    throw new ApiError(401, "Invalid verification token");
  }

  if (user && user?.isVerified) {
    throw new ApiError(401, "Already Verified");
  }

  user.isVerified = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Account verified successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(404, "User not exists");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged-in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = User.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Current password is not valid");
  }

  user.password = newPassword;
  await user.save({
    validateBeforeSave: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password saved successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { bio } = req.body;
  if (!bio) {
    throw new ApiError(400, "Please write something");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        bio,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const getUser = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(404, "Username is empty");
  }

  console.log(username);

  // Use await with findOne and handle the asynchronous nature
  const foundUser = await User.findOne({
    username: username, // Corrected to use the extracted username
  });

  if (!foundUser) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(new ApiResponse(200, foundUser, "User details"));
});


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(400, "User not valid");
  }

  await User.findOneAndDelete(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User account deleted successfully"));
});

const followUser = asyncHandler(async (req, res) => {
  const { userIdToFollow } = req.params;

  const userToFollow = await User.findById(userIdToFollow);
  if (!userToFollow) {
    throw new ApiError(404, "User not found");
  }

  if (req.user.following.includes(userIdToFollow)) {
    throw new ApiError(400, "User already being followed");
  }

  req.user.following.push(userIdToFollow);
  await req.user.save();

  userToFollow.followers.push(req.user?._id);
  await userToFollow.save();

  res.status(200).json(new ApiResponse(200, null, "Followed successfully"));
});

const unFollowUser = asyncHandler(async (req, res) => {
  const { userIdToUnFollow } = req.params;

  const userToUnFollow = await User.findById(userIdToUnFollow);
  if (!userToUnFollow) {
    throw new ApiError(404, "User not found");
  }

  if (!req.user.following.includes(userIdToUnFollow)) {
    throw new ApiError(400, "User is not being followed");
  }

  req.user.following = req.user.following.filter(
    (id) => id.toString() !== userIdToUnFollow.toString()
  );
  await req.user.save();

  userToUnFollow.followers = userToUnFollow.followers.filter(
    (id) => id.toString() !== req.user._id.toString()
  );
  await userToUnFollow.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "User unFollowed successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadImageOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image Updated"));
});

const allUsers = asyncHandler(async (req, res) => {
  console.log("called");
  console.log(req.query.search);
  const userName = req.query.search;

  const users = await User.find({
    username: { $regex: new RegExp(userName, "i") },
  }).select("username avatar");
  console.log(users);
  return res
    .status(200)
    .json(new ApiResponse(200, users, "User fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  getCurrentUser,
  refreshAccessToken,
  deleteUserAccount,
  verifyUser,
  followUser,
  unFollowUser,
  allUsers,
  getUser
};
