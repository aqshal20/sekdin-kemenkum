const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add log for sending message
code = code.replace(
  'res.status(201).json(newMessage.rows[0]);',
  `res.status(201).json(newMessage.rows[0]);
    if (req.user.isAdmin) {
      logActivity(req.user.id, req.user.fullname || req.user.email, 'Membalas Tiket', \`Membalas tiket ID \${targetConversationId}\`);
    }`
);

// 2. Add log for status change
code = code.replace(
  'res.json({ message: "Status berhasil diubah", status });',
  `res.json({ message: "Status berhasil diubah", status });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Ubah Status', \`Mengubah status tiket ID \${id} menjadi \${status}\`);`
);

// 3. Add log for priority change
code = code.replace(
  'res.json({ message: "Prioritas berhasil diubah", priority });',
  `res.json({ message: "Prioritas berhasil diubah", priority });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Ubah Prioritas', \`Mengubah prioritas tiket ID \${id} menjadi \${priority}\`);`
);

// 4. Add log for create user
code = code.replace(
  'res.status(201).json({ message: "Pengguna berhasil ditambahkan", user: result.rows[0] });',
  `res.status(201).json({ message: "Pengguna berhasil ditambahkan", user: result.rows[0] });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Tambah Pengguna', \`Menambahkan pengguna baru: \${email}\`);`
);

// 5. Add log for edit user
code = code.replace(
  'res.json({ message: "Data pengguna berhasil diperbarui", user: result.rows[0] });',
  `res.json({ message: "Data pengguna berhasil diperbarui", user: result.rows[0] });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Edit Pengguna', \`Memperbarui pengguna ID \${id} (\${email})\`);`
);

// 6. Add log for delete user
code = code.replace(
  'res.json({ message: "Pengguna berhasil dihapus" });',
  `res.json({ message: "Pengguna berhasil dihapus" });
    logActivity(req.user.id, req.user.fullname || req.user.email, 'Hapus Pengguna', \`Menghapus pengguna ID \${id}\`);`
);

// 7. Add GET /api/admin/activity-logs endpoint
const logsEndpoint = `
app.get("/api/admin/activity-logs", authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil log aktivitas" });
  }
});
`;
if (!code.includes('/api/admin/activity-logs')) {
  code = code.replace('app.get("/api/admin/users"', logsEndpoint + '\napp.get("/api/admin/users"');
}

fs.writeFileSync('server.js', code);
console.log("Patch applied.");
