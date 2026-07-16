const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const dns = require("dns");

// Force IPv4 to prevent ENETUNREACH errors with nodemailer
dns.setDefaultResultOrder('ipv4first');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const nodemailer = require("nodemailer");
const { initializeWhatsApp, sendWhatsAppMessage } = require("./whatsapp");

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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(cors());

const rateLimit = require("express-rate-limit");
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { message: "Terlalu banyak percobaan" } });
app.use("/api/verify-otp", authLimiter);
app.use("/api/resend-otp", authLimiter);
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);


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
    const checkNik = await pool.query("SELECT id FROM users WHERE nik = $1", [nik]);
    if (checkNik.rows.length > 0) {
      return res.status(400).json({ message: "NIK sudah terdaftar" });
    }

    // Check if Email already exists
    const checkEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = require("crypto").randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const result = await pool.query(
      "INSERT INTO users (email, password, nik, fullname, phone, is_verified, otp_code, otp_expiry, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role, fullname",
      [email, hashedPassword, nik, fullname, phone, false, otp, expiry, "participant"],
    );

    // Send OTP based on selected method
    if (otpMethod === 'whatsapp' && phone) {
      sendWhatsAppMessage(phone, `Halo *${fullname}*,\nTerima kasih telah mendaftar di portal Sekdin Poltekpin.\n\nBerikut adalah kode OTP Anda: *${otp}*\n\nKode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun.`);
    } else {
      sendOTPEmail(email, otp).catch(err => console.error("Async SMTP send error in registration:", err));
    }

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

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (user && (await bcrypt.compare(password, user.password))) {
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

// --- PROFILE ENDPOINTS ---

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, fullname, nik, phone, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
  const { fullname, phone, oldPassword, newPassword } = req.body;

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    const user = userResult.rows[0];

    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ message: "Kata sandi lama wajib diisi untuk mengubah kata sandi" });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Kata sandi lama salah" });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      const updateResult = await pool.query(
        "UPDATE users SET fullname = $1, phone = $2, password = $3 WHERE id = $4 RETURNING id, email, fullname, role, phone",
        [fullname || user.fullname, phone || user.phone, hashedNewPassword, req.user.id]
      );
      return res.json({ message: "Profil dan kata sandi berhasil diperbarui", user: updateResult.rows[0] });
    } else {
      const updateResult = await pool.query(
        "UPDATE users SET fullname = $1, phone = $2 WHERE id = $3 RETURNING id, email, fullname, role, phone",
        [fullname || user.fullname, phone || user.phone, req.user.id]
      );
      return res.json({ message: "Profil berhasil diperbarui", user: updateResult.rows[0] });
    }
  } catch (error) {
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
          sendWhatsAppMessage(pPhone, `Halo *${pName || 'Bapak/Ibu'}*,\n\nAdmin Sekdin Poltekpin baru saja merespon tiket Anda dengan ID *#${pTicket2}*.\n\n*Balasan:*\n_"${snippet2}"_\n\nSilakan masuk ke portal Sekdin Poltekpin untuk melihat pesan selengkapnya.`);
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

// Final fallback for SPA: serve index.html for any unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Initialize WhatsApp
initializeWhatsApp();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
