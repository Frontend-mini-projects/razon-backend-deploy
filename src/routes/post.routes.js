import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  createComment,
  createNestedReply,
  createPost,
  createReply,
  deletePost,
  downvote,
  downvoteComment,
  downvoteReply,
  getPosts,
  getCommentReplies,
  getPostByUsername,
  getPostComments,
  getPostDetails,
  getReplyNestedReplies,
  upvote,
  upvoteComment,
  upvoteReply,
  upvoteNestedReply,
  downvoteNestedReply,
} from "../controllers/post.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

//POST
router.route("/create-post").post(
  verifyJwt,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  createPost
);
router.route("/delete-post").post(verifyJwt, deletePost);
router.route("/upvote").post(verifyJwt, upvote);
router.route("/downvote").post(verifyJwt, downvote);

//COMMENT
router.route("/create-comment").post(verifyJwt, createComment);
router.route("/upvote-comment").post(verifyJwt, upvoteComment);
router.route("/downvote-comment").post(verifyJwt, downvoteComment);

// REPLY
router.route("/create-reply/:commentId").post(verifyJwt, createReply);
router.route("/create-nested-reply").post(verifyJwt, createNestedReply);
router.route("/upvote-nested-reply").post(verifyJwt, upvoteReply);
router.route("/downvote-nested-reply").post(verifyJwt, downvoteReply);

// GET ROUTES
router.route("/get-posts").get(getPosts);
router.route("/get-posts/:username").get(getPostByUsername);
router.route("/get-posts-info/:postId").get(getPostDetails);

router.route("/post-comments/:postId").get(getPostComments);
router.route("/comment-replies/:commentId").get(getCommentReplies);
router  
  .route("/reply-nested-replies/:replyId")
  .get(getReplyNestedReplies);

export default router;
