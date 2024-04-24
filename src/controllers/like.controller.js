import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const isLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (isLiked) {
    const removelike = await Like.findByIdAndDelete(isLiked._id);

    return res
      .status(201)
      .json(new ApiResponse(200, removelike, "Video Like removed succesfully"));
  }

  const likeVideo = await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (!likeVideo) {
    throw new ApiError(400, "Error while likeing video");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, likeVideo, "Video liked Succesfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }
  const isLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (isLiked) {
    const removelike = await Like.findByIdAndDelete(isLiked._id);

    return res
      .status(201)
      .json(
        new ApiResponse(200, removelike, "comment Like removed succesfully")
      );
  }

  const likeComment = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (!likeComment) {
    throw new ApiError(400, "Error while likeing video");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, likeComment, "Comment liked Succesfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  // testing not done yet
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const isLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (isLiked) {
    const removelike = await Like.findByIdAndDelete(isLiked._id);

    return res
      .status(201)
      .json(new ApiResponse(200, removelike, "Tweet Like removed succesfully"));
  }

  const likeTweet = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (!likeTweet) {
    throw new ApiError(400, "Error while likeing video");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, likeTweet, "Tweet liked Succesfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const user = req.user?._id;
  if (!isValidObjectId(user)) {
    throw new ApiError(400, "Inavalid User");
  }
  const likedVideosAggregate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(user),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  if (!likedVideosAggregate) {
    throw new ApiError(400, "Error while fetching Liked Videos");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        likedVideosAggregate,
        "Liked Videos Fetched succesfully"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
