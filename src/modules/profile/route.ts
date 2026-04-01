import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import {
  acceptRequest,
  createFriendRequest,
  deleteFriend,
  deleteRequest,
  getMyProfile,
  searchUsers,
  updateMyProfile,
} from "./controller.js";

const profileRouter = Router();

profileRouter.use(requireAuth);
profileRouter.get("/me", getMyProfile);
profileRouter.patch("/me", updateMyProfile);
profileRouter.get("/search", searchUsers);
profileRouter.post("/friends/requests", createFriendRequest);
profileRouter.post("/friends/requests/:requestId/accept", acceptRequest);
profileRouter.delete("/friends/requests/:requestId", deleteRequest);
profileRouter.delete("/friends/:friendUserId", deleteFriend);

export default profileRouter;
