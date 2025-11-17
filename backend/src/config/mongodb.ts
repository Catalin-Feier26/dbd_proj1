import mongoose from "mongoose";

export const connectMongoDB = async (): Promise<typeof mongoose | null> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI || mongoURI.includes("<username>")) {
      console.warn(
        "MongoDB URI not configured. Please set MONGODB_URI in .env file"
      );
      console.warn(
        "Migration and API will not work until MongoDB is configured"
      );
      return null;
    }

    await mongoose.connect(mongoURI, {
      dbName: process.env.MONGODB_DATABASE || "steam_games",
    });

    console.log("Connected to MongoDB Atlas");
    return mongoose;
  } catch (error) {
    console.error("MongoDB connection error:", (error as Error).message);
    throw error;
  }
};

mongoose.connection.on("error", (err: Error) => {
  console.error("MongoDB error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

export default connectMongoDB;
