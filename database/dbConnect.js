import mongoose from "mongoose";

let isConnected = false; // Track the connection status globally

const DBconnect = async () => {
  if (isConnected) {
    // Use existing DB connection
    return;
  }

  try {
    await mongoose.connect(process.env.DB_URL, {
      dbName: "your-db-name", // optional, replace if needed
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export default DBconnect;
