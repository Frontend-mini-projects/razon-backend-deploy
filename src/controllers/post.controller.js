import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

import { Post, Comment, Reply } from "../model/post.model.js";
import { User } from "../model/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const isUserUpvotedOrDownvoted = (user, upvotes, downvotes) => ({
  alreadyUpvoted: upvotes.includes(user),
  alreadyDownvoted: downvotes.includes(user),
});

const createPost = asyncHandler(async (req, res) => {
  const { title, content, tags } = req.body;
  console.log(title, content, tags);
  if (!req.user) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authorized"));
  }

  if (!title) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Title is required"));
  }

  if (!content) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Content is required"));
  }

  let avatarUrl = ""; // Default empty string for the avatar URL

  if (req.files && req.files.avatar && req.files.avatar.length > 0) {
    // If an avatar is provided, upload it to Cloudinary
    const avatarLocalPath = req.files.avatar[0].path;
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Update avatarUrl only if the upload was successful
    if (avatar) {
      avatarUrl = avatar.url;
    }
  }
  const createPost = await Post.create({
    title: title,
    content: content,
    image: avatarUrl,
    user: req.user._id,
    tags: tags,
  });

  if (!createPost) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Something went wrong while creating a post")
      );
  }

  const post = await Post.findById(createPost._id).populate("user", "username");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...post.toObject(), username: req.user.username },
        "Post created successfully"
      )
    );
});

const upvote = asyncHandler(async (req, res) => {
  const { post_id } = req.query;
  const userId = req.user?._id;

  if (!post_id) {
    throw new ApiError(400, "PostID is required");
  }

  const post = await Post.findById(post_id);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const alreadyUpvoted = post.upvotes.includes(userId);
  const alreadyDownvoted = post.downvotes.includes(userId);

  if (alreadyUpvoted) {
    const updatedPost = await Post.findByIdAndUpdate(
      post_id,
      { $pull: { upvotes: userId } },
      { new: true }
    );

    res
      .status(200)
      .json(new ApiResponse(200, updatedPost, "Upvote removed successfully"));
  } else {
    const updatedPost = await Post.findByIdAndUpdate(
      post_id,
      {
        $push: { upvotes: userId },
        $pull: { downvotes: userId },
      },
      { new: true }
    );

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedPost, "Upvote registered successfully")
      );
  }
});

const downvote = asyncHandler(async (req, res) => {
  const { post_id } = req.query;
  const userId = req.user?._id;

  if (!post_id) {
    throw new ApiError(400, "PostID is required");
  }

  const post = await Post.findById(post_id);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const alreadyUpvoted = post.upvotes.includes(userId);
  const alreadyDownvoted = post.downvotes.includes(userId);

  if (alreadyDownvoted) {
    // User has already downvoted, remove downvote
    const updatedPost = await Post.findByIdAndUpdate(
      post_id,
      { $pull: { downvotes: userId } },
      { new: true }
    );

    res
      .status(200)
      .json(new ApiResponse(200, updatedPost, "Downvote removed successfully"));
  } else {
    // User has not downvoted, add downvote
    // Remove upvote if user had already upvoted
    const updatedPost = await Post.findByIdAndUpdate(
      post_id,
      {
        $push: { downvotes: userId },
        $pull: { upvotes: userId },
      },
      { new: true }
    );

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedPost, "Downvote registered successfully")
      );
  }
});

const createComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { post_id } = req.query;

  if (!content || !post_id) {
    throw new ApiError(400, "Content and post ID are required");
  }

  try {
    const post = await Post.findById(post_id);
    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const comment = new Comment({
      content,
      user: req.user?._id,
      post: post._id,
    });

    await comment.save();
    await Post.findByIdAndUpdate(post._id, {
      $push: { comments: comment._id },
    });

    res
      .status(201)
      .json(new ApiResponse(201, comment, "Comment created successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Error creating comment");
  }
});

