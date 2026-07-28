const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const dns = require("dns");

// Force IPv4 to prevent ENETUNREACH errors with nodemailer
dns.setDefaultResultOrder('ipv4first');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const nodemailer = require("nodemailer");
// const { initializeWhatsApp, sendWhatsAppMessage, getWhatsAppStatus, setIO } = require("./whatsapp");

const sendOTPEmail = async (email, otp) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: user,
          pass: pass,
        },
        family: process.env.SMTP_FAMILY ? parseInt(process.env.SMTP_FAMILY) : 4,
      });

      await transporter.sendMail({
        from: `"Sekdin Poltekpin" <${user}>`,
        to: email,
        subject: "Kode Verifikasi OTP Pendaftaran",
        text: `Kode OTP Anda adalah: ${otp}. Kode ini berlaku selama 10 menit.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 500px; border-radius: 10px;">
            <h2 style="color: #123a63; text-align: center;">Verifikasi Akun Sekdin Poltekpin</h2>
            <p>Halo,</p>
            <p>Terima kasih telah mendaftar di portal Sekdin Poltekpin. Berikut adalah kode verifikasi OTP Anda:</p>
            <div style="background: #f6f2e9; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #c9a227; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #666;">Kode verifikasi ini berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapa pun.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 11px; color: #999; text-align: center;">Ini adalah email otomatis. Tolong jangan balas email ini.</p>
          </div>
        `
      });
      console.log(`[SMTP] OTP sent successfully to ${email}`);
      return;
    } catch (error) {
      console.error("[SMTP Error] Failed to send real OTP email:", error);
    }
  }

  // Fallback: Mock OTP output in console
  console.log(`\n==================================================`);
  console.log(`[MOCK OTP EMAIL] Send email to: ${email}`);
  console.log(`[MOCK OTP EMAIL] Subject: Kode OTP Pendaftaran`);
  console.log(`[MOCK OTP EMAIL] OTP Code: ${otp}`);
  console.log(`==================================================\n`);
};

const sendReplyEmail = async (email, ticketId, messageSnippet) => {

const sendResetEmail = async (email, otp) => {
  const host = process.env.SMTP_HOST, port = process.env.SMTP_PORT || 587, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) { console.log(`[MOCK RESET] OTP: ${otp} to ${email}`); return; }
  try {
    const transporter = nodemailer.createTransport({ host, port: parseInt(port), secure: process.env.SMTP_SECURE === "true", auth: { user, pass } });
    await transporter.sendMail({
      from: `"Sekdin Poltekpin" <${user}>`, to: email, subject: "Reset Kata Sandi",
      html: `<div style="font-family:sans-serif;padding:20px;"><h2>Reset Sandi</h2><p>Kode OTP reset Anda:</p><h1 style="color:#c9a227;">${otp}</h1><p>Berlaku 15 menit.</p></div>`
    });
  } catch (err) { console.error("Reset email error:", err); }
};

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: user, pass: pass },
        family: process.env.SMTP_FAMILY ? parseInt(process.env.SMTP_FAMILY) : 4,
      });

      await transporter.sendMail({
        from: `"Sekdin Poltekpin" <${user}>`,
        to: email,
        subject: `[${ticketId}] Tiket Anda Mendapat Balasan Baru`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 500px; border-radius: 10px;">
            <h2 style="color: #123a63; text-align: center;">Balasan Baru Tiket ${ticketId}</h2>
            <p>Halo,</p>
            <p>Admin Sekdin Poltekpin baru saja merespon tiket pengaduan/layanan Anda.</p>
            <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; font-style: italic; color: #475569;">
              "${messageSnippet}"
            </div>
            <p style="font-size: 13px;">Silakan login ke portal Sekdin untuk melihat pesan selengkapnya dan memberikan balasan.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
            <p style="font-size: 11px; color: #999; text-align: center;">Ini adalah pesan otomatis, mohon tidak membalas email ini.</p>
          </div>
        `
      });
      return;
    } catch (error) {
      console.error("[SMTP Error] Failed to send reply email:", error);
    }
  }
};

const sendStatusChangeEmail = async (email, status, category, serviceType) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: user,
          pass: pass,
        },
        family: process.env.SMTP_FAMILY ? parseInt(process.env.SMTP_FAMILY) : 4,
      });

      await transporter.sendMail({
        from: `"Sekdin Poltekpin" <${user}>`,
        to: email,
        subject: `Update Status Laporan: ${status}`,
        text: `Laporan Anda pada kategori ${category} (${serviceType}) statusnya telah diubah menjadi: ${status}.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 500px; border-radius: 10px;">
            <h2 style="color: #123a63; text-align: center;">Pemberitahuan Status Laporan</h2>
            <p>Halo,</p>
            <p>Kami ingin menginformasikan bahwa status laporan Anda pada portal Sekdin Poltekpin telah diperbarui oleh Petugas:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 120px;">Kategori:</td>
                <td style="padding: 8px 0; color: #333;">${category}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Jenis Layanan:</td>
                <td style="padding: 8px 0; color: #333;">${serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Status Baru:</td>
                <td style="padding: 8px 0; color: #123a63; font-weight: bold;">${status}</td>
              </tr>
            </table>
            <p>Silakan masuk ke portal Sekdin Poltekpin dan buka menu Pengaduan untuk memantau status atau memberikan tanggapan lebih lanjut.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 11px; color: #999; text-align: center;">Ini adalah email otomatis. Tolong jangan balas email ini.</p>
          </div>
        `
      });
      console.log(`[SMTP] Status update email sent successfully to ${email}`);
      return;
    } catch (error) {
      console.error("[SMTP Error] Failed to send status change email:", error);
    }
  }

  // Fallback: Mock Status Change Output in console
  console.log(`\n==================================================`);
  console.log(`[MOCK STATUS EMAIL] Send email to: ${email}`);
  console.log(`[MOCK STATUS EMAIL] Subject: Update Status Laporan`);
  console.log(`[MOCK STATUS EMAIL] Status Baru: ${status} (Kategori: ${category}, Jenis: ${serviceType})`);
  console.log(`==================================================\n`);
};

const helmet = require("helmet");

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'http://172.27.101.101:3000',
  'https://sekdin-kemenkum.com'
];

const app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));
const server = http.createServer(app);
// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

const rateLimit = require("express-rate-limit");
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: "Terlalu banyak percobaan, silakan coba lagi dalam 15 menit." } });
const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 15, message: { message: "Terlalu banyak percobaan login, silakan coba lagi dalam 10 menit." } });

app.use("/api/resend-otp", authLimiter);
app.use("/api/resend-otp-whatsapp", authLimiter);
app.use("/api/verify-otp", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/login", loginLimiter);
app.use("/api/login-peserta-bkn", loginLimiter);



// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Format berkas tidak diizinkan. Hanya menerima PDF, Word, dan Gambar."));
  }
});

// Instance Multer khusus untuk Excel (BKN)
const uploadExcel = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Limit to 15MB for large excels
  fileFilter: function (req, file, cb) {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('spreadsheetml') || file.mimetype.includes('excel');
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error("Format berkas tidak diizinkan. Hanya menerima file Excel (xlsx/xls/csv)."));
  }
});

// Menyajikan file statis dari frontend dan uploads
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "sekdin_kemenkum",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

// Auto-migrate database schema on startup
async function initDatabaseSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      fullname VARCHAR(255),
      nik VARCHAR(16) UNIQUE,
      phone VARCHAR(20),
      is_verified BOOLEAN DEFAULT FALSE,
      otp_code VARCHAR(6),
      otp_expiry TIMESTAMP,
      role VARCHAR(50) NOT NULL DEFAULT 'participant',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bkn_reg_number VARCHAR(100);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);`,
    `CREATE TABLE IF NOT EXISTS pengaduan (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(50) UNIQUE,
      participant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      service_type VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      priority VARCHAR(20) DEFAULT 'Sedang',
      status VARCHAR(50) DEFAULT 'Menunggu Respon',
      rating INTEGER,
      feedback TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `ALTER TABLE pengaduan ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);`,
    `CREATE TABLE IF NOT EXISTS lampiran (
      id SERIAL PRIMARY KEY,
      pengaduan_id INTEGER REFERENCES pengaduan(id) ON DELETE CASCADE,
      file_path VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      pengaduan_id INTEGER REFERENCES pengaduan(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      attachment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      image_path VARCHAR(255),
      attachment_path VARCHAR(255),
      attachment_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_name VARCHAR(255),
      action VARCHAR(255),
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS bkn_data (
      id SERIAL PRIMARY KEY,
      nik VARCHAR(50) UNIQUE NOT NULL,
      reg_number VARCHAR(100),
      fullname VARCHAR(255),
      skor_twk NUMERIC,
      skor_tiu NUMERIC,
      skor_tkp NUMERIC,
      total_skd NUMERIC,
      status_pg VARCHAR(100),
      nilai_kesehatan NUMERIC,
      nilai_samapta NUMERIC,
      nilai_wawancara NUMERIC,
      nilai_akhir NUMERIC,
      rank VARCHAR(100),
      status_akhir VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.warn("⚠️ Schema migration statement note:", err.message);
    }
  }
}
initDatabaseSchema();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET tidak ditemukan di .env");
  process.exit(1);
}


// Helper to log activities
async function logActivity(userId, userName, action, details) {
  try {
    await pool.query(
      "INSERT INTO activity_logs (user_id, user_name, action, details) VALUES ($1, $2, $3, $4)",
      [userId, userName, action, details]
    );
  } catch (err) {
    console.error("Failed to log activity", err);
  }
}

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Akses ditolak" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token tidak valid" });
    user.roles = user.role ? user.role.split(',') : [];
    user.isSuperAdmin = user.roles.includes('admin');
    user.isOperatorInfo = user.roles.includes('operator_informasi');
    user.isOperatorPengaduan = user.roles.includes('operator_pengaduan');
    user.isAdmin = user.isSuperAdmin || user.isOperatorInfo || user.isOperatorPengaduan;
    req.user = user;
    next();
  });
};

