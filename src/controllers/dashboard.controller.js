import mongoose, { Mongoose } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const user = req.user?._id;

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(user),
      },
    },
    {
      $group: {
        _id: null,
        subscriber: {
          $sum: 1,
        },
      },
    },
  ]);

  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $project: {
        totalLikes: {
          $size: "$likes",
        },
        totalViews: 1,
        totalVideos: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: "$totalLikes",
          //   $sum: 1,
        },
        totalViews: {
          $sum: "$totalViews",
          //   $sum: 1,
        },
        totalVideos: {
          //   $sum:"$totalVideos"
          $sum: 1,
        },
      },
    },
  ]);

  console.log(subscribers);
  console.log(video);

  const channelStats = {
    subscribers: subscribers[0]?.subscriber,
    totalLikes: video[0].totalLikes,
    totalViews: video[0].totalViews,
    totalVideos: video[0].totalVideos,
  };

  return res.status(201).json(new ApiResponse(200, channelStats, "channel stats fecthed successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const user = req.user?.id;
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        createdAt: {
          $dateToParts: { date: "$createdAt" },
        },
        likesCount: {
          $size: "$likes",
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
        _id: 1,
        videofile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        createdAt: {
          year: 1,
          month: 1,
          day: 1,
        },
        isPublished: 1,
        likesCount: 1,
      },
    },
  ]);

  return res.status(201).json(new ApiResponse(200,videos,"Videos fetched successfully"))
});

export { getChannelStats, getChannelVideos };
