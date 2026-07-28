const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

async function testBKN() {
  const baseUrl = process.env.BKN_BASE_URL || "https://api-rekrutmen.bkn.go.id/ws";
  const username = process.env.BKN_CLIENT_USERNAME;
  const password = process.env.BKN_CLIENT_PASSWORD;

  console.log("Testing BKN Token Connection...");
  console.log("Base URL:", baseUrl);
  console.log("Client Username:", username);

  const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const tokenUrl = `${baseUrl.replace(/\/$/, "")}/oauth/token`;
    console.log("Token URL:", tokenUrl);

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error connecting to BKN API:", err);
  }
}

testBKN();
