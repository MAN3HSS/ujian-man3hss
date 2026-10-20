/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Pengaduan Siswa
 *  - Halaman siswa : tombol PENGADUAN + formulir (3 kolom)
 *  - Halaman admin : menu "Hasil Pengaduan" (tabel, filter, tandai selesai, hapus)
 *
 * Semua teks dari pengguna ditampilkan lewat textContent (bukan innerHTML),
 * jadi tidak bisa dipakai menyisipkan kode ke halaman.
 */
const ComplaintsManager = {
  COOLDOWN_MS: 60 * 1000,
  COOLDOWN_KEY: 'last_complaint_sent_at',
  _cache: [],

  /* ==========================================================
     SISI SISWA
  ========================================================== */
  async initStudentMenu() {
    const btn = document.getElementById('btnOpenComplaint');
    if (!btn) return;

    // Tombol tampil kecuali Admin mematikannya di Pengaturan.
    let enabled = true;
    try {
      const settings = await window.DB.getSettings();
      enabled = settings.menu_pengaduan_enabled !== false;
    } catch (e) {
      enabled = true;
    }
    btn.style.display = enabled ? '' : 'none';

    const modal = document.getElementById('complaintModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  openModal() {
    const modal = document.getElementById('complaintModal');
    if (!modal) return;

    ['complaintSuspectedName', 'complaintRoom', 'complaintDescription'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this._showError('');
    document.getElementById('complaintFormArea').style.display = 'block';
    document.getElementById('complaintSuccessArea').style.display = 'none';
    document.getElementById('btnSubmitComplaint').style.display = 'block';
    this._updateCounter();

    modal.classList.add('active');
    const box = modal.querySelector('.modal-container');
    if (box) box.scrollTop = 0;
  },

  closeModal() {
    const modal = document.getElementById('complaintModal');
    if (modal) modal.classList.remove('active');
  },

  _updateCounter() {
    const desc = document.getElementById('complaintDescription');
    const counter = document.getElementById('complaintDescCounter');
    if (desc && counter) counter.textContent = `${desc.value.length}/1000`;
  },

  _showError(msg) {
    const el = document.getElementById('complaintErrorMsg');
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  },

  async submit() {
    const name = (document.getElementById('complaintSuspectedName').value || '').trim();
    const room = (document.getElementById('complaintRoom').value || '').trim();
    const desc = (document.getElementById('complaintDescription').value || '').trim();
    const btn = document.getElementById('btnSubmitComplaint');

    this._showError('');

    if (!name || !room || !desc) {
      this._showError('Semua kolom wajib diisi.');
      return;
    }

    // Jeda antar pengiriman (mengurangi pengiriman berulang/iseng dari perangkat yang sama)
    let last = 0;
    try { last = parseInt(localStorage.getItem(this.COOLDOWN_KEY) || '0', 10) || 0; } catch (e) { last = 0; }
    const waitMs = this.COOLDOWN_MS - (Date.now() - last);
    if (waitMs > 0) {
      this._showError(`Mohon tunggu ${Math.ceil(waitMs / 1000)} detik sebelum mengirim pengaduan lagi.`);
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }
    try {
      await window.DB.submitComplaint({ suspected_name: name, room: room, description: desc });
      try { localStorage.setItem(this.COOLDOWN_KEY, String(Date.now())); } catch (e) { /* abaikan */ }

      document.getElementById('complaintFormArea').style.display = 'none';
      document.getElementById('complaintSuccessArea').style.display = 'block';
      if (btn) btn.style.display = 'none';
    } catch (err) {
      console.warn('Gagal mengirim pengaduan:', err);
      this._showError('Pengaduan gagal dikirim. Periksa koneksi internet lalu coba lagi.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'KIRIM PENGADUAN'; }
    }
  },

  /* ==========================================================
     SISI ADMIN
  ========================================================== */
  _toDate(c) {
    const t = c && c.created_at;
    if (!t) return null;
    const d = (typeof t.toDate === 'function') ? t.toDate() : new Date(t);
    return isNaN(d.getTime()) ? null : d;
  },

  _formatWita(date) {
    if (!date) return '-';
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  },

  async _waitForAuth() {
    try {
      if (window.DB && window.DB.authReady) await window.DB.authReady;
    } catch (e) { /* abaikan */ }
  },

  async refreshBadge() {
    const badge = document.getElementById('complaintNewBadge');
    if (!badge) return;
    try {
      await this._waitForAuth();
      const list = await window.DB.getComplaints();
      this._cache = list;
      this._applyBadge(list);
    } catch (e) {
      badge.style.display = 'none';
    }
  },

  _applyBadge(list) {
    const badge = document.getElementById('complaintNewBadge');
    if (!badge) return;
    const total = list.filter(c => c.status !== 'selesai').length;
    badge.textContent = String(total);
    badge.style.display = total > 0 ? 'inline-block' : 'none';
  },

  _cell(text, styles) {
    const td = document.createElement('td');
    td.textContent = text;
    if (styles) td.style.cssText = styles;
    return td;
  },

  async renderAdminTable() {
    const body = document.getElementById('complaintsTableBody');
    if (!body) return;

    await this._waitForAuth();

    let list;
    try {
      list = await window.DB.getComplaints();
    } catch (err) {
      console.warn('Gagal memuat pengaduan:', err);
      body.replaceChildren();
      const tr = document.createElement('tr');
      const td = this._cell('Gagal memuat data pengaduan. Pastikan Anda login sebagai admin dan Firestore Rules sudah diperbarui.', 'text-align:center; padding:2rem; color:var(--danger);');
      td.colSpan = 7;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    this._cache = list;
    this._applyBadge(list);

    const statusFilter = document.getElementById('complaintStatusFilter')?.value || '';
    const query = (document.getElementById('complaintSearchInput')?.value || '').trim().toLowerCase();

    let rows = list;
    if (statusFilter === 'baru') rows = rows.filter(c => c.status !== 'selesai');
    if (statusFilter === 'selesai') rows = rows.filter(c => c.status === 'selesai');
    if (query) {
      rows = rows.filter(c =>
        (c.suspected_name || '').toLowerCase().includes(query) ||
        (c.room || '').toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query)
      );
    }

    const countEl = document.getElementById('complaintCountText');
    if (countEl) {
      const newCount = list.filter(c => c.status !== 'selesai').length;
      countEl.textContent = `Menampilkan ${rows.length} dari ${list.length} pengaduan • ${newCount} belum ditindaklanjuti`;
    }

    body.replaceChildren();

    if (rows.length === 0) {
      const tr = document.createElement('tr');
      const td = this._cell('Belum ada pengaduan yang cocok.', 'text-align:center; padding:2.5rem; color:var(--text-muted);');
      td.colSpan = 7;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    rows.forEach((c, idx) => {
      const tr = document.createElement('tr');
      const isDone = c.status === 'selesai';

      tr.appendChild(this._cell(String(idx + 1), 'text-align:center; font-weight:700; color:var(--text-subtle);'));
      tr.appendChild(this._cell(this._formatWita(this._toDate(c)), 'font-family:var(--font-mono); font-size:0.8rem; white-space:nowrap;'));
      tr.appendChild(this._cell(c.suspected_name || '-', 'font-weight:800; color:var(--text-main);'));
      tr.appendChild(this._cell(c.room || '-', 'font-weight:700;'));
      tr.appendChild(this._cell(c.description || '-', 'white-space:pre-wrap; word-break:break-word; min-width:240px; max-width:420px; font-size:0.875rem;'));

      const statusTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = isDone ? 'badge badge-success' : 'badge badge-danger';
      badge.textContent = isDone ? 'SUDAH DITINDAKLANJUTI' : 'BARU';
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);

      const actionTd = document.createElement('td');
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex; gap:0.35rem; flex-wrap:wrap;';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn-sm btn-secondary';
      toggleBtn.textContent = isDone ? '↩️ Tandai Baru' : '✅ Tandai Selesai';
      toggleBtn.addEventListener('click', () => this.toggleStatus(c.id, isDone ? 'baru' : 'selesai'));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-outline';
      delBtn.style.cssText = 'color:var(--danger); border-color:var(--danger);';
      delBtn.textContent = '🗑️ Hapus';
      delBtn.addEventListener('click', () => this.remove(c.id));

      wrap.appendChild(toggleBtn);
      wrap.appendChild(delBtn);
      actionTd.appendChild(wrap);
      tr.appendChild(actionTd);

      body.appendChild(tr);
    });
  },

  resetFilters() {
    const s = document.getElementById('complaintStatusFilter');
    const q = document.getElementById('complaintSearchInput');
    if (s) s.value = '';
    if (q) q.value = '';
    this.renderAdminTable();
  },

  async toggleStatus(id, newStatus) {
    try {
      await window.DB.updateComplaintStatus(id, newStatus);
      this.renderAdminTable();
    } catch (err) {
      console.warn(err);
      Utils.showToast('Gagal', 'Status pengaduan gagal diperbarui.', 'error');
    }
  },

  async remove(id) {
    if (!confirm('Hapus pengaduan ini? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await window.DB.deleteComplaint(id);
      Utils.showToast('Dihapus', 'Pengaduan berhasil dihapus.', 'success');
      this.renderAdminTable();
    } catch (err) {
      console.warn(err);
      Utils.showToast('Gagal', 'Pengaduan gagal dihapus.', 'error');
    }
  },

  async removeAll() {
    if (!this._cache.length) {
      Utils.showToast('Kosong', 'Tidak ada pengaduan untuk dihapus.', 'info');
      return;
    }
    if (!confirm(`⚠️ Hapus SEMUA ${this._cache.length} pengaduan? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await window.DB.deleteAllComplaints();
      Utils.showToast('Dibersihkan', 'Seluruh pengaduan berhasil dihapus.', 'success');
      this.renderAdminTable();
    } catch (err) {
      console.warn(err);
      Utils.showToast('Gagal', 'Pengaduan gagal dihapus.', 'error');
    }
  }
};

window.ComplaintsManager = ComplaintsManager;

document.addEventListener('DOMContentLoaded', () => {
  ComplaintsManager.initStudentMenu();
  // Di halaman admin: tampilkan jumlah pengaduan baru pada menu samping.
  if (document.getElementById('complaintNewBadge')) {
    setTimeout(() => ComplaintsManager.refreshBadge(), 600);
  }
});
