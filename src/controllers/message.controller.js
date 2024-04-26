import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Message } from "../model/message.model.js";
import { User } from "../model/user.model.js";
import { Chat } from "../model/chat.model.js";

const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username avatar")
      .populate("chat");
    res
      .status(200)
      .json(new ApiResponse(200, messages, "Fetched successfully"));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    throw new ApiError(400, "Invalid data passed into request");
  }

  let newMessage = {
    sender: req.user?._id,
    content: content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "username avatar");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "username avatar",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res
      .status(200)
      .json(new ApiResponse(200, message, "Message sent successfully"));
  } catch (error) {
    res.status(400);
    throw new ApiError(400, error.message);
  }
});

const editMessage = asyncHandler(async (req, res) => {
  const { messageId, content } = req.body;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to edit this message");
  }

  const currentTime = new Date();
  const messageSentTime = message.createdAt;

  const timeDifference = currentTime - messageSentTime;
  const minutesDifference = Math.floor(
    (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
  );

  if (minutesDifference > 30) {
    throw new ApiError(
      403,
      "You can only edit messages within 30 minutes of sending"
    );
  }

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    {
      content,
      isEdited: true,
    },
    { new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedMessage, "Message edited successfully"));
});


export { allMessages, sendMessage, editMessage };
