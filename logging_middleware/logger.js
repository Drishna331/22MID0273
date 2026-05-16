const axios = require("axios");

const CLIENT_ID = "bdf47d0b-77d1-4038-9be6-278e043d8908";
const CLIENT_SECRET = "ykjZvggTQbSgNcbQ";
const EMAIL = "drishna.b2022@vitstudent.ac.in";
const NAME = "drishna b";
const ROLL_NO = "22mid0273";
const ACCESS_CODE = "SfFuWg";

let token = null;

async function getToken() {
  try {
    const res = await axios.post(
      "http://4.224.186.213/evaluation-service/auth",
      {
        email: EMAIL,
        name: NAME,
        rollNo: ROLL_NO,
        accessCode: ACCESS_CODE,
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      }
    );
    token = res.data.access_token;
    return token;
  } catch (err) {
    console.error("[Log Failed] Auth failed:", err.message);
    throw err;
  }
}

async function Log(stack, level, package_name, message) {
  try {
    if (!token) await getToken();
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
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`[${level.toUpperCase()}] ${package_name}: ${message}`);
  } catch (error) {
    // If token is expired or unauthorized, refresh it and RETRY
    if (error.response && error.response.status === 401) {
      await getToken();
      // CRITICAL FIX: You MUST return this call so it doesn't fall through to the console.error block below!
      return await Log(stack, level, package_name, message);
    } else {
      console.error("Log failed:", error.message);
    }
  }
}

module.exports = { Log };