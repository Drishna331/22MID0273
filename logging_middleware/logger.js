const axios = require("axios");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkcmlzaG5hLmIyMDIyQHZpdHN0dWRlbnQuYWMuaW4iLCJleHAiOjE3Nzg5MjY1MTQsImlhdCI6MTc3ODkyNTYxNCwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjQ0ZGM5YjhmLTllYjktNDBlNy04MjBiLTMzNjliZDAwOTkyYSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImRyaXNobmEgYiIsInN1YiI6ImJkZjQ3ZDBiLTc3ZDEtNDAzOC05YmU2LTI3OGUwNDNkODkwOCJ9LCJlbWFpbCI6ImRyaXNobmEuYjIwMjJAdml0c3R1ZGVudC5hYy5pbiIsIm5hbWUiOiJkcmlzaG5hIGIiLCJyb2xsTm8iOiIyMm1pZDAyNzMiLCJhY2Nlc3NDb2RlIjoiU2ZGdVdnIiwiY2xpZW50SUQiOiJiZGY0N2QwYi03N2QxLTQwMzgtOWJlNi0yNzhlMDQzZDg5MDgiLCJjbGllbnRTZWNyZXQiOiJ5a2padmdnVFFiU2dOY2JRIn0._9vtTTbI8RI_3fJYHELK7zNnlP09ZrosjdQBq4L_v3c";

async function Log(stack, level, package_name, message) {
  try {
    await axios.post(
      "http://4.224.186.213/evaluation-service/logs",
      {
        stack: stack,
        level: level,
        package: package_name,
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`[${level.toUpperCase()}] ${package_name}: ${message}`);
  } catch (error) {
    console.error("Log failed:", error.message);
  }
}

module.exports = { Log };