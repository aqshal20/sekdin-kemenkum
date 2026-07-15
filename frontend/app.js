/* ============================================================
   app.js — Sekdin-Poltekpin Global Application Script
   ============================================================ */

function escapeHtml(text) {
  if (!text) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * showModalAlert(message, redirectUrl, type)
 * type: 'warning' | 'error' | 'success' | 'info'
 */
window.showModalAlert = function(message, redirectUrl = null, type = 'warning') {
  // Remove any existing modal
  const existing = document.querySelector('.custom-alert-overlay');
  if (existing) existing.remove();

  const icons = {
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const overlay = document.createElement('div');
  overlay.className = 'custom-alert-overlay';

  overlay.innerHTML = `
    <div class="custom-alert-box custom-alert-${type}" role="alertdialog" aria-modal="true">
      <div class="custom-alert-icon-wrap custom-alert-icon-${type}">
        <span class="custom-alert-svg">${icons[type] || icons.warning}</span>
      </div>
      <div class="custom-alert-body">
        <h3 class="custom-alert-title">${
          type === 'warning' ? 'Perhatian' :
          type === 'error'   ? 'Akses Ditolak' :
          type === 'success' ? 'Berhasil' : 'Informasi'
        }</h3>
        <p class="custom-alert-message">${message}</p>
      </div>
      <div class="custom-alert-actions">
        <button class="custom-alert-btn custom-alert-btn-${type}" id="custom-alert-ok">Mengerti</button>
      </div>
      <div class="custom-alert-progress"><div class="custom-alert-progress-bar custom-alert-progress-${type}"></div></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Dismiss logic
  function dismiss() {
    const box = overlay.querySelector('.custom-alert-box');
    box.style.animation = 'modalOut 0.25s cubic-bezier(0.4, 0, 1, 1) forwards';
    overlay.style.animation = 'overlayOut 0.3s ease forwards';
    setTimeout(() => {
      overlay.remove();
      if (redirectUrl) window.location.href = redirectUrl;
    }, 280);
  }

  overlay.querySelector('#custom-alert-ok').addEventListener('click', dismiss);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) dismiss(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onKey); }
  });
};

window.alert = function(message) {
  showModalAlert(message, null, 'warning');
};

async function loadPartial(selector, path) {
  const mount = document.querySelector(selector);
  if (!mount) return;
  try {
    const response = await fetch(path);
    if (response.ok) mount.innerHTML = await response.text();
  } catch (e) {
    console.warn("Gagal memuat partial:", path, e);
  }
}

const API_URL = "http://localhost:3000/api";

function getAuthToken() { return localStorage.getItem("sekdin-token"); }
function getUserRole()  { return localStorage.getItem("user-role"); }
function isAuthenticated() { return !!getAuthToken(); }

/* ============================================================
   Toast Notification
   ============================================================ */
function showToast(title, message = "", type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";

  const borderColors = { success: "#15803d", error: "#b91c1c", warning: "#b45309", info: "#003366" };
  toast.style.borderLeftColor = borderColors[type] || borderColors.info;

  toast.innerHTML = `
    <div class="toast-title">${escapeHtml(title)}</div>
    ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ""}
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add("show"); }); });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

/* ============================================================
   Inject Gov Topbar (if not already present via HTML)
   ============================================================ */
