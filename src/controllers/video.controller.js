import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteImageFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  // console.log("Query Parameters:", req.query);

  // TODO: get all videos based on query, sort, pagination

  const videoAggregate = Video.aggregate([
    /// so don't just wait this because it will start fetching the information right away but we need
    //  to add page and limit so after adding it we need to fetch ,
    // so wait untill ((( aggregatePaginate ))) with options

    {
      $search: {
        // inorder to search we set up the MOngo atlas to indexes as search-videos and add title and description for it so that we enable the search feature
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    },

    {
      $match: {
        $and: [
          userId ? { owner: new mongoose.Types.ObjectId(userId) } : {},
          { isPublished: true },
        ],
      },
    },

    {
      $sort:
        sortBy && sortType
          ? {
              [sortBy]: sortType === "asc" ? 1 : -1,
            }
          : {
              createdAt: -1,
            },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    },
  ]);

  // console.log("Aggregation Pipeline:", JSON.stringify(videoAggregate, null, 2));

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  try {
    const video = await Video.aggregatePaginate(videoAggregate, options);
    // console.log("HEllloo Videossssss", video);
    return res
      .status(200)
      .json(new ApiResponse(200, video, "Videos fetched successfully"));
  } catch (error) {
    console.error("Aggregation Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "An error occurred"));
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // TODO: get video, upload to cloudinary, create video
  if (!(title || description)) {
    throw new ApiError(400, "Please provide all required fields");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;

  //   console.log(videoLocalPath);

  const thumbnailLocalPth = req.files?.thumbnail[0]?.path;
  //   console.log(thumbnailLocalPth);

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPth) {
    throw new ApiError(400, "thumbnail file is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  //   console.log(videoFile);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPth);
  //   console.log(thumbnail);

  const uploadVideo = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user?._id,
    duration: videoFile.duration,
  });

  if (!uploadVideo) {
    throw new ApiError(
      500,
      "Something went wrong while saving the video to database"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, uploadVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              isSubscribed: 1,
              subscribersCount: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        commentsCount: {
          $size: "$comments",
        },

        isliked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
        views: { $add: ["$views", 1] }, // adding viwes as soon as the video fetched
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        views: 1,
        likesCount: 1,
        isliked: 1,
        comments: 1,
        owner: 1,
        createdAt: 1,
        duration: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(400, "failed to fetch  video");
  }

  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video detailes fetched succesfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const { title, description, thumbnail, isPublished } = req.body;

  if (!title || !description || !isPublished) {
    throw new ApiError(400, "All fields are required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You cant edit this video,You are not owner");
  }

  const oldthumbnail = video.thumbnail;

  const newThumbnail = req.file?.path;

  if (!newThumbnail) {
    throw new ApiError(400, "Thumbnail required");
  }

  const uploadThumbnail = await uploadOnCloudinary(newThumbnail);

  if (!uploadThumbnail) {
    throw new ApiError(400, "Error while uploading thumbnail");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        isPublished,
        thumbnail: uploadThumbnail.url,
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(400, "Error while Updating  video");
  }

  if (updatedVideo) {
    const deleteoldThumbnai = await deleteImageFromCloudinary(oldthumbnail);
    /// after the update only delete should be done or else the old file will be deletd
    // and new file may fail them the video will not constain the thumnail

    if (!deleteoldThumbnai) {
      throw new ApiError(400, "Error while deleting thumbnail");
    }
  }

  return res
    .status(201)
    .json(new ApiResponse(200, updatedVideo, "videos Updataed succesfullly"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "you are not allowed to delete this video, You are not owner"
    );
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(400, "Error while deleting the video");
  }

  const thubnaildeletefromCloudinar = await deleteImageFromCloudinary(
    video.thumbnail
  );
  if (!thubnaildeletefromCloudinar) {
    throw new ApiError(
      400,
      "Error while deleting the thumbnail from cloudinary"
    );
  }
  const videofiledeletefromCloudinar = await deleteImageFromCloudinary(
    video.videoFile
  );
  if (!videofiledeletefromCloudinar) {
    throw new ApiError(
      400,
      "Error while deleting the videoFile from cloudinary"
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toogle publish status as you are not the owner"
    );
  }

  const toogglVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );
  // console.log(toogglVideo.isPublished)
  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        toogglVideo.isPublished,
        "video published succesfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
