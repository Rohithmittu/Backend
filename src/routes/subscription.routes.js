import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:channelId")
        .post(toggleSubscription);
//     .get(getUserChannelSubscribers)
// router.route("/u/:subscriberId").get(getSubscribedChannels);  //to get info as instagram any one can see as public acoount

router.route("/u").get(getSubscribedChannels);
router.route("/c").get(getUserChannelSubscribers)  // to get info as youtube only owner can see

export default router;