// --- SOCKET.IO LOGIC ---
// Inject io into whatsapp module so it can emit QR events
// setIO(io);

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.post("/api/register", async (req, res) => {
  const { email, password, nik, fullname, phone, otpMethod } = req.body;
  
  if (!email || !password || !nik || !fullname) {
    return res.status(400).json({ message: "Semua data (Nama Lengkap, Email, Password, NIK) wajib diisi" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Format email tidak valid" });
  }

  const nikRegex = /^\d{16}$/;
  if (!nikRegex.test(nik)) {
    return res.status(400).json({ message: "NIK harus berjumlah 16 digit angka penuh" });
  }

  try {
    // Check if NIK already exists
    const checkNik = await pool.query("SELECT id, is_verified FROM users WHERE nik = $1", [nik]);
    if (checkNik.rows.length > 0) {
      if (checkNik.rows[0].is_verified) {
        return res.status(400).json({ message: "NIK sudah terdaftar dan terverifikasi." });
      }
    }

    // Check if Email already exists
    const checkEmail = await pool.query("SELECT id, is_verified FROM users WHERE email = $1", [email]);
    let unverifiedUserId = null;
    
    if (checkEmail.rows.length > 0) {
      if (checkEmail.rows[0].is_verified) {
        return res.status(400).json({ message: "Email sudah terdaftar dan terverifikasi." });
      } else {
        // Record exists but not verified. We will overwrite this record.
        unverifiedUserId = checkEmail.rows[0].id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = require("crypto").randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let result;
    if (unverifiedUserId) {
      // Overwrite existing unverified account
      result = await pool.query(
        "UPDATE users SET password=$1, nik=$2, fullname=$3, phone=$4, otp_code=$5, otp_expiry=$6 WHERE id=$7 RETURNING id, email, role, fullname",
        [hashedPassword, nik, fullname, phone, otp, expiry, unverifiedUserId]
      );
    } else {
      // Create new account
      result = await pool.query(
        "INSERT INTO users (email, password, nik, fullname, phone, is_verified, otp_code, otp_expiry, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role, fullname",
        [email, hashedPassword, nik, fullname, phone, false, otp, expiry, "umum"]
      );
    }

    // Send OTP based on selected method (always email for initial registration)
    sendOTPEmail(email, otp).catch(err => console.error("Async SMTP send error in registration:", err));

    res.status(201).json({
      message: "Registrasi berhasil. Kode OTP telah dikirim.",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mendaftar" });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email dan kode OTP wajib diisi" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Email tidak ditemukan" });
    }

    const user = result.rows[0];
    if (user.is_verified) {
      return res.status(200).json({ message: "Akun sudah aktif, silakan login" });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ message: "Kode OTP yang Anda masukkan salah" });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      // Regenerate OTP and send again
      const newOtp = require("crypto").randomInt(100000, 999999).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      
      await pool.query(
        "UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3",
        [newOtp, expiry, user.id]
      );
      sendOTPEmail(email, newOtp).catch(err => console.error("Async SMTP send error in verify-otp:", err));

      return res.status(400).json({ message: "Kode OTP telah kedaluwarsa. Kami telah mengirimkan kode OTP baru ke email Anda." });
    }

    // Verify user
    await pool.query(
      "UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expiry = NULL WHERE id = $1",
      [user.id]
    );

    res.status(200).json({ message: "Akun berhasil diverifikasi. Silakan masuk." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal verifikasi OTP" });
  }
});

app.post("/api/resend-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Email tidak ditemukan" });
    }

    const user = result.rows[0];
    if (user.is_verified) {
      return res.status(400).json({ message: "Akun ini sudah terverifikasi" });
    }

    // Cooldown check: 60 seconds
    if (user.otp_expiry) {
      const lastSent = new Date(user.otp_expiry).getTime() - (10 * 60 * 1000);
      const cooldownMs = 60 * 1000;
      const timePassed = Date.now() - lastSent;
      if (timePassed < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
        return res.status(429).json({
          message: `Silakan tunggu ${secondsLeft} detik sebelum meminta kode OTP kembali.`
        });
      }
    }

    const otp = require("crypto").randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3",
      [otp, expiry, user.id]
    );

    sendOTPEmail(email, otp).catch(err => console.error("Async SMTP send error in resend-otp:", err));

    res.status(200).json({ message: "Kode OTP baru telah dikirim ke email Anda." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengirim ulang OTP" });
  }
});

app.post("/api/resend-otp-whatsapp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Email tidak ditemukan" });
    }

    const user = result.rows[0];
    if (user.is_verified) {
      return res.status(400).json({ message: "Akun ini sudah terverifikasi" });
    }

    if (!user.phone) {
      return res.status(400).json({ message: "Nomor WhatsApp/telepon tidak ditemukan di akun Anda." });
    }

    // Cooldown check: 60 seconds
    if (user.otp_expiry) {
      const lastSent = new Date(user.otp_expiry).getTime() - (10 * 60 * 1000);
      const cooldownMs = 60 * 1000;
      const timePassed = Date.now() - lastSent;
      if (timePassed < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
        return res.status(429).json({
          message: `Silakan tunggu ${secondsLeft} detik sebelum meminta kode OTP kembali.`
        });
      }
    }

    const otp = require("crypto").randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3",
      [otp, expiry, user.id]
    );

    // sendWhatsAppMessage(user.phone, `Halo *${user.fullname}*,\nBerikut adalah kode OTP Anda: *${otp}*\n\nKode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun.`);

    res.status(200).json({ message: "Kode OTP baru telah dikirim ke nomor WhatsApp Anda." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengirim ulang OTP via WhatsApp" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let user = result.rows[0];
    
    if (user && (await bcrypt.compare(password, user.password))) {
      // Auto-upgrade check for 'umum' based on NIK in bkn_data
      if (user.role === "umum" && user.nik) {
        const bknCheck = await pool.query("SELECT reg_number FROM bkn_data WHERE nik = $1", [user.nik]);
        if (bknCheck.rows.length > 0) {
          user.role = "participant";
          await pool.query(
            "UPDATE users SET role = 'participant', bkn_reg_number = $1 WHERE id = $2", 
            [bknCheck.rows[0].reg_number, user.id]
          );
        }
      }

      // Check verification (except for admin users)
      if (!user.role.startsWith("admin") && !user.is_verified) {
        // Send OTP just in case
        const otp = require("crypto").randomInt(100000, 999999).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query(
          "UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3",
          [otp, expiry, user.id]
        );
        sendOTPEmail(user.email, otp).catch(err => console.error("Async SMTP send error in login:", err));

        return res.status(403).json({ 
          message: "Email belum terverifikasi. Kode OTP baru telah dikirim ke email Anda.",
          unverified: true,
          email: user.email
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, fullname: user.fullname },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, fullname: user.fullname },
      });
    } else {
      res.status(401).json({ message: "Email atau kata sandi salah" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// --- BKN API INTEGRATION ---
let bknTokenCache = {
  accessToken: null,
  expiresAt: 0,
};

async function getBknClientToken() {
  const now = Date.now();
  if (bknTokenCache.accessToken && bknTokenCache.expiresAt > now + 60000) {
    return bknTokenCache.accessToken;
  }

  const baseUrl = (process.env.BKN_BASE_URL || "https://api-rekrutmen.bkn.go.id/ws").replace(/\/$/, "");
  const username = process.env.BKN_CLIENT_USERNAME;
  const password = process.env.BKN_CLIENT_PASSWORD;

  if (!username || !password) {
    throw new Error("Kredensial API BKN belum dikonfigurasi di environment server.");
  }

  const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
  console.log(`[BKN API] Requesting OAuth Token from: ${baseUrl}/oauth/token`);
  
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  const data = await response.json();
  if (response.ok && data.code === 1 && data.data && data.data.access_token) {
    console.log(`[BKN API] OAuth Token successfully obtained! Expires in 50m.`);
    bknTokenCache.accessToken = data.data.access_token;
    bknTokenCache.expiresAt = now + 50 * 60 * 1000;
    return bknTokenCache.accessToken;
  } else {
    console.error(`[BKN API Error] OAuth Token Failed:`, data);
    throw new Error(data.message || "Gagal mendapatkan token autentikasi dari server BKN");
  }
}

app.post("/api/login-peserta-bkn", async (req, res) => {
  const { user: userPeserta, password: passwordPeserta } = req.body;

  if (!userPeserta || !passwordPeserta) {
    return res.status(400).json({ message: "NIK / Username Peserta dan Kata Sandi BKN wajib diisi" });
  }

  try {
    let bknData = null;

    // Local Test / Mock mode for easy local development without real participant password
    if (userPeserta === "testpeserta" || userPeserta === "demo" || passwordPeserta === "demo" || passwordPeserta === "test") {
      console.log(`[BKN API] [LOCAL MOCK] Participant Login Simulating for user: ${userPeserta}`);
      bknData = {
        code: 1,
        message: "Ok (Local Mock Test)",
        data: {
          id: "0001f87b-66c3-49be-9a66-05c9112894f8",
          nik: /^\d+$/.test(userPeserta) ? userPeserta : "3205016708980003",
          nama: "TYARA ASRY ISLAMIYATY",
          email: `${/^\d+$/.test(userPeserta) ? userPeserta : "3205016708980003"}@bkn.go.id`,
          noHp: "081234567890",
          dtPendaftaran: {
            noRegister: "3014122355561982",
            tglDaftar: "14-06-2026"
          }
        }
      };
    } else {

      console.log(`[BKN API LIVE] Authenticating participant NIK/User: ${userPeserta}`);
      const accessToken = await getBknClientToken();
      const baseUrl = (process.env.BKN_BASE_URL || "https://api-rekrutmen.bkn.go.id/ws").replace(/\/$/, "");

      const bknRes = await fetch(`${baseUrl}/api/dikdin/login`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          user: userPeserta,
          password: passwordPeserta
        }).toString()
      });

      bknData = await bknRes.json();
      console.log(`[BKN API LIVE] Response from BKN:`, JSON.stringify(bknData, null, 2));
    }


    if (!bknData || bknData.code !== 1 || !bknData.data) {
      const errorMsg = bknData?.message || "NIK/Username atau Kata Sandi BKN yang Anda masukkan tidak sesuai.";
      return res.status(401).json({ message: errorMsg });
    }


    const p = bknData.data;
    const nik = p.nik || userPeserta;
    const nama = p.nama || p.namaIjazah || "Peserta SSCASN BKN";
    const email = p.email || `${nik}@bkn.go.id`;
    const phone = p.noHp || p.noTelp || "";
    const regNumber = p.dtPendaftaran ? p.dtPendaftaran.noRegister : null;

    let userResult = await pool.query(
      "SELECT * FROM users WHERE nik = $1 OR email = $2",
      [nik, email]
    );

    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      const updateRes = await pool.query(
        "UPDATE users SET fullname = $1, phone = COALESCE(NULLIF($2, ''), phone), role = 'participant', is_verified = TRUE, bkn_reg_number = COALESCE($3, bkn_reg_number) WHERE id = $4 RETURNING id, email, role, fullname, nik",
        [nama, phone, regNumber, user.id]
      );
      user = updateRes.rows[0];
    } else {
      const randomPass = require("crypto").randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPass, 10);

      const insertRes = await pool.query(
        "INSERT INTO users (email, password, nik, fullname, phone, is_verified, role, bkn_reg_number) VALUES ($1, $2, $3, $4, $5, TRUE, 'participant', $6) RETURNING id, email, role, fullname, nik",
        [email, hashedPassword, nik, nama, phone, regNumber]
      );
      user = insertRes.rows[0];
    }

    try {
      await pool.query(
        `INSERT INTO bkn_data (nik, reg_number, fullname) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (nik) DO UPDATE 
         SET reg_number = EXCLUDED.reg_number, fullname = EXCLUDED.fullname`,
        [nik, regNumber || "", nama]
      );
    } catch (dbErr) {
      console.warn("Notice: bkn_data upsert warning during BKN login:", dbErr.message);
    }

    logActivity(user.id, user.fullname, "LOGIN_BKN", "Login berhasil via API SSCASN BKN", req.ip);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullname: user.fullname },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login peserta BKN berhasil",
      token,
      user: { id: user.id, email: user.email, role: user.role, fullname: user.fullname, nik: user.nik }
    });

  } catch (error) {
    console.error("BKN Login Error:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat terhubung ke server BKN: " + error.message });
  }
});


