    <script>
      let activeConvId = null;
      let activeParticipantId = null;
      let socket;

      function formatTime(isoStr) {
        const d = isoStr ? new Date(isoStr) : new Date();
        return d.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        }).replace(/\./g, ':') + " WIB";
      }

      const convListEl = document.getElementById("conversation-list");
      const chatMessagesEl = document.getElementById("admin-chat-messages");
      const chatHeaderEl = document.getElementById("active-chat-header");
      const chatInputEl = document.getElementById("admin-chat-input");
      const chatSendBtn = document.getElementById("admin-chat-send");

      function showNotification(title, message) {
        let container = document.getElementById("toast-container");
        if (!container) {
          container = document.createElement("div");
          container.id = "toast-container";
          container.style.position = "fixed";
          container.style.bottom = "20px";
          container.style.right = "20px";
          container.style.zIndex = "9999";
          container.style.display = "flex";
          container.style.flexDirection = "column";
          container.style.gap = "10px";
          document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.style.background = "white";
        toast.style.color = "#333";
        toast.style.padding = "15px 20px";
        toast.style.borderRadius = "8px";
        toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        toast.style.borderLeft = "5px solid #123a63";
        toast.style.minWidth = "250px";
        toast.style.transition = "all 0.3s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        
        toast.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px; color: #123a63;">${title}</div>
          <div style="font-size: 13px; color: #666;">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = "1";
          toast.style.transform = "translateY(0)";
        }, 10);

        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(-20px)";
          setTimeout(() => {
            toast.remove();
          }, 300);
        }, 4000);
      }

      function initSocket() {
        socket = io("http://localhost:3000");
        
        socket.on("connect", () => {
          socket.emit('join', 'admin_room');
          if (activeConvId) {
            socket.emit('join', `conv_${activeConvId}`);
          }
        });
        
        socket.on('new_conversation_update', (data) => {
          fetchConversations();
          
          const myId = JSON.parse(localStorage.getItem("user-data")).id;
          if (Number(data.senderId) !== Number(myId)) {
            if (Number(activeConvId) !== Number(data.conversationId)) {
              showNotification("Laporan / Pesan Baru", `${data.senderEmail || 'Peserta'}: "${data.lastMessage}"`);
            }
          }
        });

        socket.on('new_message', (msg) => {
          if (Number(msg.pengaduan_id) === Number(activeConvId)) {
            appendAdminMessage(msg);
          }
        });

        socket.on('status_change', (data) => {
          if (Number(data.conversationId) === Number(activeConvId)) {
            const statusSelect = document.getElementById("status-select");
            if (statusSelect) {
              statusSelect.value = data.status;
            }
            fetchConversations();
          }
        });

        socket.on('conversation_deleted', (data) => {
          fetchConversations();
          if (Number(data.conversationId) === Number(activeConvId)) {
            activeConvId = null;
            activeParticipantId = null;
            chatHeaderEl.innerHTML = "Pilih percakapan";
            chatMessagesEl.innerHTML = '<div style="text-align: center; color: var(--muted); margin-top: 50px;">Silakan pilih kotak masuk.</div>';
            chatInputEl.disabled = true;
            chatSendBtn.disabled = true;
            alert("Percakapan yang sedang Anda buka telah dihapus oleh Super Admin.");
          }
        });
      }

      let allConversations = [];
      let activeFilterStatus = "all";

      async function fetchConversations() {
        try {
          const res = await fetch(`${API_URL}/conversations`, {
            headers: { "Authorization": `Bearer ${getAuthToken()}` }
          });
          allConversations = await res.json();
          filterAndRenderConversations();
        } catch (error) {
          convListEl.innerHTML = '<div style="padding: 20px; color: red;">Gagal memuat percakapan.</div>';
        }
      }

      function filterAndRenderConversations() {
        const query = document.getElementById("search-input").value.toLowerCase().trim();
        const serviceFilter = document.getElementById("filter-service").value;
        const priorityFilter = document.getElementById("filter-priority").value;
        const sortFilter = document.getElementById("filter-sort").value;

        let filtered = allConversations.filter(c => {
          // Status filter
          if (activeFilterStatus !== "all" && c.status !== activeFilterStatus) {
            return false;
          }
          // Service Type filter
          if (serviceFilter !== "all" && c.service_type !== serviceFilter) {
            return false;
          }
          // Priority filter
          if (priorityFilter !== "all" && c.priority !== priorityFilter) {
            return false;
          }
          // Text query search
          if (query) {
            const email = (c.participant_email || "").toLowerCase();
            const fullname = (c.participant_fullname || "").toLowerCase();
            const category = (c.category || "").toLowerCase();
            const serviceType = (c.service_type || "").toLowerCase();
            const status = (c.status || "menunggu respon").toLowerCase();
            const lastMsg = (c.last_message || "").toLowerCase();
            const ticketId = (c.ticket_id || "").toLowerCase();
            
            const matchQuery = email.includes(query) || 
                   fullname.includes(query) || 
                   category.includes(query) || 
                   serviceType.includes(query) || 
                   status.includes(query) || 
                   lastMsg.includes(query) ||
                   ticketId.includes(query);
            if (!matchQuery) return false;
          }
          
          return true;
        });
        
        // Sorting
        filtered.sort((a, b) => {
          if (sortFilter === "unread") {
            const aUnread = a.unread_count || 0;
            const bUnread = b.unread_count || 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
          }
          
          const timeA = new Date(a.last_message_time || a.created_at).getTime();
          const timeB = new Date(b.last_message_time || b.created_at).getTime();
          
          if (sortFilter === "oldest") {
            return timeA - timeB;
          }
          // newest (default)
          return timeB - timeA;
        });
        
        renderConversations(filtered);
      }

      function renderConversations(convs) {
        convListEl.innerHTML = "";
        if (convs.length === 0) {
          convListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted); font-size: 14px;">Tidak ada percakapan ditemukan</div>';
          return;
        }
        
        convs.forEach(c => {
          const div = document.createElement("div");
          div.className = `conv-item ${Number(activeConvId) === Number(c.id) ? 'active' : ''}`;
          
          const serviceType = c.service_type || "Layanan";
          const category = c.category || "Kategori";
          
          const unreadHtml = c.unread_count > 0 
            ? `<span style="background: #e53e3e; color: white; border-radius: 50%; font-size: 11px; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold;">${c.unread_count}</span>`
            : '';

          let statusColor = "#a0aec0";
          if (c.status === "Dalam Proses") statusColor = "#dd6b20";
          else if (c.status === "Selesai") statusColor = "#38a169";

          let prioColor = "#94a3b8"; // Sedang/Rendah
          if (c.priority === "Tinggi") prioColor = "#ef4444";

          const displayName = c.participant_fullname || c.participant_email;
          const formattedTime = c.last_message_time ? formatTime(c.last_message_time) : (c.created_at ? formatTime(c.created_at) : "");

          div.innerHTML = `
            <div style="font-weight: bold; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <span style="font-size: 13px; line-height: 1.2; word-break: break-all;">
                <span style="color: ${prioColor}; font-size: 11px; border: 1px solid ${prioColor}; padding: 1px 4px; border-radius: 4px; margin-right: 4px;">${c.priority || 'Sedang'}</span>
                ${displayName}
              </span>
              <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                ${unreadHtml}
                <span style="font-size: 10px; background: #e2e8f0; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${c.ticket_id || 'TKT'}</span>
              </div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: var(--navy); margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
              <span>${category}</span>
              <span style="font-size: 10px; color: white; background: ${statusColor}; padding: 1px 6px; border-radius: 4px; font-weight: 600;">${c.status || 'Menunggu Respon'}</span>
            </div>
            <div style="font-size: 12px; color: #666; display: flex; justify-content: space-between; align-items: center; margin-top: 2px; gap: 8px;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${escapeHtml(c.last_message) || 'Belum ada pesan'}</span>
              <span style="font-size: 10px; color: var(--muted); flex-shrink: 0;">${formattedTime}</span>
            </div>
          `;
          
          div.onclick = () => selectConversation(c);
          convListEl.appendChild(div);
        });
      }

      async function selectConversation(conv) {
        if (activeConvId) socket.emit('leave', `conv_${activeConvId}`);
        activeConvId = conv.id;
        activeParticipantId = conv.participant_id;
        socket.emit('join', `conv_${activeConvId}`);
        
        let attachmentHtml = "";
        if (conv.attachment) {
          try {
            const attach = JSON.parse(conv.attachment);
            attachmentHtml = `<a href="${attach.path}" target="_blank" style="margin-left: 15px; color: var(--accent); font-weight: bold; background: rgba(15, 107, 98, 0.1); padding: 4px 8px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">📎 Lampiran: ${attach.name}</a>`;
          } catch (e) {
            attachmentHtml = `<a href="${conv.attachment}" target="_blank" style="margin-left: 15px; color: var(--accent); font-weight: bold; background: rgba(15, 107, 98, 0.1); padding: 4px 8px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">📎 Unduh Lampiran</a>`;
          }
        }
        
        const deleteChatBtnHtml = getUserRole() === "admin"
          ? `<button id="btn-delete-chat" class="btn" style="background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 4px;" title="Hapus Percakapan">🗑️ Hapus</button>`
          : "";

        chatHeaderEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 10px;">
            <div>
              <span style="font-weight: bold; color: var(--accent); margin-right: 5px;">[${conv.ticket_id || 'TKT'}]</span>
              <span>${conv.participant_fullname || conv.participant_email}</span>
              <span style="font-size: 12px; background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; margin-left: 10px; font-weight: 600;">${conv.service_type || 'Layanan'}: ${conv.category || 'Kategori'}</span>
              ${conv.rating ? `<span style="font-size: 11px; margin-left: 10px; color: #d97706; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⭐ Rating: ${conv.rating}/5</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              ${attachmentHtml}
              <div style="display: flex; align-items: center; gap: 5px;">
                <label for="status-select" style="font-size: 12px; font-weight: bold; color: var(--muted);">Status:</label>
                <select id="status-select" style="font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); font-family: inherit; font-weight: bold; color: var(--navy); background: white; cursor: pointer;">
                  <option value="Menunggu Respon" ${conv.status === 'Menunggu Respon' ? 'selected' : ''}>Menunggu Respon</option>
                  <option value="Dalam Proses" ${conv.status === 'Dalam Proses' ? 'selected' : ''}>Dalam Proses</option>
                  <option value="Selesai" ${conv.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                </select>
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <label for="priority-select" style="font-size: 12px; font-weight: bold; color: var(--muted);">Prioritas:</label>
                <select id="priority-select" style="font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); font-family: inherit; font-weight: bold; color: var(--navy); background: white; cursor: pointer;" onchange="updatePriority(${conv.id}, this.value)">
                  <option value="Rendah" ${conv.priority === 'Rendah' ? 'selected' : ''}>Rendah</option>
                  <option value="Sedang" ${conv.priority === 'Sedang' ? 'selected' : ''}>Sedang</option>
                  <option value="Tinggi" ${conv.priority === 'Tinggi' ? 'selected' : ''}>Tinggi</option>
                </select>
              </div>
              ${deleteChatBtnHtml}
            </div>
          </div>
          ${conv.feedback ? `<div style="width: 100%; margin-top: 10px; font-size: 12px; color: #475569; background: #f8fafc; padding: 8px 12px; border-left: 3px solid #f59e0b;"><strong>Komentar Ulasan:</strong> "${escapeHtml(conv.feedback)}"</div>` : ''}
          <div style="width: 100%; margin-top: 10px; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px;">
            <span style="font-size: 11px; color: var(--muted); display: flex; align-items: center;">Balasan Cepat:</span>
            <button class="btn-canned" onclick="insertCannedResponse('Terima kasih, laporan Anda telah kami terima dan sedang dalam penanganan petugas kami.')">Terima Kasih</button>
            <button class="btn-canned" onclick="insertCannedResponse('Mohon maaf atas ketidaknyamanan ini. Kami membutuhkan waktu sedikit lebih lama untuk mengeceknya.')">Mohon Maaf</button>
            <button class="btn-canned" onclick="insertCannedResponse('Laporan Anda sudah selesai kami proses. Terima kasih telah menghubungi layanan Sekdin Poltekpin.')">Selesai</button>
          </div>
        `;
        
        window.updateStatus = async function(convId, status) {
          try {
            const res = await fetch(`${API_URL}/conversations/${convId}/status`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getAuthToken()}`
              },
              body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Gagal");
            showNotification("Berhasil", "Status tiket berhasil diperbarui.");
          } catch (error) {
            alert("Gagal memperbarui status");
            fetchConversations();
          }
        };

        window.updatePriority = async function(convId, priority) {
          try {
            const res = await fetch(`${API_URL}/conversations/${convId}/priority`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getAuthToken()}`
              },
              body: JSON.stringify({ priority })
            });
            if (!res.ok) throw new Error("Gagal");
            showNotification("Berhasil", "Prioritas tiket berhasil diperbarui.");
            fetchConversations();
          } catch (error) {
            alert("Gagal memperbarui prioritas");
            fetchConversations();
          }
        };

        window.insertCannedResponse = function(text) {
          const input = document.getElementById("admin-chat-input");
          if (input && !input.disabled) {
            input.value = text;
            input.focus();
          }
        };

        const statusSelect = document.getElementById("status-select");
        statusSelect.onchange = async () => {
          await updateStatus(conv.id, statusSelect.value);
          fetchConversations();
        };

        const btnDeleteChat = document.getElementById("btn-delete-chat");
        if (btnDeleteChat) {
          btnDeleteChat.onclick = async () => {
            if (!confirm("Apakah Anda yakin ingin menghapus seluruh percakapan ini secara permanen? Semua pesan dan lampiran terkait akan ikut terhapus.")) {
              return;
            }

            try {
              const res = await fetch(`${API_URL}/conversations/${conv.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${getAuthToken()}` }
              });

              if (res.ok) {
                alert("Percakapan berhasil dihapus.");
                // Reset chat window details
                activeConvId = null;
                activeParticipantId = null;
                chatHeaderEl.innerHTML = "Pilih percakapan";
                chatMessagesEl.innerHTML = '<div style="text-align: center; color: var(--muted); margin-top: 50px;">Silakan pilih kotak masuk.</div>';
                chatInputEl.disabled = true;
                chatSendBtn.disabled = true;
                fetchConversations();
              } else {
                const err = await res.json();
                alert(err.message || "Gagal menghapus percakapan.");
              }
            } catch (e) {
              alert("Kesalahan koneksi.");
            }
          };
        }

        chatInputEl.disabled = false;
        chatSendBtn.disabled = false;
        
        const res = await fetch(`${API_URL}/messages/${activeConvId}`, {
          headers: { "Authorization": `Bearer ${getAuthToken()}` }
        });
        const messages = await res.json();
        chatMessagesEl.innerHTML = "";
        messages.forEach(appendAdminMessage);
        allConversations = await (await fetch(`${API_URL}/conversations`, { headers: { "Authorization": `Bearer ${getAuthToken()}` } })).json();
        filterAndRenderConversations();
      }

      function appendAdminMessage(m) {
        const div = document.createElement("div");
        const isMe = m.sender_id === JSON.parse(localStorage.getItem("user-data")).id;
        div.className = `msg-row ${isMe ? 'msg-row-me' : 'msg-row-other'}`;
        
        let attachmentHtml = "";
        if (m.attachment) {
          try {
            const attach = JSON.parse(m.attachment);
            const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(attach.name);
            
            if (isImage) {
              attachmentHtml = `
                <div style="margin-top: 8px; max-width: 280px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <a href="${attach.path}" target="_blank">
                    <img src="${attach.path}" alt="${attach.name}" style="width: 100%; height: auto; display: block; max-height: 200px; object-fit: cover;">
                  </a>
                </div>
              `;
            } else {
              attachmentHtml = `
                <div style="margin-top: 8px; font-size: 13px;">
                  <a href="${attach.path}" target="_blank" style="color: ${isMe ? 'white' : 'var(--accent)'}; font-weight: bold; background: ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(15, 107, 98, 0.1)'}; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                    📎 ${attach.name}
                  </a>
                </div>
              `;
            }
          } catch (e) {
            const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(m.attachment);
            if (isImage) {
              attachmentHtml = `
                <div style="margin-top: 8px; max-width: 280px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <a href="${m.attachment}" target="_blank">
                    <img src="${m.attachment}" alt="Lampiran Gambar" style="width: 100%; height: auto; display: block; max-height: 200px; object-fit: cover;">
                  </a>
                </div>
              `;
            } else {
              attachmentHtml = `
                <div style="margin-top: 8px; font-size: 13px;">
                  <a href="${m.attachment}" target="_blank" style="color: ${isMe ? 'white' : 'var(--accent)'}; font-weight: bold; background: ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(15, 107, 98, 0.1)'}; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                    📎 Unduh Lampiran
                  </a>
                </div>
              `;
            }
          }
        }

        const messageContent = m.message 
          ? `<div class="msg-bubble ${isMe ? 'msg-admin' : 'msg-user'}">${escapeHtml(m.message)}${attachmentHtml}</div>`
          : `<div class="msg-bubble ${isMe ? 'msg-admin' : 'msg-user'}">${attachmentHtml}</div>`;

        const senderName = isMe ? 'Anda' : (m.sender_fullname || m.sender_email || 'Peserta');
        const timeStr = formatTime(m.created_at);

        div.innerHTML = `
          <div class="msg-sender">${senderName}</div>
          ${messageContent}
          <div class="msg-time">${timeStr}</div>
        `;

        chatMessagesEl.appendChild(div);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }

      chatSendBtn.onclick = async () => {
        const message = chatInputEl.value.trim();
        if (!message || !activeParticipantId) return;
        await fetch(`${API_URL}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getAuthToken()}` },
          body: JSON.stringify({ message, conversationId: activeConvId, participantId: activeParticipantId })
        });
        chatInputEl.value = "";
      };

      // Search and Filter Event Listeners
      document.getElementById("search-input").oninput = filterAndRenderConversations;

      document.querySelectorAll(".filter-tab").forEach(tab => {
        tab.onclick = () => {
          document.querySelectorAll(".filter-tab").forEach(t => {
            t.classList.remove("active");
            t.style.background = "#e2e8f0";
            t.style.color = "#4a5568";
          });
          tab.classList.add("active");
          tab.style.background = "var(--blue)";
          tab.style.color = "white";
          
          activeFilterStatus = tab.getAttribute("data-status");
          filterAndRenderConversations();
        };
      });

      // Export Report to Excel (XLSX Format)
      const exportBtn = document.getElementById("btn-export-report");
      if (exportBtn) {
        exportBtn.onclick = async () => {
          exportBtn.disabled = true;
          exportBtn.textContent = "Mengunduh...";
          
          try {
            const res = await fetch(`${API_URL}/admin/reports`, {
              headers: { "Authorization": `Bearer ${getAuthToken()}` }
            });
            
            if (!res.ok) {
              const err = await res.json();
              alert(err.message || "Gagal mengunduh laporan.");
              return;
            }
            
            const data = await res.json();
            if (data.length === 0) {
              alert("Tidak ada data laporan untuk diekspor.");
              return;
            }

            // Map data to Excel JSON rows
            const rows = data.map((item, index) => {
              const askTime = item.first_message_time || item.conversation_created_at;
              const formattedTime = askTime 
                ? new Date(askTime).toLocaleString("id-ID", { 
                    timeZone: "Asia/Jakarta",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) + " WIB"
                : "-";
                
              return {
                "No": index + 1,
                "ID Percakapan": item.conversation_id,
                "Nama Lengkap Penanya": item.participant_fullname || "-",
                "NIK": item.participant_nik || "-",
                "Email": item.participant_email || "-",
                "No. Telepon": item.participant_phone || "-",
                "Jenis Layanan": item.service_type || "-",
                "Kategori": item.category || "-",
                "Pertanyaan Pertama (Pesan Pembuka)": item.first_message || "Belum ada pesan",
                "Tanggal & Jam Menanyakan": formattedTime,
                "Status Pengaduan": item.status || "Menunggu Respon"
              };
            });

            // Create SheetJS Worksheet and Workbook
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pengaduan");

            // Set column widths for a clean presentation
            worksheet["!cols"] = [
              { wch: 5 },   // No
              { wch: 15 },  // ID Percakapan
              { wch: 25 },  // Nama Lengkap Penanya
              { wch: 20 },  // NIK
              { wch: 25 },  // Email
              { wch: 18 },  // No. Telepon
              { wch: 15 },  // Jenis Layanan
              { wch: 15 },  // Kategori
              { wch: 45 },  // Pertanyaan Pertama
              { wch: 25 },  // Tanggal & Jam Menanyakan
              { wch: 18 }   // Status Pengaduan
            ];

            // Trigger xlsx file download
            XLSX.writeFile(workbook, `Laporan_Pengaduan_Sekdin_${new Date().toISOString().slice(0, 10)}.xlsx`);
            
          } catch (e) {
            console.error(e);
            alert("Kesalahan koneksi saat mengunduh laporan.");
          } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = "📥 Ekspor Laporan (Excel)";
          }
        };
      }

      const myRole = getUserRole();
      if (myRole && myRole.startsWith("admin")) {
        initSocket();
        fetchConversations();
      } else {
        window.location.href = "login.html";
      }

      const exportBtn = document.getElementById("btn-export-report");
      if (exportBtn) {
        exportBtn.onclick = () => {
          if (!allConversations || allConversations.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
          }
          
          const data = allConversations.map(c => ({
            "ID Tiket": c.ticket_id || "-",
            "Pelapor": c.participant_fullname || c.participant_email,
            "Email": c.participant_email,
            "Layanan": c.service_type || "-",
            "Kategori": c.category || "-",
            "Prioritas": c.priority || "Sedang",
            "Status": c.status || "Menunggu Respon",
            "Rating CSAT": c.rating ? `${c.rating}/5` : "Belum Dinilai",
            "Komentar": c.feedback || "-",
            "Pesan Terakhir": c.last_message || "-",
            "Waktu Dibuat": c.created_at ? formatTime(c.created_at) : "-"
          }));
          
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
          XLSX.writeFile(workbook, `Laporan_Sekdin_Poltekpin_${new Date().toISOString().split('T')[0]}.xlsx`);
        };
      }
    </script>
