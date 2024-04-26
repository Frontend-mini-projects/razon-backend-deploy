import mongoose from "mongoose";
const analyticsSchema = new mongoose.Schema({
  impressions: {
    type: Number,
  },
  upvotes: {
    types: Number,
  },
  downvotes: {
    types: Number,
  },
  Post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
});

export const Analytics = mongoose.model("Analytics", analyticsSchema);
