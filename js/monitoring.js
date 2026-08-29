/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Realtime Monitoring & Violation Controller (v3.6 Update)
 * Remote Session Termination, Log Deletions, Date/Name Filters
 */

const MonitoringManager = {
  async init() {
    this.renderActiveSessionsTable();
    this.renderViolationsTable();
    this.setupRealtimeSync();
  },

  /* --------------------------------------------------------------------------
     LIVE SESSION MONITORING & REMOTE TERMINATION
  -------------------------------------------------------------------------- */
  async renderActiveSessionsTable() {
    const tableBody = document.getElementById('activeSessionsTableBody');
    if (!tableBody) return;

    const sessions = await window.DB.getActiveSessions();
    tableBody.innerHTML = '';

    if (!sessions || sessions.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2.5rem;" class="text-muted">Tidak ada sesi ujian yang tercatat saat ini.</td></tr>`;
      return;
    }

    sessions.forEach((sess, idx) => {
      let statusBadge = `<span class="badge badge-success"><span class="status-dot active"></span> AKTIF</span>`;
      if (sess.status === 'terminated') {
        statusBadge = `<span class="badge badge-danger">DIHENTIKAN PAKSA</span>`;
      } else if (sess.status === 'suspicious' || sess.violation_count >= 3) {
        statusBadge = `<span class="badge badge-danger"><span class="status-dot danger"></span> MENCURIGAKAN</span>`;
      } else if (sess.violation_count > 0) {
        statusBadge = `<span class="badge badge-warning"><span class="status-dot warning"></span> PERINGATAN (${sess.violation_count})</span>`;
      } else if (sess.status === 'completed') {
        statusBadge = `<span class="badge badge-neutral">SELESAI</span>`;
      } else if (sess.status === 'expired') {
        statusBadge = `<span class="badge badge-neutral">WAKTU HABIS</span>`;
      }

      const isLive = sess.status === 'active' || sess.status === 'suspicious';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align:center; font-weight:700; color:var(--text-subtle);">${idx + 1}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-main);">${sess.student_name || 'Peserta Ujian'}</div>
          <div style="font-size: 0.775rem; font-family: var(--font-mono); color: var(--primary-700);">No: ${sess.student_number || '-'}</div>
        </td>
        <td><span class="badge badge-accent">${sess.class_name || '-'}</span></td>
        <td><div style="font-weight: 700; font-size: 0.85rem;">${sess.exam_title || 'Ujian'}</div></td>
        <td><span class="badge badge-neutral">${sess.device_type || 'Desktop'}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.825rem;">${Utils.formatTime(sess.started_at)}</td>
        <td style="font-family: var(--font-mono); font-size: 0.825rem;">${Utils.formatTime(sess.expires_at)}</td>
        <td style="text-align:center;">
          <span class="badge ${sess.violation_count > 0 ? 'badge-danger' : 'badge-neutral'}" style="font-weight:800;">
            ${sess.violation_count || 0}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap: 0.35rem; flex-wrap:wrap; align-items:center;">
            ${isLive ? `
              <button class="btn btn-sm btn-danger" onclick="MonitoringManager.terminateSession('${sess.id}')" title="Keluarkan siswa dari ujian secara paksa">
                🚫 Keluarkan
              </button>
            ` : (sess.status === 'reset_by_admin' ? `
              <span class="badge badge-success">Kunci Terbuka</span>
            ` : `
              <button class="btn btn-sm btn-outline" style="color:var(--primary-700); border-color:var(--primary-600); font-weight:700;" onclick="AdminController.unlockStudentSession('${sess.id}')" title="Buka kunci agar siswa bisa masuk lagi">
                🔓 Buka Kunci
              </button>
            `)}
            <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="MonitoringManager.deleteSession('${sess.id}')" title="Hapus log sesi ini">
              🗑️
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  async terminateSession(sessionId) {
    if (!confirm('⚠️ KONFIRMASI PENGELUARAN SISWA:\nApakah Anda yakin ingin MENGELUARKAN PAKSA siswa ini dari ujian? Layar siswa akan langsung terkunci dan sesi ujian dihentikan.')) {
      return;
    }

    await window.DB.updateSessionStatus(sessionId, 'terminated');
    
    // Log termination event
    const sessions = await window.DB.getActiveSessions();
    const sess = sessions.find(s => s.id === sessionId);
    if (sess) {
      await window.DB.logViolation(sess.session_identifier, 'PROCTOR_FORCED_TERMINATION', {
        reason: 'Dihentikan secara paksa oleh Pengawas / Proktor.',
        admin_action: 'FORCE_EXIT'
      });
    }

    Utils.showToast('Siswa Dikeluarkan', 'Sesi ujian siswa telah dihentikan secara paksa.', 'error');
    this.renderActiveSessionsTable();
    this.renderViolationsTable();
    if (window.AdminController) {
      AdminController.refreshDashboardKPIs();
      AdminController.renderAttendanceTable();
    }
  },

  async deleteSession(sessionId) {
    if (!confirm('Hapus catatan log sesi ini?')) return;
    await window.DB.deleteSession(sessionId);
    Utils.showToast('Dihapus', 'Log sesi berhasil dihapus.', 'info');
    this.renderActiveSessionsTable();
    if (window.AdminController) {
      AdminController.refreshDashboardKPIs();
      AdminController.renderAttendanceTable();
    }
  },

  async clearAllSessions() {
    const sessions = await window.DB.getActiveSessions();
    if (!sessions.length) {
      Utils.showToast('Kosong', 'Log sesi memang sudah kosong.', 'info');
      return;
    }

    if (!confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA (${sessions.length}) log sesi siswa?`)) {
      return;
    }

    await window.DB.clearAllSessions();
    Utils.showToast('Dibersihkan', 'Seluruh log sesi ujian telah dihapus.', 'info');
    this.renderActiveSessionsTable();
    if (window.AdminController) {
      AdminController.refreshDashboardKPIs();
      AdminController.renderAttendanceTable();
    }
  },

  async markCompleted(sessionId) {
    await window.DB.updateSessionStatus(sessionId, 'completed');
    Utils.showToast('Status Diperbarui', 'Sesi ditandai selesai.', 'success');
    this.renderActiveSessionsTable();
  },

  /* --------------------------------------------------------------------------
     LOG PELANGGARAN SISWA (WITH DATE & NAME FILTERS AND DELETIONS)
  -------------------------------------------------------------------------- */
  async renderViolationsTable() {
    const tableBody = document.getElementById('violationsTableBody');
    if (!tableBody) return;

    const dateFilter = document.getElementById('violationDateFilter')?.value || '';
    const query = (document.getElementById('violationSearchInput')?.value || '').trim().toLowerCase();
    const severityFilter = document.getElementById('violationSeverityFilter')?.value || '';

    let violations = await window.DB.getAllViolations();

    if (dateFilter) {
      violations = violations.filter(v => {
        const vDate = new Date(v.event_time).toISOString().split('T')[0];
        return vDate === dateFilter;
      });
    }

    if (query) {
      violations = violations.filter(v => 
        (v.student_name || '').toLowerCase().includes(query) ||
        (v.student_number || '').toLowerCase().includes(query) ||
        (v.class_name || '').toLowerCase().includes(query) ||
        (v.event_type || '').toLowerCase().includes(query)
      );
    }

    if (severityFilter) {
      violations = violations.filter(v => (v.severity || '').toUpperCase().includes(severityFilter));
    }

    tableBody.innerHTML = '';

    if (!violations || violations.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem;" class="text-muted">Tidak ada catatan pelanggaran yang sesuai dengan filter.</td></tr>`;
      return;
    }

    violations.forEach((v, idx) => {
      let sevBadge = 'badge-warning';
      if (v.severity === 'CRITICAL' || v.severity === 'FINAL WARNING') sevBadge = 'badge-danger';
      else if (v.severity === 'INFO') sevBadge = 'badge-neutral';

      const d = new Date(v.event_time);
      const pad = (n) => String(n).padStart(2, '0');
      const dateFormatted = `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      let metaText = '';
      if (typeof v.metadata === 'object') {
        metaText = Object.entries(v.metadata || {}).map(([k, val]) => `${k}: ${val}`).join(' | ');
      } else {
        metaText = String(v.metadata || '-');
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align:center; font-weight:700; color:var(--text-subtle);">${idx + 1}</td>
        <td style="font-family: var(--font-mono); font-size: 0.825rem; white-space: nowrap;">${dateFormatted}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-main);">${v.student_name || 'Peserta Ujian'}</div>
          <div style="font-size: 0.775rem; font-family: var(--font-mono); color: var(--primary-700);">No: ${v.student_number || '-'}</div>
        </td>
        <td><span class="badge badge-accent">${v.class_name || '-'}</span></td>
        <td><code style="background:var(--bg-surface-muted); padding:0.2rem 0.4rem; border-radius:var(--radius-sm);">${v.event_type}</code></td>
        <td><span class="badge ${sevBadge}">${v.severity}</span></td>
        <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${metaText}">
          ${metaText || '-'}
        </td>
        <td>
          <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="MonitoringManager.deleteViolation('${v.id}')" title="Hapus catatan pelanggaran ini">
            🗑️ Hapus
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  async deleteViolation(violationId) {
    if (!confirm('Hapus catatan log pelanggaran ini?')) return;
    await window.DB.deleteViolation(violationId);
    Utils.showToast('Dihapus', 'Catatan pelanggaran telah dihapus.', 'info');
    this.renderViolationsTable();
    if (window.AdminController) AdminController.refreshDashboardKPIs();
  },

  async clearAllViolations() {
    const violations = await window.DB.getAllViolations();
    if (!violations.length) {
      Utils.showToast('Kosong', 'Log pelanggaran memang sudah kosong.', 'info');
      return;
    }

    if (!confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA (${violations.length}) log catatan pelanggaran?`)) {
      return;
    }

    await window.DB.clearAllViolations();
    Utils.showToast('Dibersihkan', 'Seluruh log pelanggaran telah dihapus.', 'info');
    this.renderViolationsTable();
    if (window.AdminController) AdminController.refreshDashboardKPIs();
  },

  resetViolationFilters() {
    const dateInput = document.getElementById('violationDateFilter');
    const searchInput = document.getElementById('violationSearchInput');
    const sevSelect = document.getElementById('violationSeverityFilter');

    if (dateInput) dateInput.value = '';
    if (searchInput) searchInput.value = '';
    if (sevSelect) sevSelect.value = '';

    this.renderViolationsTable();
  },

  setupRealtimeSync() {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        const activeTab = document.querySelector('.sidebar-item.active')?.dataset.tab;
        if (activeTab === 'monitoring') this.renderActiveSessionsTable();
        if (activeTab === 'violations') this.renderViolationsTable();
      }
    }, 4000);
  }
};

window.MonitoringManager = MonitoringManager;
