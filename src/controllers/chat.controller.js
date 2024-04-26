import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Chat } from "../model/chat.model.js";
import { User } from "../model/user.model.js";

const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw new ApiError(400, "UserId not received");
  }

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  // add username and avatar to isChat
  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "username avatar",
  });

  if (isChat.length > 0) {
    res.status(200).json(new ApiResponse(200, isChat[0], "success"));
  } else {
    let chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user?._id, userId],
    };

    try {
      const createChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createChat?._id }).populate(
        "users",
        "-password"
      );

      res
        .status(200)
        .json(new ApiResponse(200, fullChat, "Chat created successfully"));
    } catch (error) {
      throw new ApiError(400, error.message);
    }
  }
});

const fetchChats = asyncHandler(async (req, res) => {
  await Chat.find({
    users: {
      $elemMatch: { $eq: req.user?._id },
    },
  })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({
      updatedAt: -1,
    })
    .then(async (results) => {
      results = await User.populate(results, {
        path: "latestMessage.sender",
        select: "username avatar",
      });
      res
        .status(200)
        .json(new ApiResponse(200, results, "Fetched successfully"));
    });
});

const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    throw new ApiError(400, "All fields are required");
  }

  const users = Array.isArray(req.body.users) ? [...new Set(req.body.users)] : [];
  const userId = req.user._id.toString();

  if (!users.includes(userId)) {
    users.push(userId);
  }

  if (users.length < 2) {
    throw new ApiError(400, "More than 2 users are required to form a group chat");
  }

  // Ensure the group only contains unique user IDs
  const uniqueUsers = [...new Set(users)];

  console.log(req.user);

  const groupChat = await Chat.create({
    chatName: req.body.name,
    isGroupChat: true,
    users: uniqueUsers,
    groupAdmin: req.user,
  });

  const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res
    .status(200)
    .json(
      new ApiResponse(200, fullGroupChat, "GroupChat created successfully")
    );
});



const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat Not Found");
  }

  if (chat.groupAdmin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the group admin can rename the group");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(200).json(new ApiResponse(200, updatedChat));
});

const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat || !chat.isGroupChat) {
    throw new ApiError(404, "Group Chat Not Found");
  }

  if (chat.groupAdmin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the group admin can add users to the group");
  }

  if (userId.toString() === chat.groupAdmin.toString()) {
    throw new ApiError(400, "Cannot add the group admin to the group");
  }

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(200).json(new ApiResponse(200, added));
});

const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat || !chat.isGroupChat) {
    throw new ApiError(404, "Group Chat Not Found");
  }

  if (chat.groupAdmin.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "Only the group admin can remove users from the group"
    );
  }
 

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(200).json(new ApiResponse(200, removed));
});

export {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