const upvoteComment = asyncHandler(async (req, res) => {
  const { comment_id } = req.query;
  const userId = req.user?._id;

  if (!comment_id) {
    throw new ApiError(400, "Comment ID is required");
  }

  const comment = await Comment.findById(comment_id);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const { alreadyUpvoted, alreadyDownvoted } = isUserUpvotedOrDownvoted(
    userId,
    comment.upvotes,
    comment.downvotes
  );

  if (alreadyUpvoted) {
    const updatedComment = await Comment.findByIdAndUpdate(
      comment_id,
      { $pull: { upvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Upvote removed successfully")
      );
  } else {
    const updatedComment = await Comment.findByIdAndUpdate(
      comment_id,
      { $push: { upvotes: userId }, $pull: { downvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Upvote registered successfully")
      );
  }
});

const downvoteComment = asyncHandler(async (req, res) => {
  const { comment_id } = req.query;
  const userId = req.user?._id;

  if (!comment_id) {
    throw new ApiError(400, "Comment ID is required");
  }

  const comment = await Comment.findById(comment_id);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const { alreadyUpvoted, alreadyDownvoted } = isUserUpvotedOrDownvoted(
    userId,
    comment.upvotes,
    comment.downvotes
  );

  if (alreadyDownvoted) {
    const updatedComment = await Comment.findByIdAndUpdate(
      comment_id,
      { $pull: { downvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Downvote removed successfully")
      );
  } else {
    const updatedComment = await Comment.findByIdAndUpdate(
      comment_id,
      { $push: { downvotes: userId }, $pull: { upvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Downvote registered successfully")
      );
  }
});

const createReply = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;

  if (!content || !commentId) {
    throw new ApiError(400, "Content and comment ID are required");
  }

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    const reply = new Reply({
      content,
      user: req.user?._id,
    });

    await reply.save();
    await Comment.findByIdAndUpdate(comment._id, {
      $push: { replies: reply._id },
    });

    res
      .status(201)
      .json(new ApiResponse(201, reply, "Reply created successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Error creating reply");
  }
});

const upvoteReply = asyncHandler(async (req, res) => {
  const { reply_id } = req.query;
  const userId = req.user?._id;

  if (!reply_id) {
    throw new ApiError(400, "Reply ID is required");
  }

  const reply = await Reply.findById(reply_id);
  if (!reply) {
    throw new ApiError(404, "Reply not found");
  }

  const { alreadyUpvoted, alreadyDownvoted } = isUserUpvotedOrDownvoted(
    userId,
    reply.upvotes,
    reply.downvotes
  );

  if (alreadyUpvoted) {
    const updatedReply = await Reply.findByIdAndUpdate(
      reply_id,
      { $pull: { upvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(new ApiResponse(200, updatedReply, "Upvote removed successfully"));
  } else {
    const updatedReply = await Reply.findByIdAndUpdate(
      reply_id,
      { $push: { upvotes: userId }, $pull: { downvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedReply, "Upvote registered successfully")
      );
  }
});

const downvoteReply = asyncHandler(async (req, res) => {
  const { reply_id } = req.query;
  const userId = req.user?._id;

  if (!reply_id) {
    throw new ApiError(400, "Reply ID is required");
  }

  const reply = await Reply.findById(reply_id);
  if (!reply) {
    throw new ApiError(404, "Reply not found");
  }

  const { alreadyUpvoted, alreadyDownvoted } = isUserUpvotedOrDownvoted(
    userId,
    reply.upvotes,
    reply.downvotes
  );

  if (alreadyDownvoted) {
    const updatedReply = await Reply.findByIdAndUpdate(
      reply_id,
      { $pull: { downvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedReply, "Downvote removed successfully")
      );
  } else {
    const updatedReply = await Reply.findByIdAndUpdate(
      reply_id,
      { $push: { downvotes: userId }, $pull: { upvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedReply, "Downvote registered successfully")
      );
  }
});

const createNestedReply = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { reply_id } = req.query;

  if (!content || !reply_id) {
    throw new ApiError(400, "Content and reply ID are required");
  }

  try {
    const parentReply = await Reply.findById(reply_id);
    if (!parentReply) {
      throw new ApiError(404, "Parent reply not found");
    }

    const nestedReply = new Reply({
      content,
      user: req.user?._id,
      parentReply: reply_id,
    });

    await nestedReply.save();
    await Reply.findByIdAndUpdate(parentReply._id, {
      $push: { replies: nestedReply._id },
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, nestedReply, "Nested reply created successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Error creating nested reply");
  }
});

const upvoteNestedReply = asyncHandler(async (req, res) => {
  const { nested_reply_id } = req.query;
  const userId = req.user?._id;

  if (!nested_reply_id) {
    throw new ApiError(400, "Nested reply ID is required");
  }

  const nestedReply = await Reply.findById(nested_reply_id);
  if (!nestedReply) {
    throw new ApiError(404, "Nested reply not found");
  }

  const { alreadyUpvoted, alreadyDownvoted } = isUserUpvotedOrDownvoted(
    userId,
    nestedReply.upvotes,
    nestedReply.downvotes
  );

  if (alreadyUpvoted) {
    const updatedNestedReply = await Reply.findByIdAndUpdate(
      nested_reply_id,
      { $pull: { upvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedNestedReply, "Upvote removed successfully")
      );
  } else {
    const updatedNestedReply = await Reply.findByIdAndUpdate(
      nested_reply_id,
      { $push: { upvotes: userId }, $pull: { downvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedNestedReply,
          "Upvote registered successfully"
        )
      );
  }
});

const downvoteNestedReply = asyncHandler(async (req, res) => {
  const { nested_reply_id } = req.query;
  const userId = req.user?._id;

  if (!nested_reply_id) {
    throw new ApiError(400, "Nested reply ID is required");
  }

  const nestedReply = await Reply.findById(nested_reply_id);
  if (!nestedReply) {
    throw new ApiError(404, "Nested reply not found");
  }

  const { alreadyUpvoted, alreadyDownvoted } = isUserUpvotedOrDownvoted(
    userId,
    nestedReply.upvotes,
    nestedReply.downvotes
  );

  if (alreadyDownvoted) {
    const updatedNestedReply = await Reply.findByIdAndUpdate(
      nested_reply_id,
      { $pull: { downvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedNestedReply,
          "Downvote removed successfully"
        )
      );
  } else {
    const updatedNestedReply = await Reply.findByIdAndUpdate(
      nested_reply_id,
      { $push: { downvotes: userId }, $pull: { upvotes: userId } },
      { new: true }
    );
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedNestedReply,
          "Downvote registered successfully"
        )
      );
  }
});

const getPosts = asyncHandler(async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json(new ApiResponse(200, posts, "All posts retrieved successfully"));
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, null, error.message));
  }
});

const getPostByUsername = asyncHandler(async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "User not found"));
    }

    const posts = await Post.find({ user: user._id }).populate("user");


    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          posts,
          `Posts by ${username} retrieved successfully`
        )
      );
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, null, error.message));
  }
});

