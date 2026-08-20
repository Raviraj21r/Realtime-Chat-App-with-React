import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    const { MONGO_URI } = ENV;
    if (!MONGO_URI) throw new Error("MONGO_URI is not set");

    const conn = await mongoose.connect(ENV.MONGO_URI);
    const relationshipCollection = conn.connection.collections.relationships;
    if (relationshipCollection) {
      const indexes = await relationshipCollection.listIndexes().toArray();
      const legacyIndexes = indexes.filter((index) => {
        const keys = Object.keys(index.key || {});
        return keys.includes("followerId") || keys.includes("followingId");
      });

      for (const index of legacyIndexes) {
        await relationshipCollection.dropIndex(index.name);
        console.log("Removed legacy relationship index:", index.name);
      }
    }

    console.log("MONGODB CONNECTED:", conn.connection.host);
  } catch (error) {
    console.error("Error connection to MONGODB:", error);
    process.exit(1); // 1 status code means fail, 0 means success
  }
};
