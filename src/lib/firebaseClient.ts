import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Enable long-polling for maximum compatibility in restricted environments (schools, enterprise networks)
// This resolves "Could not reach Cloud Firestore backend" errors by bypassing WebSocket/gRPC blocks.
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || "(default)",
);

export const auth = getAuth(app);
export default app;
