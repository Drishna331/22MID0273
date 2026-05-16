const axios = require("axios");
const { Log } = require("../logging_middleware/logger");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkcmlzaG5hLmIyMDIyQHZpdHN0dWRlbnQuYWMuaW4iLCJleHAiOjE3Nzg5MjgxNzMsImlhdCI6MTc3ODkyNzI3MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImI0ZmExNmRjLTIxNzctNDE5Ny1hY2U0LTAwMTIyNDZjZjY1YiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImRyaXNobmEgYiIsInN1YiI6ImJkZjQ3ZDBiLTc3ZDEtNDAzOC05YmU2LTI3OGUwNDNkODkwOCJ9LCJlbWFpbCI6ImRyaXNobmEuYjIwMjJAdml0c3R1ZGVudC5hYy5pbiIsIm5hbWUiOiJkcmlzaG5hIGIiLCJyb2xsTm8iOiIyMm1pZDAyNzMiLCJhY2Nlc3NDb2RlIjoiU2ZGdVdnIiwiY2xpZW50SUQiOiJiZGY0N2QwYi03N2QxLTQwMzgtOWJlNi0yNzhlMDQzZDg5MDgiLCJjbGllbnRTZWNyZXQiOiJ5a2padmdnVFFiU2dOY2JRIn0.SFTjngrgYEF6zQ03hX1DKaVjqVrre41qUMJCi44Id7I";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

// Fetch depots
async function fetchDepots() {
  await Log("backend", "info", "service", "Fetching depots from API");
  const res = await axios.get("http://4.224.186.213/evaluation-service/depots", { headers });
  await Log("backend", "info", "service", `Fetched ${res.data.depots.length} depots`);
  return res.data.depots;
}

// Fetch vehicles
async function fetchVehicles() {
  await Log("backend", "info", "service", "Fetching vehicles from API");
  const res = await axios.get("http://4.224.186.213/evaluation-service/vehicles", { headers });
  await Log("backend", "info", "service", `Fetched ${res.data.vehicles.length} vehicles`);
  return res.data.vehicles;
}

// Knapsack algorithm
function knapsack(vehicles, capacity) {
  const n = vehicles.length;
  const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const duration = vehicles[i - 1].Duration;
    const impact = vehicles[i - 1].Impact;
    for (let w = 0; w <= capacity; w++) {
      if (duration <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - duration] + impact);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Backtrack to find selected tasks
  let w = capacity;
  const selected = [];
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  return { maxImpact: dp[n][capacity], selectedTasks: selected };
}

// Main function
async function main() {
  await Log("backend", "info", "service", "Vehicle Maintenance Scheduler started");

  const depots = await fetchDepots();
  const vehicles = await fetchVehicles();

  for (const depot of depots) {
    await Log("backend", "info", "service", `Processing depot ID: ${depot.ID} with ${depot.MechanicHours} mechanic hours`);

    const { maxImpact, selectedTasks } = knapsack(vehicles, depot.MechanicHours);

    await Log("backend", "info", "service", `Depot ${depot.ID}: Max impact = ${maxImpact}, Tasks selected = ${selectedTasks.length}`);

    console.log(`\n=== Depot ${depot.ID} ===`);
    console.log(`Mechanic Hours Available: ${depot.MechanicHours}`);
    console.log(`Max Impact Score: ${maxImpact}`);
    console.log(`Selected Tasks (${selectedTasks.length}):`);
    selectedTasks.forEach(t => {
      console.log(`  - TaskID: ${t.TaskID} | Duration: ${t.Duration}h | Impact: ${t.Impact}`);
    });
  }

  await Log("backend", "info", "service", "Vehicle Maintenance Scheduler completed");
}

main().catch(async (err) => {
  await Log("backend", "fatal", "service", `Scheduler crashed: ${err.message}`);
  console.error(err);
});