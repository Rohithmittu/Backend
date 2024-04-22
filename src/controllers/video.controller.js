import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  // console.log("Query Parameters:", req.query);

  // TODO: get all videos based on query, sort, pagination

  const videoAggregate = Video.aggregate([

    /// so don't just wait this because it will start fetching the information right away but we need
    //  to add page and limit so after adding it we need to fetch ,
    // so wait untill ((( aggregatePaginate ))) with options

    {
      $search: {     // inorder to search we set up the MOngo atlas to indexes as search-videos and add title and description for it so that we enable the search feature
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
  const { videoId } = req.params;
  //TODO: get video by id

});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
