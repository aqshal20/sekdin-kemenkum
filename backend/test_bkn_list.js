const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

async function testParams() {
  const baseUrl = (process.env.BKN_BASE_URL || "https://api-rekrutmen.bkn.go.id/ws").replace(/\/$/, "");
  const username = process.env.BKN_CLIENT_USERNAME;
  const password = process.env.BKN_CLIENT_PASSWORD;

  const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
  const tokenRes = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.data.access_token;
  console.log("Token acquired.");

  const paramCombinations = [
    "?instansiCepatKode=3004",
    "?instansiCepatKode=3004&page=1",
    "?instansiCepatKode=3004&page=1&tahap=1",
    "?instansiCepatKode=3004&page=1&periode=1&jenisPengadaanId=5&tahap=1",
    "/listbytgldaftar?instansiCepatKode=3004&page=1&periode=1&jenisPengadaanId=5&tahap=1&tglDaftar=27-07-2026",
    "/listbytgldaftar?instansiCepatKode=3004&page=1&tglDaftar=27-07-2026"
  ];

  for (const params of paramCombinations) {
    const isByTgl = params.startsWith("/listbytgldaftar");
    const url = isByTgl 
      ? `${baseUrl}/api/dikdin/pendaftaran${params}`
      : `${baseUrl}/api/dikdin/pendaftaran/list${params}`;
    
    try {
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.status}, Code: ${data.code}, Msg: ${data.message}`);
      if (data.data) {
        console.log("Data snippet:", JSON.stringify(data.data).slice(0, 200));
      }
    } catch (err) {
      console.error("Fetch err:", err.message);
    }
  }
}

testParams();
