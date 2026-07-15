const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Update authenticateToken
code = code.replace(
  `    req.user = user;
    next();`,
  `    user.roles = user.role ? user.role.split(',') : [];
    user.isSuperAdmin = user.roles.includes('admin');
    user.isOperatorInfo = user.roles.includes('operator_informasi');
    user.isOperatorPengaduan = user.roles.includes('operator_pengaduan');
    user.isAdmin = user.isSuperAdmin || user.isOperatorInfo || user.isOperatorPengaduan;
    req.user = user;
    next();`
);

// 2. Replace role checks
code = code.replace(/req\.user\.role === "admin"/g, "req.user.isSuperAdmin");
code = code.replace(/req\.user\.role !== "admin"/g, "!req.user.isSuperAdmin");
code = code.replace(/req\.user\.role === 'admin'/g, "req.user.isSuperAdmin");
code = code.replace(/req\.user\.role !== 'admin'/g, "!req.user.isSuperAdmin");

code = code.replace(/req\.user\.role === "admin_informasi"/g, "req.user.isOperatorInfo");
code = code.replace(/req\.user\.role === "admin_pengaduan"/g, "req.user.isOperatorPengaduan");

code = code.replace(/req\.user\.role\.startsWith\("admin"\)/g, "req.user.isAdmin");
code = code.replace(/!req\.user\.role\.startsWith\("admin"\)/g, "!req.user.isAdmin");

// 3. For GET /conversations the query construction needs care:
// Original:
/*
    let params = [req.user.id];
    if (req.user.isOperatorInfo) {
      query += ` WHERE p.service_type = 'Informasi'`;
    } else if (req.user.isOperatorPengaduan) {
      query += ` WHERE p.service_type = 'Pengaduan'`;
    } else if (!req.user.isSuperAdmin) {
      query += ` WHERE p.participant_id = $1`;
    }
*/
// If user has BOTH operator_info and operator_pengaduan, it will only show 'Informasi' with the if/else if.
// So we need to rewrite GET /conversations query building.
const getConvOld = `    let params = [req.user.id];
    if (req.user.isOperatorInfo) {
      query += \` WHERE p.service_type = 'Informasi'\`;
    } else if (req.user.isOperatorPengaduan) {
      query += \` WHERE p.service_type = 'Pengaduan'\`;
    } else if (!req.user.isSuperAdmin) {
      query += \` WHERE p.participant_id = $1\`;
    }`;

const getConvNew = `    let params = [req.user.id];
    if (!req.user.isAdmin) {
      query += \` WHERE p.participant_id = $1\`;
    } else if (!req.user.isSuperAdmin) {
      const allowed = [];
      if (req.user.isOperatorInfo) allowed.push('Informasi');
      if (req.user.isOperatorPengaduan) allowed.push('Pengaduan');
      query += \` WHERE p.service_type IN ('\${allowed.join("','")}')\`;
    }`;
code = code.replace(getConvOld, getConvNew);

// 4. Update requireMainAdmin middleware
code = code.replace(
  `const requireMainAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya untuk Super Admin." });
  }
  next();
};`,
  `const requireMainAdmin = (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: "Akses ditolak. Hanya untuk Super Admin." });
  }
  next();
};`
);

// We need to add logging logic:
const logFn = `
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
`;
code = code.replace("// Middleware to verify JWT", logFn + "\n// Middleware to verify JWT");

fs.writeFileSync('server.js', code);
console.log("Success rewrite");
