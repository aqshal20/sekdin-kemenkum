const fs = require('fs');
let html = fs.readFileSync('/home/aqshal/sekdin-kemenkum/frontend/kelola-pengguna.html', 'utf8');

// 1. Rename admin filters
html = html.replace('<option value="admin_informasi">Admin Info</option>', '<option value="operator_informasi">Operator Info</option>');
html = html.replace('<option value="admin_pengaduan">Admin Pengaduan</option>', '<option value="operator_pengaduan">Operator Pengaduan</option>');

// 2. Change select to checkboxes in form
const oldSelect = `<div class="form-group">
            <label for="role">Peran / Hak Akses</label>
            <select id="role" class="form-control" required>
              <option value="participant">Peserta (User Biasa)</option>
              <option value="admin_informasi">Admin Layanan Informasi</option>
              <option value="admin_pengaduan">Admin Layanan Pengaduan</option>
              <option value="admin">Admin Utama (Super Admin)</option>
            </select>
          </div>`;
const newCheckboxes = `<div class="form-group">
            <label>Peran / Hak Akses</label>
            <div id="role-checkboxes" style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
              <label style="font-weight: normal; font-size: 14px; display: flex; align-items: center; gap: 8px;"><input type="checkbox" name="role" value="admin"> Admin Utama (Super Admin)</label>
              <label style="font-weight: normal; font-size: 14px; display: flex; align-items: center; gap: 8px;"><input type="checkbox" name="role" value="operator_informasi"> Operator Layanan Informasi</label>
              <label style="font-weight: normal; font-size: 14px; display: flex; align-items: center; gap: 8px;"><input type="checkbox" name="role" value="operator_pengaduan"> Operator Layanan Pengaduan</label>
              <label style="font-weight: normal; font-size: 14px; display: flex; align-items: center; gap: 8px;"><input type="checkbox" name="role" value="participant"> Peserta (User Biasa)</label>
            </div>
            <small style="color: #64748b;">(Bisa pilih lebih dari satu peran untuk operator)</small>
          </div>`;
html = html.replace(oldSelect, newCheckboxes);

// 3. Update getRoleBadge function
const oldBadgeFn = `function getRoleBadge(role) {
        switch (role) {
          case 'admin':
            return '<span class="role-badge role-admin">Admin Utama</span>';
          case 'admin_informasi':
            return '<span class="role-badge role-admin-info">Admin Info</span>';
          case 'admin_pengaduan':
            return '<span class="role-badge role-admin-aduan">Admin Pengaduan</span>';
          default:
            return '<span class="role-badge role-participant">Peserta</span>';
        }
      }`;
const newBadgeFn = `function getRoleBadge(role) {
        if (!role) return '<span class="role-badge role-participant">Peserta</span>';
        const roles = role.split(',');
        return roles.map(r => {
          switch(r) {
            case 'admin': return '<span class="role-badge role-admin" style="margin-right: 4px;">Admin Utama</span>';
            case 'operator_informasi': return '<span class="role-badge role-admin-info" style="margin-right: 4px;">Operator Info</span>';
            case 'operator_pengaduan': return '<span class="role-badge role-admin-aduan" style="margin-right: 4px;">Operator Pengaduan</span>';
            case 'participant': return '<span class="role-badge role-participant" style="margin-right: 4px;">Peserta</span>';
            default: return '';
          }
        }).join('');
      }`;
html = html.replace(oldBadgeFn, newBadgeFn);

// 4. Update edit user populate
html = html.replace(
  `document.getElementById("role").value = u.role || 'participant';`,
  `document.querySelectorAll('input[name="role"]').forEach(cb => cb.checked = false);
        if (u.role) {
          u.role.split(',').forEach(r => {
            const cb = document.querySelector(\`input[name="role"][value="\${r}"]\`);
            if (cb) cb.checked = true;
          });
        } else {
          document.querySelector('input[name="role"][value="participant"]').checked = true;
        }`
);

// 5. Update create/edit form submit
const oldSubmit = `const role = document.getElementById("role").value;`;
const newSubmit = `const checkedRoles = Array.from(document.querySelectorAll('input[name="role"]:checked')).map(cb => cb.value);
          const role = checkedRoles.join(',') || 'participant';`;
html = html.replace(oldSubmit, newSubmit);

// Also remove the password require attribute reset if any, we just want to replace old submit logic
html = html.replace(
  `const roleFilter = document.getElementById("filter-role").value;`,
  `const roleFilter = document.getElementById("filter-role").value;`
);

// Fix filter logic
html = html.replace(
  `if (roleFilter !== "all" && u.role !== roleFilter) {`,
  `if (roleFilter !== "all" && (!u.role || !u.role.includes(roleFilter))) {`
);

// Add Activity Logs UI
const logsHtml = `
      <section class="admin-layout" style="margin-top: 40px; padding-top: 0;">
        <div class="action-bar" style="margin-bottom: 20px;">
          <div class="section-title" style="margin: 0;">
            <h2 style="font-size: 20px;">Log Aktivitas Operator & Admin</h2>
            <p style="font-size: 13px; color: var(--muted); margin: 5px 0 0 0;">Memantau riwayat aktivitas penanganan tiket dan pengelolaan pengguna</p>
          </div>
          <button class="btn-new" onclick="fetchLogs()" style="background: white; color: var(--navy); border: 1px solid var(--border);">🔄 Refresh Log</button>
        </div>
        <div class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th style="width: 150px;">Waktu</th>
                <th>Pengguna</th>
                <th style="width: 150px;">Aksi</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody id="logs-list-body">
              <tr>
                <td colspan="4" style="text-align: center; color: var(--muted); padding: 30px;">
                  Memuat data log aktivitas...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
`;

if (!html.includes('Log Aktivitas')) {
  html = html.replace('</main>', logsHtml + '\n    </main>');
}

// Add fetchLogs JS
const jsLogs = `
      // Load Activity Logs
      async function fetchLogs() {
        try {
          const res = await fetch(\`\${API_URL}/admin/activity-logs\`, {
            headers: { "Authorization": \`Bearer \${getAuthToken()}\` }
          });
          if (res.ok) {
            const logs = await res.json();
            renderLogs(logs);
          } else {
            document.getElementById("logs-list-body").innerHTML = \`<tr><td colspan="4" style="text-align: center; color: red;">Gagal memuat log aktivitas.</td></tr>\`;
          }
        } catch (error) {
          document.getElementById("logs-list-body").innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Koneksi ke server gagal.</td></tr>';
        }
      }

      function renderLogs(logs) {
        const tbody = document.getElementById("logs-list-body");
        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--muted); padding: 30px;">Belum ada log aktivitas.</td></tr>';
          return;
        }

        tbody.innerHTML = logs.map(log => {
          const date = new Date(log.created_at);
          return \`
            <tr>
              <td style="font-size: 12px; color: #475569;">\${date.toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</td>
              <td style="font-weight: 600; color: var(--navy);">\${escapeHtml(log.user_name || 'System')}</td>
              <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #334155; border: 1px solid #cbd5e1;">\${escapeHtml(log.action)}</span></td>
              <td style="font-size: 13px; color: #334155;">\${escapeHtml(log.details)}</td>
            </tr>
          \`;
        }).join('');
      }

      // Initial Load
      fetchUsers();
      fetchLogs();
`;
html = html.replace('fetchUsers();', jsLogs);

fs.writeFileSync('/home/aqshal/sekdin-kemenkum/frontend/kelola-pengguna.html', html);
console.log('Frontend patched.');
