const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Replace exact role checks with array checks
content = content.replace(/req\.user\.role === "admin_informasi"/g, "(req.user.role && req.user.role.split(',').includes('operator_informasi'))");
content = content.replace(/req\.user\.role === "admin_pengaduan"/g, "(req.user.role && req.user.role.split(',').includes('operator_pengaduan'))");
content = content.replace(/req\.user\.role === "admin"/g, "(req.user.role && req.user.role.split(',').includes('admin'))");
content = content.replace(/req\.user\.role !== "admin"/g, "(!req.user.role || !req.user.role.split(',').includes('admin'))");
content = content.replace(/req\.user\.role === 'admin'/g, "(req.user.role && req.user.role.split(',').includes('admin'))");
content = content.replace(/req\.user\.role !== 'admin'/g, "(!req.user.role || !req.user.role.split(',').includes('admin'))");

// Wait, the logic for getting conversations (lines 503-509)
// Original:
// if (req.user.role === "admin_informasi") { ... }
// else if (req.user.role === "admin_pengaduan") { ... }
// else if (req.user.role !== "admin") { ... }
//
// New logic for GET /api/conversations:
/*
    const userRoles = req.user.role ? req.user.role.split(',') : [];
    const isSuper = userRoles.includes('admin');
    const isInfo = userRoles.includes('operator_informasi');
    const isAduan = userRoles.includes('operator_pengaduan');

    let params = [req.user.id];
    if (!isSuper && !isInfo && !isAduan) {
      query += ` WHERE p.participant_id = $1`;
    } else if (!isSuper) {
      // It's an operator, maybe both or one.
      const allowedTypes = [];
      if (isInfo) allowedTypes.push('Informasi');
      if (isAduan) allowedTypes.push('Pengaduan');
      query += ` WHERE p.service_type IN ('${allowedTypes.join("','")}')`;
    }
*/

fs.writeFileSync('server.js.tmp', content);
console.log("Written to server.js.tmp");
