import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../../middlewares/auth.js";
import {
  acceptRequest,
  createFriendRequest,
  deleteFriend,
  deleteRequest,
  getPublicActivity,
  getPublicBadgeCollection,
  getPublicProfileByUsername,
  getMyProfile,
  searchUsers,
  updateMyProfileIdentity,
  updateMyUsername,
  updateMyProfile,
  uploadMyAvatar,
  checkMyUsernameAvailability,
} from "./controller.js";


const profileRouter = Router();

const avatarUpload = multer({ storage: multer.memoryStorage() });

profileRouter.get("/me", requireAuth, getMyProfile);
profileRouter.patch("/me", requireAuth, updateMyProfile);
profileRouter.patch("/me/identity", requireAuth, updateMyProfileIdentity);
profileRouter.patch("/me/username", requireAuth, updateMyUsername);

profileRouter.get(
  "/me/username/availability",
  requireAuth,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  checkMyUsernameAvailability
);




// Frontend calls: POST /api/v1/profile/me/avatar with multipart field "avatar"
profileRouter.post("/me/avatar", requireAuth, avatarUpload.single("avatar"), uploadMyAvatar);

profileRouter.get("/search", requireAuth, searchUsers);
profileRouter.post("/friends/requests", requireAuth, createFriendRequest);
profileRouter.post("/friends/requests/:requestId/accept", requireAuth, acceptRequest);
profileRouter.delete("/friends/requests/:requestId", requireAuth, deleteRequest);
profileRouter.delete("/friends/:friendUserId", requireAuth, deleteFriend);

profileRouter.get("/:username/activity", getPublicActivity);
profileRouter.get("/:username/badges", getPublicBadgeCollection);
profileRouter.get("/:username", getPublicProfileByUsername);

export default profileRouter;
