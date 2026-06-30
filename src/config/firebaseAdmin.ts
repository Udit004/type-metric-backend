import { getApp, getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.PROJECT_ID,
          clientEmail: process.env.CLIENT_EMAIL,
          privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      })
    : getApp();

export const messaging = getMessaging(app);