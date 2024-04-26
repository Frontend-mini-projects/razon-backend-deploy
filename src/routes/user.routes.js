import { Router } from "express";
import {
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
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/verify").get(verifyUser);
//secure routes

router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/current-user").post(verifyJwt, getCurrentUser);
router.route("/update-account").patch(verifyJwt, updateAccountDetails);
router
.route("/avatar")
.patch(verifyJwt, upload.single("avatar"), updateUserAvatar);
router.route("/delete-user-account").delete(verifyJwt, deleteUserAccount);
// router.route("/validateEmail").post(validateEmail);

router.route("/followUser/:userIdToFollow").post(verifyJwt, followUser);
router.route("/unFollowUser/:userIdToUnFollow").post(verifyJwt, unFollowUser);

router.route("/user").get(verifyJwt, allUsers);
router.route("/user/:username").get(getUser);
export default router;

