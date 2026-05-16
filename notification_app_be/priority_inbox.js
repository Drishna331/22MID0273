const axios = require("axios");
const { Log } = require("../logging_middleware/logger");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkcmlzaG5hLmIyMDIyQHZpdHN0dWRlbnQuYWMuaW4iLCJleHAiOjE3Nzg5MjgxNzMsImlhdCI6MTc3ODkyNzI3MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImI0ZmExNmRjLTIxNzctNDE5Ny1hY2U0LTAwMTIyNDZjZjY1YiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImRyaXNobmEgYiIsInN1YiI6ImJkZjQ3ZDBiLTc3ZDEtNDAzOC05YmU2LTI3OGUwNDNkODkwOCJ9LCJlbWFpbCI6ImRyaXNobmEuYjIwMjJAdml0c3R1ZGVudC5hYy5pbiIsIm5hbWUiOiJkcmlzaG5hIGIiLCJyb2xsTm8iOiIyMm1pZDAyNzMiLCJhY2Nlc3NDb2RlIjoiU2ZGdVdnIiwiY2xpZW50SUQiOiJiZGY0N2QwYi03N2QxLTQwMzgtOWJlNi0yNzhlMDQzZDg5MDgiLCJjbGllbnRTZWNyZXQiOiJ5a2padmdnVFFiU2dOY2JRIn0.SFTjngrgYEF6zQ03hX1DKaVjqVrre41qUMJCi44Id7I";

const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function getPriorityScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0;
  const timestamp = new Date(notification.Timestamp).getTime();
  return weight * 1e12 + timestamp;
}

async function fetchNotifications() {
  await Log("backend", "info", "service", "Fetching notifications from API");
  const res = await axios.get(
    "http://4.224.186.213/evaluation-service/notifications",
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  await Log("backend", "info", "service", `Fetched ${res.data.notifications.length} notifications`);
  return res.data.notifications;
}

function getTop10(notifications) {
  const scored = notifications.map((n) => ({
    ...n,
    priorityScore: getPriorityScore(n),
  }));

  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  return scored.slice(0, 10);
}

async function main() {
  await Log("backend", "info", "service", "Priority Inbox started");

  const notifications = await fetchNotifications();
  const top10 = getTop10(notifications);

  await Log("backend", "info", "service", "Top 10 priority notifications calculated");

  console.log("\n=== TOP 10 PRIORITY NOTIFICATIONS ===\n");
  top10.forEach((n, i) => {
    console.log(`${i + 1}. [${n.Type}] ${n.Message} — ${n.Timestamp}`);
  });

  await Log("backend", "info", "service", "Priority Inbox completed");
}

main().catch(async (err) => {
  await Log("backend", "fatal", "service", `Priority Inbox crashed: ${err.message}`);
  console.error(err);
});