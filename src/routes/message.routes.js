import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { allMessages, editMessage, sendMessage } from "../controllers/message.controller.js";

const router = Router();

router.route("/:chatId").get(verifyJwt, allMessages);
router.route("/").post(verifyJwt, sendMessage);

router.route("/edit").put(verifyJwt, editMessage);

export default router;