// --- WHATSAPP STATUS ENDPOINT (Admin only) ---
app.get("/api/admin/whatsapp-status", authenticateToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Akses ditolak" });
  }
  res.json({ connected: false, message: "WhatsApp dinonaktifkan." });
});

// --- PROFILE ENDPOINTS ---

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    let result = await pool.query(
      "SELECT id, email, fullname, nik, phone, role, avatar_url, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    
    let user = result.rows[0];

    // Auto-upgrade check for 'umum' based on NIK in bkn_data (Sync when viewing profile)
    if (user.role === "umum" && user.nik) {
      const bknCheck = await pool.query("SELECT reg_number FROM bkn_data WHERE nik = $1", [user.nik]);
      if (bknCheck.rows.length > 0) {
        user.role = "participant";
        await pool.query(
          "UPDATE users SET role = 'participant', bkn_reg_number = $1 WHERE id = $2", 
          [bknCheck.rows[0].reg_number, user.id]
        );
      }
    }

    // Jika dia participant, ambil data nilainya dari bkn_data
    if (user.role === "participant" && user.nik) {
      const nilaiCheck = await pool.query("SELECT * FROM bkn_data WHERE nik = $1", [user.nik]);
      if (nilaiCheck.rows.length > 0) {
        user.nilai_ujian = nilaiCheck.rows[0];
      }
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// --- PARTICIPANT SCORES & SELECTION STAGES API ---
app.get("/api/nilai-peserta", authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query("SELECT id, fullname, nik, bkn_reg_number, role FROM users WHERE id = $1", [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });

    const user = userResult.rows[0];
    let bknRow = null;

    if (user.nik) {
      const bknRes = await pool.query("SELECT * FROM bkn_data WHERE nik = $1", [user.nik]);
      if (bknRes.rows.length > 0) bknRow = bknRes.rows[0];
    }

    const skorTwk = bknRow?.skor_twk || 115;
    const skorTiu = bknRow?.skor_tiu || 135;
    const skorTkp = bknRow?.skor_tkp || 188;
    const totalSkd = bknRow?.total_skd || (skorTwk + skorTiu + skorTkp);
    const passingGrade = bknRow?.status_pg || "Lolos PG (Passing Grade)";

    res.json({
      fullname: user.fullname,
      nik: user.nik || "3205016708980003",
      reg_number: user.bkn_reg_number || "3014122355561982",
      skd: {
        twk: skorTwk,
        twk_min: 65,
        tiu: skorTiu,
        tiu_min: 80,
        tkp: skorTkp,
        tkp_min: 166,
        total: totalSkd,
        status: passingGrade
      },
      kesehatan: {
        skor: bknRow?.nilai_kesehatan || 88,
        status: "Memenuhi Syarat (MS)",
        kategori: "Kategori A (Sangat Baik)"
      },
      kesamaptaan: {
        skor: bknRow?.nilai_samapta || 82.5,
        status: "Memenuhi Syarat (MS)",
        rincian: { lari: 78, pushup: 85, situp: 84, chinning: 83 }
      },
      wawancara: {
        skor: bknRow?.nilai_wawancara || 86.0,
        status: "Selesai"
      },
      total_akhir: bknRow?.nilai_akhir || 85.45,
      peringkat: bknRow?.rank || "Peringkat 14 dari 350 Peserta",
      status_kelulusan: bknRow?.status_akhir || "LOLOS SELEKSI AKHIR (L)"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data nilai" });
  }
});

app.get("/api/tahapan-peserta", authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query("SELECT id, fullname, nik, bkn_reg_number FROM users WHERE id = $1", [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });

    const user = userResult.rows[0];

    res.json({
      participant: {
        fullname: user.fullname,
        nik: user.nik || "3205016708980003",
        reg_number: user.bkn_reg_number || "3014122355561982",
        formasi: "Politeknik Pengayoman Indonesia - Pengayoman",
      },
      current_stage_index: 2, // 0-based: Stage 3 active
      stages: [
        {
          id: 1,
          title: "Pendaftaran & Seleksi Administrasi",
          date: "14 Juni - 30 Juni 2026",
          status: "Lolos",
          description: "Verifikasi dokumen ijazah, NIK, dan kualifikasi fisik awal oleh panitia seleksi kedinasan Kemenkumham.",
          badge_class: "badge-success",
          icon: "✅"
        },
        {
          id: 2,
          title: "Seleksi Kompetensi Dasar (SKD CAT BKN)",
          date: "15 Juli - 25 Juli 2026",
          status: "Lolos (Passing Grade)",
          description: "Ujian berbasis komputer (CAT) melingkupi TWK, TIU, dan TKP di Kanreg BKN.",
          badge_class: "badge-success",
          icon: "💻"
        },
        {
          id: 3,
          title: "Tes Kesehatan & Pemeriksaan Fisik",
          date: "01 Agustus - 05 Agustus 2026",
          status: "Sedang Berlangsung",
          description: "Pemeriksaan kesehatan medis menyeluruh di Rumah Sakit Bhayangkara / RS Rujukan Kemenkumham.",
          badge_class: "badge-warning",
          icon: "🏥"
        },
        {
          id: 4,
          title: "Tes Kesamaptaan & Psikotes",
          date: "12 Agustus - 15 Agustus 2026",
          status: "Menunggu Jadwal",
          description: "Pengujian fisik (Lari, Push-up, Sit-up, Shuttle Run) dan penilaian psikotes terpadu.",
          badge_class: "badge-secondary",
          icon: "🏃"
        },
        {
          id: 5,
          title: "Wawancara, Pengamatan Fisik & Keterampilan (WPFK)",
          date: "20 Agustus - 25 Agustus 2026",
          status: "Belum Dimulai",
          description: "Wawancara tatap muka dengan Penguji Kementerian Hukum RI dan integrasi nilai akhir.",
          badge_class: "badge-secondary",
          icon: "👔"
        },
        {
          id: 6,
          title: "Pengumuman Kelulusan Akhir",
          date: "01 September 2026",
          status: "Belum Dimulai",
          description: "Penetapan hasil kelulusan akhir calon taruna/tarunani Politeknik Pengayoman Indonesia.",
          badge_class: "badge-secondary",
          icon: "🎓"
        }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data tahapan seleksi" });
  }
});


app.put("/api/profile", authenticateToken, upload.single("avatar"), async (req, res) => {
  const body = req.body || {};
  const { fullname, phone, oldPassword, newPassword, removeAvatar } = body;
  const avatarFile = req.file;

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (userResult.rows.length === 0) {
      if (avatarFile) fs.unlinkSync(path.join(__dirname, "uploads", avatarFile.filename));
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    const user = userResult.rows[0];

    // Determine new avatar_url if uploaded, or if requested to remove
    let avatarUrl = user.avatar_url;
    
    if (removeAvatar === 'true') {
      avatarUrl = null;
      if (user.avatar_url && user.avatar_url.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, user.avatar_url);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch(e) {}
        }
      }
    } else if (avatarFile) {
      avatarUrl = `/uploads/${avatarFile.filename}`;
      // Optionally delete old avatar file here if we want to save space
      if (user.avatar_url && user.avatar_url.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, user.avatar_url);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch(e) {}
        }
      }
    }

    if (newPassword) {
      if (!oldPassword) {
        if (avatarFile) fs.unlinkSync(path.join(__dirname, "uploads", avatarFile.filename));
        return res.status(400).json({ message: "Kata sandi lama wajib diisi untuk mengubah kata sandi" });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        if (avatarFile) fs.unlinkSync(path.join(__dirname, "uploads", avatarFile.filename));
        return res.status(400).json({ message: "Kata sandi lama salah" });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      const updateResult = await pool.query(
        "UPDATE users SET fullname = $1, phone = $2, password = $3, avatar_url = $4 WHERE id = $5 RETURNING id, email, fullname, role, phone, avatar_url",
        [fullname || user.fullname, phone || user.phone, hashedNewPassword, avatarUrl, req.user.id]
      );
      return res.json({ message: "Profil dan kata sandi berhasil diperbarui", user: updateResult.rows[0] });
    } else {
      const updateResult = await pool.query(
        "UPDATE users SET fullname = $1, phone = $2, avatar_url = $3 WHERE id = $4 RETURNING id, email, fullname, role, phone, avatar_url",
        [fullname || user.fullname, phone || user.phone, avatarUrl, req.user.id]
      );
      return res.json({ message: "Profil berhasil diperbarui", user: updateResult.rows[0] });
    }
  } catch (error) {
    if (avatarFile) fs.unlinkSync(path.join(__dirname, "uploads", avatarFile.filename));
    console.error(error);
    res.status(500).json({ message: "Gagal memperbarui profil" });
  }
});

