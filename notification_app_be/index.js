const express = require("express");
const { Log } = require("../logging_middleware/logger");

const app = express();
app.use(express.json());

// Health check route
app.get("/health", async (req, res) => {
  await Log("backend", "info", "route", "Health check endpoint hit");
  res.json({ status: "OK", message: "Server is running" });
});

// Notification route
app.post("/notify", async (req, res) => {
  await Log("backend", "info", "handler", "Notify endpoint called");
  const { title, message } = req.body;

  if (!title || !message) {
    await Log("backend", "error", "handler", "Missing title or message in request");
    return res.status(400).json({ error: "title and message are required" });
  }

  await Log("backend", "info", "service", `Notification sent: ${title}`);
  res.json({ success: true, notification: { title, message } });
});

app.listen(3000, async () => {
  await Log("backend", "info", "service", "Server started on port 3000");
  console.log("Server running on port 3000");
});