import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  // console.log(channelId);
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "channelId Invalid");
  }

  //   if (req.user?._id.toString() === channelId) {}

  const isSubscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (isSubscribed) {
    const deleteSubscriber = await Subscription.findByIdAndDelete(isSubscribed);

    return res
      .status(201)
      .json(
        new ApiResponse(200, deleteSubscriber, "Unsubscribed successfully")
      );
  }

  const subscribe = await Subscription.create({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (!subscribe) {
    throw new ApiError(400, "Error while subscribing channel");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, subscribe, "Subscribed to channel succesfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  //   const { channelId } = req.params;  // using this any one can see the subscribers who's logged in
  const channelId = req.user?._id; // so only owner can see all the subscribers

  // used according to usecase as instagram or as youtube

  //   console.log(channelId);

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Inavalid Channel Id");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        // localField: "channel",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              // foreignField: "subscriber",
              foreignField: "channel",
              as: "subscribedTo",
            },
          },
          {
            $addFields: {
              subscribedTo: {
                // $cond: {
                //     if: {
                //       $in: [channelId, "$subscribedTo.subscriber"],
                //     },
                //     then: true,
                //     else: false,
                //   },

                $in: [channelId, "$subscribedTo.channelId"], // check at last
              },
              subscribersCount: {
                $size: "$subscribedTo",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriber",
    },
    {
      $project: {
        subscriber: {
          // _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          subscribedTo: 1,
          subscribersCount: 1,
        },
      },
    },
  ]);
  // console.log(subscribedTo);

  if (!subscribers) {
    throw new ApiError(400, "Error while fetching UserSubscribers");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "subscribers fetched succcessfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  //   const { subscriberId } = req.params;
  const subscriberId = req.user?._id;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid SubscriberId");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
        pipeline: [
          {
            $lookup: {
              from: "videos",
              localField: "_id",
              foreignField: "owner",
              as: "videos",
            },
          },
          {
            $addFields: {
              latestVideo: {
                $last: "$videos",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribedChannel",
    },
    {
      $project: {
        subscribedChannel: {
          _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          latestVideo: {
            videoFile: 1,
            thumbnail: 1,
            owner: 1,
            title: 1,
            description: 1,
            duration: 1,
            createdAt: 1,
            views: 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched succesfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
