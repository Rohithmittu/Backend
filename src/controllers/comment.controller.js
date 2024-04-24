import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "enter correct Video Id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "video not found");
  }

  const commentAggregate = Comment.aggregate([
    // {
    //   $match: {
    //     video: new mongoose.Types.ObjectId(videoId),
    //   },
    // },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likescount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $in: [req.user?._id, "$likes.likedBy"],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likescount: 1,
        isLiked: 1,
        owner: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  // console.log(commentAggregate);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(commentAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched succcesfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "enter correct Video Id");
  }

  const { content } = req.body;
  // console.log(content);

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment please try again");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment ID wrong");
  }
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const FindComment = await Comment.findById(commentId);

  if (FindComment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not owner of this comment");
  }

  const uploadComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!uploadComment) {
    throw new ApiError(400, "failed to update comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, uploadComment, "Comment updated suceesfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "comment ID invalid");
  }

  const findComment = await Comment.findById(commentId);

  if (!findComment) {
    throw new ApiError(400, "Comment not found");
  }

  if (req.user?._id.toString() !== findComment.owner.toString()) {
    throw new ApiError(400, "You are not owner of this comment");
  }

  const deleteComment = await Comment.findByIdAndDelete(commentId);

  if (!deleteComment) {
    throw new ApiError(400, "Cannot delete the Comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, deleteComment, "Commnet deleted succesfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