const getPostDetails = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .populate("user", "username avatar followers")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json(new ApiResponse(200, post, "Post details retrieved successfully"));
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, null, error.message));
  }
});

const getPostComments = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const postComments = await Comment.find({ post: postId })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          postComments,
          "Comments for the post retrieved successfully"
        )
      );
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, null, error.message));
  }
});

const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Comment ID is required");
  }

  // Populate the "replies" field of the comment and the "user" field for each reply
  const comment = await Comment.findById(commentId).populate({
    path: "replies",
    populate: { path: "user", select: "username avatar" },
  });

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        comment.replies,
        "Replies for the comment retrieved successfully"
      )
    );
});

const getReplyNestedReplies = asyncHandler(async (req, res) => {
  const replyId = req.params.replyId;

  try {
    // Find the reply by ID
    const reply = await Reply.findById(replyId);

    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    // Fetch nested replies for the reply
    const nestedReplies = await Reply.find({ parentReply: replyId });

    // Respond with the nested replies
    res.status(200).json({ data: nestedReplies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }

  const postToDelete = await Post.findById(postId);

  if (!postToDelete) {
    throw new ApiError(404, "Post not found");
  }

  // Check if the authenticated user is the creator of the post
  if (postToDelete.user.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "Unauthorized. You can only delete your own posts."
    );
  }

  const deletedPost = await Post.findByIdAndDelete(postId);

  if (!deletedPost) {
    throw new ApiError(404, "Post not found");
  }

  res.status(200).json(new ApiResponse(200, null, "Post deleted successfully"));
});

export {
  createPost,
  upvote,
  downvote,
  createComment,
  upvoteComment,
  downvoteComment,
  createReply,
  upvoteReply,
  downvoteReply,
  createNestedReply,
  upvoteNestedReply,
  downvoteNestedReply,
  getPostByUsername,
  getPostDetails,
  getPosts,
  deletePost,
  getPostComments,
  getCommentReplies,
  getReplyNestedReplies,
};
