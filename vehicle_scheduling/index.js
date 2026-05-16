const express = require("express");
const axios = require("axios");
const { Log } = require("../logging_middleware/logger");

const app = express();
const PORT = 3001;

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkcmlzaG5hLmIyMDIyQHZpdHN0dWRlbnQuYWMuaW4iLCJleHAiOjE3Nzg5MzEzNDMsImlhdCI6MTc3ODkzMDQ0MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImYwZDA4MTZlLWUxYzEtNDFmZS1hMWM5LTcwMmQzYjk2MGY2NyIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImRyaXNobmEgYiIsInN1YiI6ImJkZjQ3ZDBiLTc3ZDEtNDAzOC05YmU2LTI3OGUwNDNkODkwOCJ9LCJlbWFpbCI6ImRyaXNobmEuYjIwMjJAdml0c3R1ZGVudC5hYy5pbiIsIm5hbWUiOiJkcmlzaG5hIGIiLCJyb2xsTm8iOiIyMm1pZDAyNzMiLCJhY2Nlc3NDb2RlIjoiU2ZGdVdnIiwiY2xpZW50SUQiOiJiZGY0N2QwYi03N2QxLTQwMzgtOWJlNi0yNzhlMDQzZDg5MDgiLCJjbGllbnRTZWNyZXQiOiJ5a2padmdnVFFiU2dOY2JRIn0.rtpdfPRmTK46IvaT67YTLk2k2ZTfYeP6Bfetxjabwj8";
const headers = { Authorization: `Bearer ${TOKEN}` };

// Knapsack algorithm
function knapsack(tasks, maxHours) {
  const dp = new Array(maxHours + 1).fill(0);
  const keep = Array.from({ length: maxHours + 1 }, () => []);

  for (let i = 0; i < tasks.length; i++) {
    const { TaskID, Duration, Impact } = tasks[i];
    for (let w = maxHours; w >= Duration; w--) {
      if (dp[w - Duration] + Impact > dp[w]) {
        dp[w] = dp[w - Duration] + Impact;
        keep[w] = [...keep[w - Duration], TaskID];
      }
    }
  }
  return { maxImpact: dp[maxHours], selectedTasks: keep[maxHours] };
}

// Schedule endpoint
app.get("/api/schedule/:depotId", async (req, res) => {
  await Log("backend", "info", "route", `Schedule request for depot ${req.params.depotId}`);
  try {
    const depotId = parseInt(req.params.depotId);

    const [depotsRes, vehiclesRes] = await Promise.all([
      axios.get("http://4.224.186.213/evaluation-service/depots", { headers }),
      axios.get("http://4.224.186.213/evaluation-service/vehicles", { headers }),
    ]);

    const depot = depotsRes.data.depots.find(d => d.ID === depotId);
    if (!depot) {
      await Log("backend", "error", "handler", `Depot ${depotId} not found`);
      return res.status(404).json({ error: "Depot not found" });
    }

    await Log("backend", "info", "service", `Running knapsack for depot ${depotId} with ${depot.MechanicHours} hours`);
    const result = knapsack(vehiclesRes.data.vehicles, depot.MechanicHours);
    await Log("backend", "info", "service", `Max impact for depot ${depotId}: ${result.maxImpact}`);

    res.json({
      depotId,
      availableMechanicHours: depot.MechanicHours,
      optimizedImpactScore: result.maxImpact,
      tasksToSchedule: result.selectedTasks,
    });
  } catch (err) {
    await Log("backend", "fatal", "handler", `Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  await Log("backend", "info", "service", `Vehicle scheduler running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});