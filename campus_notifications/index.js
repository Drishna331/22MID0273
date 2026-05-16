const express = require("express");
const { Log } = require("../logging_middleware/logger");

const app = express();
app.use(express.json());

let notifications = {
  placements: [{ id: 1, title: "TCS Recruitment Drive", date: "2026-06-01" }],
  events: [{ id: 1, title: "Annual Cultural Fest", date: "2026-07-15" }],
  results: [{ id: 1, title: "Spring Semester Results", status: "Published" }]
};

app.get("/health", async (req, res) => {
  await Log("backend", "info", "route", "Health check hit");
  res.json({ status: "OK" });
});

app.get("/api/notifications", async (req, res) => {
  await Log("backend", "info", "route", "All notifications fetched");
  res.json(notifications);
});

app.get("/api/notifications/placements", async (req, res) => {
  await Log("backend", "info", "route", "Placements fetched");
  res.json(notifications.placements);
});

app.post("/api/notifications/placements", async (req, res) => {
  await Log("backend", "info", "handler", "New placement added");
  const { title, date } = req.body;
  const update = { id: notifications.placements.length + 1, title, date };
  notifications.placements.push(update);
  res.status(201).json({ message: "Placement added", update });
});

app.get("/api/notifications/events", async (req, res) => {
  await Log("backend", "info", "route", "Events fetched");
  res.json(notifications.events);
});

app.post("/api/notifications/events", async (req, res) => {
  await Log("backend", "info", "handler", "New event added");
  const { title, date } = req.body;
  const update = { id: notifications.events.length + 1, title, date };
  notifications.events.push(update);
  res.status(201).json({ message: "Event added", update });
});

app.get("/api/notifications/results", async (req, res) => {
  await Log("backend", "info", "route", "Results fetched");
  res.json(notifications.results);
});

app.post("/api/notifications/results", async (req, res) => {
  await Log("backend", "info", "handler", "New result added");
  const { title, status } = req.body;
  const update = { id: notifications.results.length + 1, title, status };
  notifications.results.push(update);
  res.status(201).json({ message: "Result added", update });
});

app.post("/notify", async (req, res) => {
  await Log("backend", "info", "handler", "Notify endpoint called");
  const { title, message } = req.body;
  if (!title || !message) {
    await Log("backend", "error", "handler", "Missing title or message");
    return res.status(400).json({ error: "title and message required" });
  }
  await Log("backend", "info", "service", `Notification sent: ${title}`);
  res.json({ success: true, notification: { title, message } });
});

app.listen(3000, async () => {
  await Log("backend", "info", "service", "Server started on port 3000");
  console.log("Server running on port 3000");
});