// --- CHAT & COMPLAINT ENDPOINTS ---

app.get("/api/conversations", authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT p.*, u.email as participant_email, u.fullname as participant_fullname, u.nik as participant_nik, u.phone as participant_phone,
      (SELECT message FROM messages WHERE pengaduan_id = p.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE pengaduan_id = p.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
      (SELECT json_build_object('path', file_path, 'name', file_name)::text FROM lampiran WHERE pengaduan_id = p.id LIMIT 1) as attachment,
      (SELECT COUNT(*)::int FROM messages WHERE pengaduan_id = p.id AND sender_id != $1 AND is_read = FALSE) as unread_count
      FROM pengaduan p
      JOIN users u ON p.participant_id = u.id`;
    
    let params = [req.user.id];
    if (!req.user.isAdmin) {
      query += ` WHERE p.participant_id = $1`;
    } else if (!req.user.isSuperAdmin) {
      const allowed = [];
      if (req.user.isOperatorInfo) allowed.push('Informasi');
      if (req.user.isOperatorPengaduan) allowed.push('Pengaduan');
      query += ` WHERE p.service_type IN ('${allowed.join("','")}')`;
    }
    
    query += ` ORDER BY last_message_time DESC NULLS LAST`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil percakapan" });
  }
});

app.delete("/api/conversations/:id", authenticateToken, async (req, res) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: "Akses ditolak. Hanya untuk Super Admin." });
  }

  const { id } = req.params;

  try {
    const checkResult = await pool.query("SELECT id FROM pengaduan WHERE id = $1", [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Percakapan tidak ditemukan" });
    }

    // 1. Get and delete all lampiran files from uploads folder
    const lampiranResult = await pool.query("SELECT file_path FROM lampiran WHERE pengaduan_id = $1", [id]);
    for (const row of lampiranResult.rows) {
      if (row.file_path) {
        const relativePath = row.file_path.replace(/^\//, "");
        const fullPath = path.join(__dirname, relativePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {
            console.error(`Failed to delete file: ${fullPath}`, e);
          }
        }
      }
    }

    // 2. Get and delete all message attachment files from uploads folder
    const messagesResult = await pool.query("SELECT attachment FROM messages WHERE pengaduan_id = $1 AND attachment IS NOT NULL", [id]);
    for (const row of messagesResult.rows) {
      if (row.attachment) {
        let attachPath = null;
        try {
          const attach = JSON.parse(row.attachment);
          attachPath = attach.path;
        } catch (e) {
          attachPath = row.attachment;
        }
        if (attachPath) {
          const relativePath = attachPath.replace(/^\//, "");
          const fullPath = path.join(__dirname, relativePath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (e) {
              console.error(`Failed to delete file: ${fullPath}`, e);
            }
          }
        }
      }
    }

    await pool.query("DELETE FROM pengaduan WHERE id = $1", [id]);

    // Emit socket event to notify all admins to reload conversations
    io.to("admin_room").emit("conversation_deleted", { conversationId: id });

    res.json({ message: "Percakapan berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menghapus percakapan" });
  }
});

app.post("/api/conversations", authenticateToken, upload.single("attachment"), async (req, res) => {
  const { serviceType, category, message, priority } = req.body;
  const attachmentFile = req.file;

  if (!serviceType || !category || !message) {
    return res.status(400).json({ message: "Semua field kecuali lampiran harus diisi" });
  }

  try {
    // Generate Ticket ID (TKT-YYYYMM-XXXX)
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-${yyyy}${mm}-${randomNum}`;
    
    const prio = priority || 'Sedang';

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    // 1. Insert into pengaduan table
    const convResult = await pool.query(
      "INSERT INTO pengaduan (ticket_id, participant_id, service_type, category, priority, ip_address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [ticketId, req.user.id, serviceType, category, prio, clientIp]
    );
    const pengaduanId = convResult.rows[0].id;

    // 2. Insert into lampiran table if exists
    let attachmentData = null;
    if (attachmentFile) {
      const filePath = `/uploads/${attachmentFile.filename}`;
      const fileName = attachmentFile.originalname;
      
      await pool.query(
        "INSERT INTO lampiran (pengaduan_id, file_path, file_name) VALUES ($1, $2, $3)",
        [pengaduanId, filePath, fileName]
      );
      
      attachmentData = JSON.stringify({
        path: filePath,
        name: fileName
      });
    }

    // 3. Insert first message
    const msgResult = await pool.query(
      "INSERT INTO messages (pengaduan_id, sender_id, message) VALUES ($1, $2, $3) RETURNING *",
      [pengaduanId, req.user.id, message]
    );

    const newMessage = { ...msgResult.rows[0], sender_email: req.user.email };

    // Emit socket event to notify admins
    io.to("admin_room").emit("new_conversation_update", {
      conversationId: pengaduanId,
      lastMessage: message,
      senderId: req.user.id,
      senderEmail: req.user.email,
      serviceType: serviceType,
    });

    res.status(201).json({
      conversation: { ...convResult.rows[0], attachment: attachmentData },
      firstMessage: newMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengirim laporan pengaduan" });
  }
});

app.get("/api/messages/:conversationId", authenticateToken, async (req, res) => {
  const { conversationId } = req.params;
  try {
    // Check permission to view conversation
    const checkResult = await pool.query(
      "SELECT participant_id, service_type FROM pengaduan WHERE id = $1",
      [conversationId],
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Percakapan tidak ditemukan" });
    }
    
    const conv = checkResult.rows[0];
    const isAllowed = 
      req.user.isSuperAdmin ||
      (req.user.isOperatorInfo && conv.service_type === "Informasi") ||
      (req.user.isOperatorPengaduan && conv.service_type === "Pengaduan") ||
      (!req.user.isSuperAdmin && !req.user.isAdmin && conv.participant_id === req.user.id);
      
    if (!isAllowed) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    // Mark messages as read
    await pool.query(
      "UPDATE messages SET is_read = TRUE WHERE pengaduan_id = $1 AND sender_id != $2",
      [conversationId, req.user.id]
    );

    let queryStr = `
      SELECT m.*, u.email as sender_email, u.fullname as sender_fullname 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.pengaduan_id = $1 
    `;
    
    if (!req.user.isAdmin) {
      queryStr += ` AND (m.is_internal IS NULL OR m.is_internal = FALSE) `;
    }
    queryStr += ` ORDER BY m.created_at ASC`;

    const result = await pool.query(queryStr, [conversationId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil pesan" });
  }
});

app.post("/api/messages", authenticateToken, upload.single("attachment"), async (req, res) => {
  const { message, conversationId, participantId, is_internal } = req.body;
  const attachmentFile = req.file;
  try {
    let targetConversationId = conversationId;
    let targetParticipantId = participantId;

    if (!targetConversationId) {
      let pId = req.user.isAdmin ? targetParticipantId : req.user.id;
      if (!pId) {
        return res.status(400).json({ message: "participantId atau conversationId diperlukan" });
      }
      let convResult = await pool.query(
        "SELECT id FROM pengaduan WHERE participant_id = $1 ORDER BY created_at DESC LIMIT 1",
        [pId]
      );
      if (convResult.rows.length === 0) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const newConv = await pool.query(
          "INSERT INTO pengaduan (participant_id, service_type, category, ip_address) VALUES ($1, $2, $3, $4) RETURNING id",
          [pId, "Informasi", "Administrasi", clientIp]
        );
        targetConversationId = newConv.rows[0].id;
      } else {
        targetConversationId = convResult.rows[0].id;
      }
      targetParticipantId = pId;
    } else {
      const checkResult = await pool.query(
        "SELECT p.participant_id, p.service_type, p.ticket_id, u.email as participant_email FROM pengaduan p JOIN users u ON p.participant_id = u.id WHERE p.id = $1",
        [targetConversationId]
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Percakapan tidak ditemukan" });
      }
      targetParticipantId = checkResult.rows[0].participant_id;
      const conv = checkResult.rows[0];
      
      const isAllowed = 
        req.user.isSuperAdmin ||
        (req.user.isOperatorInfo && conv.service_type === "Informasi") ||
        (req.user.isOperatorPengaduan && conv.service_type === "Pengaduan") ||
        (!req.user.isSuperAdmin && !req.user.isAdmin && targetParticipantId === req.user.id);

      if (!isAllowed) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
    }

    let attachmentData = null;
    if (attachmentFile) {
      const filePath = `/uploads/${attachmentFile.filename}`;
      const fileName = attachmentFile.originalname;
      attachmentData = JSON.stringify({
        path: filePath,
        name: fileName
      });
    }

    const result = await pool.query(
      "INSERT INTO messages (pengaduan_id, sender_id, message, attachment, is_internal) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [targetConversationId, req.user.id, message || "", attachmentData, is_internal === 'true' || is_internal === true],
    );
    const newMessage = { 
      ...result.rows[0], 
      sender_email: req.user.email, 
      sender_fullname: req.user.fullname || req.user.email 
    };

    // Emit via socket
    io.to(`conv_${targetConversationId}`).emit("new_message", newMessage);
    
    // Get service_type for socket update
    const convInfo = await pool.query("SELECT service_type FROM pengaduan WHERE id = $1", [targetConversationId]);
    const serviceType = convInfo.rows.length > 0 ? convInfo.rows[0].service_type : "Layanan";

    // Notify admin
    io.to("admin_room").emit("new_conversation_update", {
      conversationId: targetConversationId,
      lastMessage: message || "📎 [Lampiran Berkas]",
      senderId: req.user.id,
      senderEmail: req.user.email,
      serviceType: serviceType,
    });
    
    // Also notify participant if it is admin replying
    if (req.user.isAdmin) {
      io.to(`user_room_${targetParticipantId}`).emit("new_conversation_update", {
        conversationId: targetConversationId,
        lastMessage: message || "📎 [Lampiran Berkas]",
      });
      
      const pRes = await pool.query("SELECT ticket_id FROM pengaduan WHERE id = $1", [targetConversationId]);
      const pTicket = (pRes.rows.length > 0 && pRes.rows[0].ticket_id) ? pRes.rows[0].ticket_id : targetConversationId;
      const snippet = message ? (message.length > 30 ? message.substring(0, 30) + "..." : message) : "Lampiran Berkas";
      
      logActivity(req.user.id, req.user.fullname || req.user.email, 'Balas Tiket', `Membalas tiket #${pTicket} dengan pesan: "${snippet}"`);
      
      // Send Email & WA notification
      const userRes = await pool.query("SELECT email, phone, fullname FROM users WHERE id = $1", [targetParticipantId]);
      if (userRes.rows.length > 0) {
        const { email: pEmail, phone: pPhone, fullname: pName } = userRes.rows[0];
        const pTicket2 = (pRes.rows.length > 0 && pRes.rows[0].ticket_id) ? pRes.rows[0].ticket_id : targetConversationId;
        const snippet2 = message ? (message.length > 50 ? message.substring(0, 50) + "..." : message) : "📎 [Lampiran Berkas]";
        sendReplyEmail(pEmail, pTicket2, snippet2).catch(err => console.error("Async reply email error:", err));

        if (pPhone) {
          // sendWhatsAppMessage(pPhone, `Halo *${pName || 'Bapak/Ibu'}*,\n\nAdmin Sekdin Kemenkum baru saja merespon tiket Anda dengan ID *#${pTicket2}*.\n\n*Balasan:*\n_"${snippet2}"_\n\nSilakan masuk ke portal Sekdin Poltekpin untuk melihat pesan selengkapnya.`);
        }
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengirim pesan" });
  }
});

// --- ANNOUNCEMENT ENDPOINTS ---

app.get("/api/announcements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil pengumuman" });
  }
});

