import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { runAgent } from "./agent/agentRunner.js";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// ======================================================
// AGENT
// ======================================================

app.post(
  "/api/agent",
  async (req, res) => {
    try {
      const { task } =
        req.body;

      if (!task) {
        return res
          .status(400)
          .json({
            error:
              "Task required",
          });
      }

      console.log(
        `\n[NEW TASK]: ${task}`
      );

      const result =
        await runAgent(task);

      res.json(result);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Internal server error",
      });
    }
  }
);

// ======================================================
// START
// ======================================================

app.listen(PORT, () => {
  console.log(
    `\n🚀 Server running at http://localhost:${PORT}`
  );

  console.log(
    `📡 API Endpoint: POST http://localhost:${PORT}/api/agent`
  );
});