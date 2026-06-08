import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    steps: [
      {
        site:   String,
        url:    String,
        title:  String,
        status: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("History", historySchema);