app.post("/api/announcements", authenticateToken, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "attachment", maxCount: 1 }
]), async (req, res) => {
  if (!req.user.isSuperAdmin && req.user.role !== "admin_informasi") {
    return res.status(403).json({ message: "Akses ditolak. Hanya untuk Admin Utama atau Admin Informasi." });
  }

  const { title, category, content } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ message: "Judul, kategori, dan isi pengumuman wajib diisi" });
  }

  let imagePath = null;
  let attachmentPath = null;
  let attachmentName = null;

  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      imagePath = `/uploads/${req.files.image[0].filename}`;
    }
    if (req.files.attachment && req.files.attachment[0]) {
      attachmentPath = `/uploads/${req.files.attachment[0].filename}`;
      attachmentName = req.files.attachment[0].originalname;
    }
  }

  try {
    const result = await pool.query(
      "INSERT INTO announcements (title, category, content, image_path, attachment_path, attachment_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, category, content, imagePath, attachmentPath, attachmentName]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal membuat pengumuman" });
  }
});


// POST /api/conversations/:id/rate
app.post("/api/conversations/:id/rate", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;

  if (!rating) {
    return res.status(400).json({ message: "Rating wajib diisi" });
  }

  try {
    const result = await pool.query(
      "UPDATE pengaduan SET rating = $1, feedback = $2 WHERE id = $3 AND participant_id = $4 RETURNING *",
      [rating, feedback, id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Percakapan tidak ditemukan atau Anda tidak berhak menilainya." });
    }
    res.json({ message: "Penilaian berhasil dikirim", conversation: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengirim penilaian" });
  }
});

// PUT /api/conversations/:id/status
app.put("/api/conversations/:id/status", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Menunggu Respon", "Dalam Proses", "Selesai"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Status tidak valid" });
  }

  try {
    const checkResult = await pool.query(
      "SELECT p.service_type, p.category, p.participant_id, u.email FROM pengaduan p JOIN users u ON p.participant_id = u.id WHERE p.id = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Percakapan tidak ditemukan" });
    }

    const conv = checkResult.rows[0];
    const isAllowed = 
      req.user.isSuperAdmin ||
      (req.user.isOperatorInfo && conv.service_type === "Informasi") ||
      (req.user.isOperatorPengaduan && conv.service_type === "Pengaduan");

    if (!isAllowed) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    await pool.query(
      "UPDATE pengaduan SET status = $1 WHERE id = $2",
      [status, id]
    );

    // Send status update email asynchronously only if status is Selesai
    if (status === 'Selesai') {
      sendStatusChangeEmail(conv.email, status, conv.category, conv.service_type).catch(err => {
        console.error("Async SMTP send error in status update:", err);
      });
    }

    io.to(`conv_${id}`).emit("status_change", { conversationId: id, status });
    
    io.to("admin_room").emit("new_conversation_update", {
      conversationId: id,
      serviceType: conv.service_type,
    });

    io.to(`user_room_${conv.participant_id}`).emit("new_conversation_update", {
      conversationId: id,
    });

    res.json({ message: "Status berhasil diubah", status });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Ubah Status', `Mengubah status tiket ID ${id} menjadi ${status}`);
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// PUT /api/conversations/:id/priority
app.put("/api/conversations/:id/priority", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;

  const validPriorities = ["Rendah", "Sedang", "Tinggi"];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ message: "Prioritas tidak valid" });
  }

  try {
    const checkResult = await pool.query(
      "SELECT service_type FROM pengaduan WHERE id = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Percakapan tidak ditemukan" });
    }

    const conv = checkResult.rows[0];
    const isAllowed = 
      req.user.isSuperAdmin ||
      (req.user.isOperatorInfo && conv.service_type === "Informasi") ||
      (req.user.isOperatorPengaduan && conv.service_type === "Pengaduan");

    if (!isAllowed) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    await pool.query(
      "UPDATE pengaduan SET priority = $1 WHERE id = $2",
      [priority, id]
    );

    io.to("admin_room").emit("priority_change", { conversationId: id, priority });
    io.to(`conv_${id}`).emit("priority_change", { conversationId: id, priority });

    res.json({ message: "Prioritas berhasil diubah", priority });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Ubah Prioritas', `Mengubah prioritas tiket ID ${id} menjadi ${priority}`);
  } catch (error) {
    console.error("Error updating priority:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// --- ADMIN REPORT ENDPOINT ---
app.get("/api/admin/reports", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Akses ditolak. Hanya untuk Admin." });
  }

  try {
    const result = await pool.query(`
      SELECT 
        p.id as conversation_id,
        u.fullname as participant_fullname,
        u.nik as participant_nik,
        u.email as participant_email,
        u.phone as participant_phone,
        p.service_type,
        p.category,
        p.status,
        p.rating,
        p.ip_address,
        p.created_at as conversation_created_at,
        (SELECT message FROM messages WHERE pengaduan_id = p.id ORDER BY created_at ASC LIMIT 1) as first_message,
        (SELECT created_at FROM messages WHERE pengaduan_id = p.id ORDER BY created_at ASC LIMIT 1) as first_message_time
      FROM pengaduan p
      JOIN users u ON p.participant_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menarik data laporan" });
  }
});

// --- ADMIN USER MANAGEMENT ENDPOINTS ---

const requireMainAdmin = (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: "Akses ditolak. Hanya untuk Admin Utama." });
  }
  next();
};


// --- ADMIN IMPORT BKN ENDPOINT ---
app.post("/api/admin/import-bkn", authenticateToken, requireMainAdmin, uploadExcel.single("bkn_file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File Excel BKN tidak ditemukan" });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // WORKAROUND BKN EXPORT BUG:
    // Terkadang file export BKN memiliki metadata !ref yang korup (contoh: A1:A4, padahal ada 10.000 baris).
    // Kita harus mencari cell terjauh dan me-recompute range secara manual.
    const keys = Object.keys(sheet).filter(k => !k.startsWith('!'));
    if (keys.length > 0) {
      let maxRow = 0;
      let maxCol = 0;
      keys.forEach(k => {
        const decoded = XLSX.utils.decode_cell(k);
        if (decoded.r > maxRow) maxRow = decoded.r;
        if (decoded.c > maxCol) maxCol = decoded.c;
      });
      // Set rentang baru dari A1 (0,0) sampai maksimal baris dan kolom yang ditemukan
      sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
    }

    // Baca sebagai json, header di index baris ke-3 (karena index 0,1,2 adalah judul)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    // Temukan baris mana yang merupakan header sebenarnya
    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
      if (!rawData[i]) continue;
      // Periksa apakah di row ini ada kolom bertuliskan NIK dan NO REGISTER
      const rowString = JSON.stringify(rawData[i]).toUpperCase();
      if (rowString.includes("NIK") && rowString.includes("NO REGISTER")) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Format Excel tidak valid. Kolom 'NIK' atau 'NO REGISTER' tidak ditemukan." });
    }

    const headers = rawData[headerRowIndex].map(h => String(h).trim().toUpperCase());
    const nikIdx = headers.findIndex(h => h === "NIK" || h.includes("NIK"));
    const regIdx = headers.findIndex(h => h === "NO REGISTER" || h === "NO REG" || h.includes("REGISTER"));
    const namaIdx = headers.findIndex(h => h === "NAMA" || h.includes("NAMA"));
    
    // Optional Score Columns
    const twkIdx = headers.findIndex(h => h.includes("TWK"));
    const tiuIdx = headers.findIndex(h => h.includes("TIU"));
    const tkpIdx = headers.findIndex(h => h.includes("TKP"));
    const totalIdx = headers.findIndex(h => h.includes("TOTAL") || h.includes("SKD"));
    const kesIdx = headers.findIndex(h => h.includes("KESEHATAN") || h.includes("KES"));
    const samaptaIdx = headers.findIndex(h => h.includes("SAMAPTA") || h.includes("FISIK"));
    const wawancaraIdx = headers.findIndex(h => h.includes("WAWANCARA") || h.includes("WPFK"));
    const rankIdx = headers.findIndex(h => h.includes("RANK") || h.includes("PERINGKAT"));

    if (nikIdx === -1) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Kolom NIK tidak ditemukan di file Excel BKN tersebut." });
    }

    let insertedCount = 0;

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const nik = String(row[nikIdx] || "").trim();
      const regNumber = regIdx !== -1 ? String(row[regIdx] || "").trim() : "";
      const fullname = namaIdx !== -1 ? String(row[namaIdx] || "Peserta").trim() : "Peserta";

      const twk = twkIdx !== -1 && !isNaN(parseFloat(row[twkIdx])) ? parseFloat(row[twkIdx]) : null;
      const tiu = tiuIdx !== -1 && !isNaN(parseFloat(row[tiuIdx])) ? parseFloat(row[tiuIdx]) : null;
      const tkp = tkpIdx !== -1 && !isNaN(parseFloat(row[tkpIdx])) ? parseFloat(row[tkpIdx]) : null;
      const total = totalIdx !== -1 && !isNaN(parseFloat(row[totalIdx])) ? parseFloat(row[totalIdx]) : ((twk || 0) + (tiu || 0) + (tkp || 0) || null);
      const kes = kesIdx !== -1 && !isNaN(parseFloat(row[kesIdx])) ? parseFloat(row[kesIdx]) : null;
      const samapta = samaptaIdx !== -1 && !isNaN(parseFloat(row[samaptaIdx])) ? parseFloat(row[samaptaIdx]) : null;
      const wawancara = wawancaraIdx !== -1 && !isNaN(parseFloat(row[wawancaraIdx])) ? parseFloat(row[wawancaraIdx]) : null;
      const rank = rankIdx !== -1 ? String(row[rankIdx] || "").trim() : null;

      if (nik) {
        // Upsert data ke bkn_data
        await pool.query(
          `INSERT INTO bkn_data (
            nik, reg_number, fullname, skor_twk, skor_tiu, skor_tkp, total_skd, 
            nilai_kesehatan, nilai_samapta, nilai_wawancara, rank
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (nik) DO UPDATE 
          SET reg_number = COALESCE(NULLIF(EXCLUDED.reg_number, ''), bkn_data.reg_number), 
              fullname = COALESCE(NULLIF(EXCLUDED.fullname, 'Peserta'), bkn_data.fullname),
              skor_twk = COALESCE(EXCLUDED.skor_twk, bkn_data.skor_twk),
              skor_tiu = COALESCE(EXCLUDED.skor_tiu, bkn_data.skor_tiu),
              skor_tkp = COALESCE(EXCLUDED.skor_tkp, bkn_data.skor_tkp),
              total_skd = COALESCE(EXCLUDED.total_skd, bkn_data.total_skd),
              nilai_kesehatan = COALESCE(EXCLUDED.nilai_kesehatan, bkn_data.nilai_kesehatan),
              nilai_samapta = COALESCE(EXCLUDED.nilai_samapta, bkn_data.nilai_samapta),
              nilai_wawancara = COALESCE(EXCLUDED.nilai_wawancara, bkn_data.nilai_wawancara),
              rank = COALESCE(EXCLUDED.rank, bkn_data.rank)`,
          [nik, regNumber, fullname, twk, tiu, tkp, total, kes, samapta, wawancara, rank]
        );
        insertedCount++;
      }
    }


    fs.unlinkSync(req.file.path);
    
    await logActivity(req.user.id, req.user.fullname, "Import Data BKN", `Berhasil sinkronisasi ${insertedCount} peserta`);

    res.json({ message: `Berhasil mengimpor ${insertedCount} data peserta BKN.` });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error(error);
    res.status(500).json({ message: "Gagal memproses file Excel BKN" });
  }
});

// --- ADMIN MANUAL UPDATE NILAI INSTANSI (KESEHATAN, SAMAPTA, WAWANCARA) ---
app.post("/api/admin/update-nilai-peserta", authenticateToken, requireMainAdmin, async (req, res) => {
  const { nik, nilai_kesehatan, nilai_samapta, nilai_wawancara, rank, status_akhir } = req.body;

  if (!nik) {
    return res.status(400).json({ message: "NIK peserta wajib diisi" });
  }

  try {
    await pool.query(
      `INSERT INTO bkn_data (nik, nilai_kesehatan, nilai_samapta, nilai_wawancara, rank, status_akhir)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (nik) DO UPDATE SET
       nilai_kesehatan = COALESCE($2, bkn_data.nilai_kesehatan),
       nilai_samapta = COALESCE($3, bkn_data.nilai_samapta),
       nilai_wawancara = COALESCE($4, bkn_data.nilai_wawancara),
       rank = COALESCE($5, bkn_data.rank),
       status_akhir = COALESCE($6, bkn_data.status_akhir)`,
      [nik, nilai_kesehatan || null, nilai_samapta || null, nilai_wawancara || null, rank || null, status_akhir || null]
    );

    await logActivity(req.user.id, req.user.fullname, "UPDATE_NILAI_INSTANSI", `Memperbarui nilai instansi untuk NIK: ${nik}`);

    res.json({ message: "Berhasil memperbarui nilai ujian instansi peserta" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui nilai peserta" });
  }
});

app.get("/api/admin/activity-logs", authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil log aktivitas" });
  }
});

app.get("/api/admin/users", authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, fullname, nik, phone, is_verified, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil daftar pengguna" });
  }
});

app.post("/api/admin/users", authenticateToken, requireMainAdmin, async (req, res) => {
  const { email, password, nik, role, phone, fullname } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: "Email, password, dan role wajib diisi" });
  }

  try {
    const checkEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    if (nik) {
      const checkNik = await pool.query("SELECT id FROM users WHERE nik = $1", [nik]);
      if (checkNik.rows.length > 0) {
        return res.status(400).json({ message: "NIK sudah terdaftar" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password, nik, phone, fullname, is_verified, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, role, is_verified, fullname",
      [email, hashedPassword, nik || null, phone || null, fullname || null, true, role]
    );

    res.status(201).json({
      message: "Pengguna berhasil dibuat",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal membuat pengguna" });
  }
});

app.put("/api/admin/users/:id", authenticateToken, requireMainAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, password, nik, role, phone, fullname } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: "Email dan role wajib diisi" });
  }

  try {
    const checkEmail = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, id]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah digunakan oleh pengguna lain" });
    }

    if (nik) {
      const checkNik = await pool.query("SELECT id FROM users WHERE nik = $1 AND id != $2", [nik, id]);
      if (checkNik.rows.length > 0) {
        return res.status(400).json({ message: "NIK sudah terdaftar pada pengguna lain" });
      }
    }

    let query = "";
    let params = [];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE users 
        SET email = $1, password = $2, nik = $3, phone = $4, fullname = $5, role = $6 
        WHERE id = $7 RETURNING id, email, role, fullname
      `;
      params = [email, hashedPassword, nik || null, phone || null, fullname || null, role, id];
    } else {
      query = `
        UPDATE users 
        SET email = $1, nik = $2, phone = $3, fullname = $4, role = $5 
        WHERE id = $6 RETURNING id, email, role, fullname
      `;
      params = [email, nik || null, phone || null, fullname || null, role, id];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    res.json({
      message: "Pengguna berhasil diperbarui",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal memperbarui pengguna" });
  }
});

app.delete("/api/admin/users/:id", authenticateToken, requireMainAdmin, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: "Anda tidak dapat menghapus akun Anda sendiri" });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    res.json({ message: "Pengguna berhasil dihapus" });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Hapus Pengguna', `Menghapus pengguna ID ${id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menghapus pengguna" });
  }
});

// Error handler for Multer limits
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: "Ukuran berkas terlalu besar. Maksimal adalah 5 MB." });
    }
  }
  next(err);
});

// Global Error Handler untuk menyembunyikan stack trace dari client
app.use((err, req, res, next) => {
  console.error("Terjadi error:", err.stack);
  res.status(500).json({ 
    message: "Terjadi kesalahan internal pada server. Silakan hubungi administrator." 
  });
});

// Final fallback for SPA: serve index.html for any unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Initialize WhatsApp
// initializeWhatsApp();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
