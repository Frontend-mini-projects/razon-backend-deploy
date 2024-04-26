import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { accessChat, addToGroup, createGroupChat, fetchChats, removeFromGroup, renameGroup } from "../controllers/chat.controller.js";

const router = Router();

router.route("/").post(verifyJwt, accessChat);
router.route("/").get(verifyJwt, fetchChats);

router.route("/group/create").post(verifyJwt, createGroupChat);
router.route("/group/rename").put(verifyJwt, renameGroup);
router.route("/group/remove").put(verifyJwt, removeFromGroup);
router.route("/group/add").put(verifyJwt, addToGroup);

export default router;
