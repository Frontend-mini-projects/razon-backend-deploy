// import mongoose from "mongoose";

// const replySchema = new mongoose.Schema(
//   {
//     content: {
//       type: String,
//       required: true,
//     },
//     upvotes: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//       },
//     ],
//     downvotes: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//       },
//     ],
//     replies: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Reply",
//       },
//     ],
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     comment: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Comment",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const commentSchema = new mongoose.Schema(
//   {
//     content: {
//       type: String,
//       required: true,
//     },
//     upvotes: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//       },
//     ],
//     downvotes: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//       },
//     ],
//     replies: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Reply",
//       },
//     ],
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     post: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Post",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// export const Comment = mongoose.model("Comment", commentSchema);
// export const Reply = mongoose.model("Reply", replySchema);
