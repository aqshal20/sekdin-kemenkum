const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

async function testLocalLogin() {
  try {
    const res = await fetch("http://localhost:3000/api/login-peserta-bkn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "testpeserta", password: "demo" })
    });
    const data = await res.json();
    console.log("Local Login Status:", res.status);
    console.log("Local Login Response:", data);
  } catch (err) {
    console.error("Local login test error:", err.message);
  }
}

testLocalLogin();