function injectGovTopbarIfNeeded() {
  if (document.querySelector(".gov-topbar")) return;

  const topbar = document.createElement("div");
  topbar.className = "gov-topbar";
  topbar.setAttribute("role", "banner");
  topbar.innerHTML = `
    <span>🏛</span>
    <span style="font-weight:700;">Politeknik Pengayoman Indonesia — Kementerian Hukum RI</span>
    <div style="width:1px;height:14px;background:rgba(255,255,255,0.3);margin:0 4px;"></div>
    <span style="font-size:11.5px;font-weight:400;color:rgba(255,255,255,0.8);" id="topbar-date-auto"></span>
    <div style="margin-left:auto;display:flex;gap:16px;">
      <a href="https://www.imigrasi.go.id" target="_blank" rel="noreferrer" 
         style="color:rgba(255,255,255,0.88);font-size:11.5px;font-weight:500;">Imigrasi.go.id</a>
      <a href="https://www.kemenkumham.go.id" target="_blank" rel="noreferrer" 
         style="color:rgba(255,255,255,0.88);font-size:11.5px;font-weight:500;">Kemenkumham.go.id</a>
    </div>
  `;

  // Inline styles for gov-topbar (since CSS file might not have it if injected here)
  Object.assign(topbar.style, {
    position: "fixed", top: "0", left: "0", right: "0", height: "38px",
    background: "linear-gradient(90deg, #cc0000, #a00000)",
    display: "flex", alignItems: "center", padding: "0 5vw",
    zIndex: "50", fontSize: "12px", color: "rgba(255,255,255,0.95)",
    fontWeight: "600", gap: "10px", letterSpacing: "0.2px"
  });

  document.body.insertBefore(topbar, document.body.firstChild);

  // Set date
  const dateEl = document.getElementById("topbar-date-auto");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }
}

/* ============================================================
   Init Layout
   ============================================================ */
async function initLayout() {
  // Inject gov topbar
  injectGovTopbarIfNeeded();

  await Promise.all([
    loadPartial("[data-site-header]", "partials/header.html"),
    loadPartial("[data-site-footer]", "partials/footer.html"),
  ]);

  const page    = document.body.dataset.page;
  const isAdmin = getUserRole() && getUserRole().startsWith("admin");
  const isLogged= isAuthenticated();

  // Set active nav link
  const activeLink = document.querySelector(`[data-page-link="${page}"]`);
  if (activeLink) activeLink.classList.add("active");

  // Role-based nav visibility
  const kotakMasukLink      = document.querySelector('[data-nav="kotak-masuk"]');
  const dashboardLink       = document.querySelector('[data-nav="dashboard"]');
  const kelolaPenggunaLink  = document.querySelector('[data-nav="kelola-pengguna"]');
  const pengaduanNavs       = document.querySelectorAll('[data-nav="pengaduan"]');
  const profilLink          = document.querySelector('[data-nav="profil"]');
  const loginLink           = document.querySelector('[data-nav="login"]');

  if (!isAdmin && kotakMasukLink) kotakMasukLink.style.display = "none";
  if (!isAdmin && dashboardLink) dashboardLink.style.display = "none";
  if (getUserRole() !== "admin" && kelolaPenggunaLink) kelolaPenggunaLink.style.display = "none";
  if (isAdmin) pengaduanNavs.forEach(el => el.style.display = "none");
  if (!isLogged && profilLink) profilLink.style.display = "none";

  // Login ↔ Logout toggle
  if (loginLink) {
    if (isLogged) {
      loginLink.textContent = "🚪 Logout";
      loginLink.href = "#";
      loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        ["sekdin-token", "user-role", "user-data"].forEach(k => localStorage.removeItem(k));
        showToast("Berhasil Keluar", "Anda telah berhasil logout.", "success");
        setTimeout(() => { window.location.href = "index.html"; }, 800);
      });
    } else {
      loginLink.textContent = "🔐 Login";
    }
  }

  // Page protection
  if (page === "pengaduan") {
    if (!isLogged) {
      return showModalAlert("Anda harus masuk terlebih dahulu untuk mengakses halaman ini.", "login.html");
    } else if (isAdmin) {
      return showModalAlert("Akses ditolak. Halaman Pengaduan hanya untuk pengguna umum.", "kotak-masuk.html");
    }
  }

  if (page === "profil" && !isLogged) {
    return showModalAlert("Anda harus masuk untuk melihat profil.", "login.html");
  }

  if (page === "dashboard") {
    if (!isLogged) {
      return showModalAlert("Anda harus masuk terlebih dahulu.", "login.html");
    } else if (!isAdmin) {
      return showModalAlert("Akses ditolak. Halaman ini hanya untuk Admin.", "index.html");
    }
  }

  if (page === "kelola-pengguna" && (!isLogged || getUserRole() !== "admin")) {
    return showModalAlert("Akses ditolak. Halaman ini hanya untuk Admin Utama.", "index.html");
  }
}

initLayout().catch(err => console.error("Gagal memuat layout:", err));
