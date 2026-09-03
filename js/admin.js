/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Admin Dashboard Controller (v3.5 Update)
 * Master Data Siswa, Kehadiran Realtime, Exam & Class Management, Double Token Controls
 */

const AdminController = {
  currentTab: 'dashboard',
  user: null,

  async init() {
    this.user = await AuthManager.requireAuth();
    if (!this.user) return;

    this.renderUserProfile();
    this.setupNavigation();
    this.refreshDashboardKPIs();
    this.renderExamsAdminTable();
    this.renderClassesAdminTable();
    this.populateClassCheckboxes();
    this.populateStudentClassDropdowns();
    this.renderStudentsTable();
    this.renderAttendanceTable();
    this.loadSettingsForm();
    this.syncGlobalExamButtonState();

    if (window.MonitoringManager) {
      MonitoringManager.init();
    }
  },

  renderUserProfile() {
    const nameEl = document.getElementById('adminUserName');
    const roleEl = document.getElementById('adminUserRole');
    if (nameEl) nameEl.textContent = this.user.name;
    if (roleEl) roleEl.textContent = this.user.role.toUpperCase();
  },

  setupNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    document.querySelectorAll('.admin-tab-content').forEach(panel => {
      panel.style.display = panel.id === `tab-${tabName}` ? 'block' : 'none';
    });

    if (tabName === 'dashboard') this.refreshDashboardKPIs();
    if (tabName === 'exams') this.renderExamsAdminTable();
    if (tabName === 'classes') this.renderClassesAdminTable();
    if (tabName === 'students') this.renderStudentsTable();
    if (tabName === 'attendance') this.renderAttendanceTable();
    if (tabName === 'settings') this.loadSettingsForm();
    if (tabName === 'monitoring' && window.MonitoringManager) {
      MonitoringManager.renderActiveSessionsTable();
      MonitoringManager.renderViolationsTable();
    }
  },

  async refreshDashboardKPIs() {
    const metrics = await window.DB.getAdminMetrics();
    document.getElementById('kpiTotalExams').textContent = metrics.totalExams;
    document.getElementById('kpiActiveExams').textContent = metrics.activeExams;
    document.getElementById('kpiTotalClasses').textContent = metrics.totalClasses;
    document.getElementById('kpiActiveSessions').textContent = metrics.activeSessions;
    document.getElementById('kpiTodayViolations').textContent = metrics.todayViolations;

    this.renderRecentExamsMiniTable();
  },

  async renderRecentExamsMiniTable() {
    const tableBody = document.getElementById('recentExamsMiniBody');
    if (!tableBody) return;

    const exams = await window.DB.getAllExamsAdmin();
    tableBody.innerHTML = '';

    exams.slice(0, 5).forEach(exam => {
      const isActive = exam.status === 'active';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:700;">${exam.title}</td>
        <td>${exam.subject}</td>
        <td><span class="badge ${exam.type === 'Ujian Susulan' ? 'badge-accent' : 'badge-primary'}">${exam.type}</span></td>
        <td>${exam.duration_minutes} Menit</td>
        <td>
          <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
            ${isActive ? '🟢 AKTIF' : '🔴 NONAKTIF'}
          </span>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  /* --------------------------------------------------------------------------
     EXAMS MANAGEMENT & DATE FILTERS
  -------------------------------------------------------------------------- */
  async renderExamsAdminTable() {
    const tableBody = document.getElementById('adminExamsTableBody');
    if (!tableBody) return;

    const dateFilter = document.getElementById('adminExamDateFilter')?.value || '';
    const query = (document.getElementById('adminExamSearchInput')?.value || '').trim().toLowerCase();
    const typeFilter = document.getElementById('adminExamTypeFilter')?.value || '';
    const statusFilter = document.getElementById('adminExamStatusFilter')?.value || '';

    let exams = await window.DB.getAllExamsAdmin();

    if (dateFilter) {
      exams = exams.filter(e => {
        const sDate = new Date(e.start_at).toISOString().split('T')[0];
        const eDate = new Date(e.end_at).toISOString().split('T')[0];
        return sDate === dateFilter || eDate === dateFilter || (dateFilter >= sDate && dateFilter <= eDate);
      });
    }

    if (query) {
      exams = exams.filter(e => 
        (e.title || '').toLowerCase().includes(query) ||
        (e.subject || '').toLowerCase().includes(query) ||
        (e.token_masuk_plain || '').toLowerCase().includes(query)
      );
    }

    if (typeFilter) {
      exams = exams.filter(e => e.type === typeFilter);
    }

    if (statusFilter) {
      exams = exams.filter(e => e.status === statusFilter);
    }

    tableBody.innerHTML = '';

    if (!exams.length) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2.5rem;" class="text-muted">Tidak ada jadwal ujian yang sesuai dengan filter.</td></tr>`;
      return;
    }

    exams.forEach(exam => {
      const isActive = exam.status === 'active';
      const d = new Date(exam.start_at);
      const pad = (n) => String(n).padStart(2, '0');
      const dateText = `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())} WITA`;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div style="font-weight: 700; color:var(--text-main);">${exam.title}</div>
          <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 2px;">
            🔑 Masuk: <strong style="color:var(--primary-700); font-family:var(--font-mono);">${exam.token_masuk_plain || 'Terkonfigurasi'}</strong> | 
            🚪 Keluar: <strong style="color:var(--danger); font-family:var(--font-mono);">${exam.token_keluar_plain || 'SELESAI'}</strong>
          </div>
        </td>
        <td style="font-family:var(--font-mono); font-size:0.825rem;">
          <div>📅 ${dateText}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${exam.subject}</div>
        </td>
        <td><span class="badge ${exam.type === 'Ujian Susulan' ? 'badge-accent' : 'badge-primary'}">${exam.type}</span></td>
        <td>${exam.duration_minutes}m</td>
        <td>
          <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-danger'}" 
                  onclick="AdminController.toggleExamStatus('${exam.id}')" 
                  title="Klik untuk mengubah status aktif/nonaktif">
            ${isActive ? '🟢 AKTIF (TAMPIL)' : '🔴 NONAKTIF (SEMBUNYI)'}
          </button>
        </td>
        <td>
          <div style="display:flex; gap: 0.35rem; flex-wrap: wrap;">
            <button class="btn btn-sm btn-secondary" onclick="AdminController.openEditExamModal('${exam.id}')" title="Edit Ujian">Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="AdminController.duplicateExam('${exam.id}')" title="Duplikasi">Salin</button>
            <button class="btn btn-sm btn-accent" onclick="AdminController.openExamLinkModal('${exam.id}')" title="Link & QR untuk Scan Barcode / Link Ujian">🔗 Link/QR</button>
            <button class="btn btn-sm btn-danger" onclick="AdminController.deleteExam('${exam.id}')" title="Hapus">Hapus</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  filterExamsToday() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('adminExamDateFilter');
    if (dateInput) dateInput.value = today;
    this.renderExamsAdminTable();
  },

  resetExamFilters() {
    const dateInput = document.getElementById('adminExamDateFilter');
    const searchInput = document.getElementById('adminExamSearchInput');
    const typeSelect = document.getElementById('adminExamTypeFilter');
    const statusSelect = document.getElementById('adminExamStatusFilter');

    if (dateInput) dateInput.value = '';
    if (searchInput) searchInput.value = '';
    if (typeSelect) typeSelect.value = '';
    if (statusSelect) statusSelect.value = '';

    this.renderExamsAdminTable();
  },

  generateRandomTokenMasuk() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const input = document.getElementById('examFormTokenMasuk');
    if (input) {
      input.value = token;
      Utils.showToast('Token Masuk Dibuat', `Token acak baru: ${token}`, 'info');
    }
  },

  generateRandomTokenKeluar() {
    const digits = Math.floor(1000 + Math.random() * 9000);
    const prefixes = ['SELESAI', 'OUT', 'KLUAR', 'FINISH'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const token = `${prefix}-${digits}`;
    const input = document.getElementById('examFormTokenKeluar');
    if (input) {
      input.value = token;
      Utils.showToast('Token Keluar Dibuat', `Token acak baru: ${token}`, 'info');
    }
  },

  async toggleExamStatus(examId) {
    const newStatus = await window.DB.toggleExamStatus(examId);
    Utils.showToast('Status Diperbarui', `Ujian kini berstatus: ${newStatus.toUpperCase()}`, 'info');
    this.renderExamsAdminTable();
    this.refreshDashboardKPIs();
  },

  async openAddExamModal() {
    const settings = await window.DB.getSettings();
    document.getElementById('examFormModalTitle').textContent = 'Tambah Jadwal Ujian Baru';
    document.getElementById('examFormId').value = '';
    document.getElementById('examFormTitle').value = '';
    document.getElementById('examFormSubject').value = '';
    document.getElementById('examFormTypeSelect').value = 'Ujian Utama';
    document.getElementById('examFormUrl').value = '';
    document.getElementById('examFormTokenMasuk').value = '';
    document.getElementById('examFormTokenKeluar').value = 'SELESAI';
    document.getElementById('examFormDuration').value = '90';
    document.getElementById('examFormMaxViolations').value = settings.default_max_violations || 3;
    document.getElementById('examFormStatusSelect').value = 'active';
    document.getElementById('examFormDesc').value = '';

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toDatetimeLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    document.getElementById('examFormStart').value = toDatetimeLocal(now);
    document.getElementById('examFormEnd').value = toDatetimeLocal(new Date(now.getTime() + 18000000));

    await this.populateClassCheckboxes([]);
    document.getElementById('examFormModal').classList.add('active');
  },

  async openEditExamModal(examId) {
    const exams = await window.DB.getAllExamsAdmin();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    document.getElementById('examFormModalTitle').textContent = 'Edit Jadwal Ujian';
    document.getElementById('examFormId').value = exam.id;
    document.getElementById('examFormTitle').value = exam.title;
    document.getElementById('examFormSubject').value = exam.subject;
    document.getElementById('examFormTypeSelect').value = exam.type || 'Ujian Utama';
    document.getElementById('examFormUrl').value = exam.form_url;
    document.getElementById('examFormTokenMasuk').value = exam.token_masuk_plain || '';
    document.getElementById('examFormTokenKeluar').value = exam.token_keluar_plain || 'SELESAI';
    document.getElementById('examFormDuration').value = exam.duration_minutes || 90;
    document.getElementById('examFormMaxViolations').value = exam.max_violations || 3;
    document.getElementById('examFormStatusSelect').value = exam.status || 'active';
    document.getElementById('examFormDesc').value = exam.description || '';

    const pad = (n) => String(n).padStart(2, '0');
    const toDatetimeLocal = (d) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    document.getElementById('examFormStart').value = toDatetimeLocal(exam.start_at);
    document.getElementById('examFormEnd').value = toDatetimeLocal(exam.end_at);

    await this.populateClassCheckboxes(exam.classes || []);
    document.getElementById('examFormModal').classList.add('active');
  },

  closeExamFormModal() {
    document.getElementById('examFormModal').classList.remove('active');
  },

  async saveExamForm() {
    const title = document.getElementById('examFormTitle').value.trim();
    const subject = document.getElementById('examFormSubject').value.trim();
    const formUrl = document.getElementById('examFormUrl').value.trim();
    const tokenMasuk = document.getElementById('examFormTokenMasuk').value.trim().toUpperCase();
    const tokenKeluar = document.getElementById('examFormTokenKeluar').value.trim().toUpperCase() || 'SELESAI';
    const duration = parseInt(document.getElementById('examFormDuration').value) || 90;
    const maxViolations = parseInt(document.getElementById('examFormMaxViolations').value) || 3;
    const type = document.getElementById('examFormTypeSelect').value;
    const status = document.getElementById('examFormStatusSelect').value;
    const startAt = new Date(document.getElementById('examFormStart').value).toISOString();
    const endAt = new Date(document.getElementById('examFormEnd').value).toISOString();
    const desc = document.getElementById('examFormDesc').value.trim();
    const id = document.getElementById('examFormId').value;

    if (!title || !subject || !formUrl || !tokenMasuk) {
      Utils.showToast('Data Belum Lengkap', 'Harap isi judul, mata pelajaran, link Google Form, dan Token Masuk.', 'warning');
      return;
    }

    const selectedClasses = [];
    document.querySelectorAll('#examClassesCheckboxes input[type="checkbox"]:checked').forEach(cb => {
      selectedClasses.push(cb.value);
    });

    const tokenHash = await Utils.sha256(tokenMasuk);
    const tokenKeluarHash = await Utils.sha256(tokenKeluar);

    const examData = {
      title,
      subject,
      type,
      form_url: formUrl,
      token_masuk_plain: tokenMasuk,
      token_keluar_plain: tokenKeluar,
      token_hash: tokenHash,
      token_keluar_hash: tokenKeluarHash,
      duration_minutes: duration,
      max_violations: maxViolations,
      status,
      start_at: startAt,
      end_at: endAt,
      description: desc,
      classes: selectedClasses
    };

    if (id) examData.id = id;

    await window.DB.saveExam(examData);
    Utils.showToast('Berhasil', 'Jadwal ujian berhasil disimpan!', 'success');
    this.closeExamFormModal();
    this.renderExamsAdminTable();
    this.refreshDashboardKPIs();
  },

  async deleteExam(examId) {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ujian ini?')) return;
    await window.DB.deleteExam(examId);
    Utils.showToast('Dihapus', 'Jadwal ujian telah dihapus.', 'info');
    this.renderExamsAdminTable();
    this.refreshDashboardKPIs();
  },

  async duplicateExam(examId) {
    const exams = await window.DB.getAllExamsAdmin();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const copy = { ...exam };
    delete copy.id;
    copy.title = `${exam.title} (Salinan)`;
    await window.DB.saveExam(copy);
    Utils.showToast('Disalin', 'Jadwal ujian berhasil diduplikasi.', 'success');
    this.renderExamsAdminTable();
  },

  async populateClassCheckboxes(selectedIds = []) {
    const container = document.getElementById('examClassesCheckboxes');
    if (!container) return;

    const classes = await window.DB.getClasses();
    container.innerHTML = '';

    classes.forEach(c => {
      const isChecked = selectedIds.includes(c.id);
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.5rem';
      label.style.fontSize = '0.85rem';
      label.style.marginBottom = '0.35rem';
      label.style.cursor = 'pointer';

      label.innerHTML = `
        <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px;">
        <span><strong>${c.name}</strong> (${c.grade})</span>
      `;
      container.appendChild(label);
    });
  },

  /* --------------------------------------------------------------------------
     MASTER DATA SISWA & NO. PESERTA (NEW)
  -------------------------------------------------------------------------- */
  async populateStudentClassDropdowns() {
    const filterSelect = document.getElementById('adminStudentClassFilter');
    const modalSelect = document.getElementById('studentClassSelectModal');
    const attClassFilter = document.getElementById('attClassFilter');
    const classes = await window.DB.getClasses();

    if (filterSelect) {
      filterSelect.innerHTML = `<option value="">Semua Kelas</option>`;
      classes.forEach(c => filterSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }

    if (modalSelect) {
      modalSelect.innerHTML = `<option value="">-- Pilih Kelas --</option>`;
      classes.forEach(c => modalSelect.innerHTML += `<option value="${c.id}" data-name="${c.name}">${c.name} (${c.grade})</option>`);
    }

    if (attClassFilter) {
      attClassFilter.innerHTML = `<option value="">Semua Rombel</option>`;
      classes.forEach(c => attClassFilter.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }
  },

  selectedStudentIds: new Set(),

  async renderStudentsTable() {
    const tableBody = document.getElementById('adminStudentsTableBody');
    const countBadge = document.getElementById('studentCountBadge');
    const selectAllCb = document.getElementById('selectAllStudentsCheckbox');
    const btnDeleteSelected = document.getElementById('btnDeleteSelectedStudents');
    const countSpan = document.getElementById('selectedStudentCount');
    if (!tableBody) return;

    const query = (document.getElementById('adminStudentSearchInput')?.value || '').trim().toLowerCase();
    const classFilter = document.getElementById('adminStudentClassFilter')?.value || '';

    let students = await window.DB.getStudents();

    if (classFilter) {
      students = students.filter(s => s.class_name === classFilter);
    }
    if (query) {
      students = students.filter(s => 
        (s.full_name || '').toLowerCase().includes(query) ||
        (s.student_number || '').toLowerCase().includes(query)
      );
    }

    if (countBadge) countBadge.textContent = `Menampilkan ${students.length} Siswa`;

    tableBody.innerHTML = '';

    if (!students.length) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem;" class="text-muted">Belum ada data siswa yang cocok. Klik '+ Tambah Siswa Baru' atau 'Impor File Excel'.</td></tr>`;
      if (selectAllCb) selectAllCb.checked = false;
      if (btnDeleteSelected) btnDeleteSelected.style.display = 'none';
      return;
    }

    // Clean up selected IDs that are no longer present
    const currentIds = new Set(students.map(s => s.id));
    this.selectedStudentIds = new Set([...this.selectedStudentIds].filter(id => currentIds.has(id)));

    const allSelected = students.length > 0 && students.every(s => this.selectedStudentIds.has(s.id));
    if (selectAllCb) selectAllCb.checked = allSelected;

    if (btnDeleteSelected && countSpan) {
      countSpan.textContent = this.selectedStudentIds.size;
      btnDeleteSelected.style.display = this.selectedStudentIds.size > 0 ? 'inline-flex' : 'none';
    }

    students.forEach((st, idx) => {
      const isChecked = this.selectedStudentIds.has(st.id);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align:center;">
          <input type="checkbox" class="student-row-checkbox" value="${st.id}" ${isChecked ? 'checked' : ''} onchange="AdminController.onStudentCheckboxChange('${st.id}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
        </td>
        <td style="text-align:center; font-weight:700; color:var(--text-subtle);">${idx + 1}</td>
        <td><strong style="font-family:var(--font-mono); color:var(--primary-800);">${st.student_number || '-'}</strong></td>
        <td style="font-weight:700; color:var(--text-main);">${st.full_name}</td>
        <td><span class="badge badge-accent">${st.class_name || '-'}</span></td>
        <td><span class="badge badge-success">Aktif</span></td>
        <td>
          <div style="display:flex; gap: 0.35rem;">
            <button class="btn btn-sm btn-secondary" onclick="AdminController.openEditStudentModal('${st.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="AdminController.deleteStudent('${st.id}')">Hapus</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  toggleSelectAllStudents(checkboxEl) {
    const isChecked = checkboxEl.checked;
    const rowCheckboxes = document.querySelectorAll('.student-row-checkbox');
    
    rowCheckboxes.forEach(cb => {
      cb.checked = isChecked;
      if (isChecked) {
        this.selectedStudentIds.add(cb.value);
      } else {
        this.selectedStudentIds.delete(cb.value);
      }
    });

    const btnDeleteSelected = document.getElementById('btnDeleteSelectedStudents');
    const countSpan = document.getElementById('selectedStudentCount');
    if (btnDeleteSelected && countSpan) {
      countSpan.textContent = this.selectedStudentIds.size;
      btnDeleteSelected.style.display = this.selectedStudentIds.size > 0 ? 'inline-flex' : 'none';
    }
  },

  onStudentCheckboxChange(studentId, isChecked) {
    if (isChecked) {
      this.selectedStudentIds.add(studentId);
    } else {
      this.selectedStudentIds.delete(studentId);
    }

    const btnDeleteSelected = document.getElementById('btnDeleteSelectedStudents');
    const countSpan = document.getElementById('selectedStudentCount');
    const selectAllCb = document.getElementById('selectAllStudentsCheckbox');

    if (btnDeleteSelected && countSpan) {
      countSpan.textContent = this.selectedStudentIds.size;
      btnDeleteSelected.style.display = this.selectedStudentIds.size > 0 ? 'inline-flex' : 'none';
    }

    const rowCheckboxes = document.querySelectorAll('.student-row-checkbox');
    if (selectAllCb && rowCheckboxes.length > 0) {
      selectAllCb.checked = Array.from(rowCheckboxes).every(cb => cb.checked);
    }
  },

  async deleteSelectedStudents() {
    const count = this.selectedStudentIds.size;
    if (count === 0) return;

    if (!confirm(`Apakah Anda yakin ingin MENGHAPUS ${count} data siswa yang ditandai? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    const idsToDelete = Array.from(this.selectedStudentIds);
    await window.DB.deleteMultipleStudents(idsToDelete);
    this.selectedStudentIds.clear();
    
    Utils.showToast('Dihapus Massal', `${count} data siswa berhasil dihapus.`, 'info');
    this.renderStudentsTable();
    this.refreshDashboardKPIs();
  },

  async clearAllStudents() {
    const students = await window.DB.getStudents();
    if (!students.length) {
      Utils.showToast('Kosong', 'Data siswa memang sudah kosong.', 'info');
      return;
    }

    if (!confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SELURUH ${students.length} DATA SISWA di sistem?`)) {
      return;
    }

    await window.DB.clearAllStudents();
    this.selectedStudentIds.clear();
    Utils.showToast('Dibersihkan', 'Seluruh data master siswa telah dikosongkan.', 'info');
    this.renderStudentsTable();
    this.refreshDashboardKPIs();
  },

  async openAddStudentModal() {
    document.getElementById('studentModalTitle').textContent = 'Tambah Siswa Baru';
    document.getElementById('studentFormId').value = '';
    document.getElementById('studentNumberInput').value = '';
    document.getElementById('studentFullNameInput').value = '';
    await this.populateStudentClassDropdowns();
    document.getElementById('studentFormModal').classList.add('active');
  },

  async openEditStudentModal(studentId) {
    const students = await window.DB.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('studentModalTitle').textContent = 'Edit Data Siswa';
    document.getElementById('studentFormId').value = student.id;
    document.getElementById('studentNumberInput').value = student.student_number;
    document.getElementById('studentFullNameInput').value = student.full_name;
    
    await this.populateStudentClassDropdowns();
    document.getElementById('studentClassSelectModal').value = student.class_id || '';

    document.getElementById('studentFormModal').classList.add('active');
  },

  closeStudentModal() {
    document.getElementById('studentFormModal').classList.remove('active');
  },

  async saveStudentForm() {
    const num = document.getElementById('studentNumberInput').value.trim();
    const name = document.getElementById('studentFullNameInput').value.trim().toUpperCase();
    const classSelect = document.getElementById('studentClassSelectModal');
    const classId = classSelect.value;
    const className = classSelect.options[classSelect.selectedIndex]?.dataset.name || '';
    const id = document.getElementById('studentFormId').value;

    if (!num || !name || !classId) {
      Utils.showToast('Gagal', 'Harap isi Nomor Peserta, Nama Lengkap, dan pilih Kelas.', 'warning');
      return;
    }

    const studentData = {
      student_number: num,
      full_name: name,
      class_id: classId,
      class_name: className,
      active: true
    };
    if (id) studentData.id = id;

    await window.DB.saveStudent(studentData);
    Utils.showToast('Berhasil', 'Data siswa berhasil disimpan!', 'success');
    this.closeStudentModal();
    this.renderStudentsTable();
  },

  async deleteStudent(studentId) {
    if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) return;
    await window.DB.deleteStudent(studentId);
    Utils.showToast('Dihapus', 'Data siswa telah dihapus.', 'info');
    this.renderStudentsTable();
  },

  downloadStudentExcelTemplate() {
    try {
      const templateData = [
        { "NO_PESERTA": "24-10-001", "NAMA_SISWA": "AHMAD FAUZAN", "KELAS": "X IPA 1" },
        { "NO_PESERTA": "24-10-002", "NAMA_SISWA": "AISYAH AZ-ZAHRA", "KELAS": "X IPA 1" },
        { "NO_PESERTA": "24-10-003", "NAMA_SISWA": "BUNGA CITRA LESTARI", "KELAS": "X IPA 1" },
        { "NO_PESERTA": "24-10-004", "NAMA_SISWA": "DIMAS PRASETYO", "KELAS": "X IPA 2" },
        { "NO_PESERTA": "24-10-005", "NAMA_SISWA": "FITRIANI NUR", "KELAS": "X IPS 1" },
        { "NO_PESERTA": "24-11-001", "NAMA_SISWA": "KHALID BASALAMAH", "KELAS": "XI IPA 1" },
        { "NO_PESERTA": "24-12-001", "NAMA_SISWA": "PUTRA PRATAMA", "KELAS": "XII IPA 1" }
      ];

      if (window.XLSX) {
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DATA_SISWA");
        XLSX.writeFile(wb, "Template_Data_Siswa_MAN3HSS.xlsx");
        Utils.showToast('Unduh Berhasil', 'Template Excel (.xlsx) berhasil diunduh.', 'success');
      } else {
        Utils.exportToCSV(templateData, 'Template_Data_Siswa_MAN3HSS');
      }
    } catch(err) {
      console.error('Download template error:', err);
      Utils.showToast('Gagal Unduh', 'Terjadi kesalahan saat mengunduh template.', 'error');
    }
  },

  openImportStudentsModal() {
    this._parsedExcelStudents = [];
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('excelPreviewContainer');
    if (preview) preview.style.display = 'none';
    const btn = document.getElementById('btnConfirmImportExcel');
    if (btn) btn.disabled = true;

    document.getElementById('importStudentsModal').classList.add('active');
  },

  closeImportStudentsModal() {
    document.getElementById('importStudentsModal').classList.remove('active');
  },

  async handleExcelFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      let rows = [];

      if (window.XLSX) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      if (!rows || rows.length === 0) {
        Utils.showToast('File Kosong', 'Tidak ada baris data yang terbaca dari file.', 'warning');
        return;
      }

      const classes = await window.DB.getClasses();
      this._parsedExcelStudents = [];

      rows.forEach(r => {
        const keys = Object.keys(r);
        let num = '';
        let name = '';
        let className = '';

        keys.forEach(k => {
          const lk = k.trim().toLowerCase();
          if (lk.includes('peserta') || lk.includes('nomor') || lk.includes('no') || lk.includes('nisn')) {
            if (!num) num = String(r[k]).trim();
          } else if (lk.includes('nama') || lk.includes('siswa') || lk.includes('murid')) {
            if (!name) name = String(r[k]).trim().toUpperCase();
          } else if (lk.includes('kelas') || lk.includes('rombel') || lk.includes('tingkat')) {
            if (!className) className = String(r[k]).trim();
          }
        });

        if (num && name) {
          const matchedClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase()) || classes[0];
          this._parsedExcelStudents.push({
            student_number: num,
            full_name: name,
            class_id: matchedClass ? matchedClass.id : 'c1',
            class_name: matchedClass ? matchedClass.name : (className || 'X IPA 1'),
            active: true
          });
        }
      });

      if (this._parsedExcelStudents.length === 0) {
        Utils.showToast('Gagal Baca Kolom', 'Pastikan kolom bernama NO_PESERTA, NAMA_SISWA, dan KELAS ada di baris pertama.', 'error');
        return;
      }

      // Render Preview Table
      const previewContainer = document.getElementById('excelPreviewContainer');
      const previewTitle = document.getElementById('excelPreviewTitle');
      const previewBody = document.getElementById('excelPreviewTableBody');
      const btnConfirm = document.getElementById('btnConfirmImportExcel');

      if (previewTitle) previewTitle.textContent = `Pratinjau Data (${this._parsedExcelStudents.length} Siswa Terbaca):`;
      if (previewBody) {
        previewBody.innerHTML = '';
        this._parsedExcelStudents.slice(0, 10).forEach(st => {
          previewBody.innerHTML += `
            <tr>
              <td><strong>${st.student_number}</strong></td>
              <td>${st.full_name}</td>
              <td><span class="badge badge-accent">${st.class_name}</span></td>
            </tr>
          `;
        });
        if (this._parsedExcelStudents.length > 10) {
          previewBody.innerHTML += `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">... dan ${this._parsedExcelStudents.length - 10} siswa lainnya ...</td></tr>`;
        }
      }

      if (previewContainer) previewContainer.style.display = 'block';
      if (btnConfirm) btnConfirm.disabled = false;

    } catch(err) {
      console.error('Parse Excel error:', err);
      Utils.showToast('Gagal Membaca File', 'File Excel tidak dapat diproses: ' + err.message, 'error');
    }
  },

  async commitImportExcel() {
    if (!this._parsedExcelStudents || !this._parsedExcelStudents.length) return;

    await window.DB.importStudents(this._parsedExcelStudents);
    Utils.showToast('Impor Sukses', `${this._parsedExcelStudents.length} data siswa berhasil diimpor ke database!`, 'success');
    this.closeImportStudentsModal();
    this.renderStudentsTable();
    this.refreshDashboardKPIs();
  },

  /* --------------------------------------------------------------------------
     KEHADIRAN & STATUS PESERTA REALTIME (NEW)
  -------------------------------------------------------------------------- */
  onAttendanceGradeChange() {
    const grade = document.getElementById('attGradeFilter')?.value;
    const classFilter = document.getElementById('attClassFilter');
    if (!classFilter) return;

    window.DB.getClasses().then(classes => {
      classFilter.innerHTML = `<option value="">Semua Rombel</option>`;
      let list = classes;
      if (grade) list = list.filter(c => c.grade === grade);
      list.forEach(c => classFilter.innerHTML += `<option value="${c.name}">${c.name}</option>`);
      this.renderAttendanceTable();
    });
  },

  async renderAttendanceTable() {
    const tableBody = document.getElementById('adminAttendanceTableBody');
    if (!tableBody) return;

    const query = (document.getElementById('attSearchInput')?.value || '').trim().toLowerCase();
    const gradeFilter = document.getElementById('attGradeFilter')?.value || '';
    const classFilter = document.getElementById('attClassFilter')?.value || '';
    const statusFilter = document.getElementById('attStatusFilter')?.value || '';

    const sessions = await window.DB.getActiveSessions();
    const classes = await window.DB.getClasses();

    const filtered = sessions.filter(s => {
      if (query && !(s.student_name || '').toLowerCase().includes(query) && !(s.student_number || '').toLowerCase().includes(query)) {
        return false;
      }
      if (gradeFilter) {
        const cls = classes.find(c => c.name === s.class_name || c.id === s.class_id);
        if (!cls || cls.grade !== gradeFilter) return false;
      }
      if (classFilter && s.class_name !== classFilter) {
        return false;
      }
      if (statusFilter && s.status !== statusFilter) {
        return false;
      }
      return true;
    });

    tableBody.innerHTML = '';

    if (!filtered.length) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2.5rem;" class="text-muted">Tidak ada catatan kehadiran yang cocok.</td></tr>`;
      return;
    }

    const now = Date.now();

    filtered.forEach((s, idx) => {
      let statusBadge = '';
      if (s.status === 'active') {
        statusBadge = `<span class="badge badge-success"><span class="status-dot active"></span> Mengerjakan</span>`;
      } else if (s.status === 'completed') {
        statusBadge = `<span class="badge badge-primary">Selesai</span>`;
      } else if (s.status === 'expired') {
        statusBadge = `<span class="badge badge-neutral">Waktu Habis</span>`;
      } else if (s.status === 'suspicious') {
        statusBadge = `<span class="badge badge-danger">Mencurigakan</span>`;
      } else if (s.status === 'terminated') {
        statusBadge = `<span class="badge badge-danger">Dikeluarkan</span>`;
      } else if (s.status === 'reset_by_admin') {
        statusBadge = `<span class="badge badge-success">Kunci Terbuka</span>`;
      }

      const expireTime = new Date(s.expires_at).getTime();
      const remainingSec = Math.max(0, Math.floor((expireTime - now) / 1000));
      let timeText = Utils.formatTime(s.expires_at);
      if (s.status === 'active') {
        timeText = `⏳ ${Utils.formatSecondsToHMS(remainingSec)}`;
      }

      let actionHtml = '';
      if (s.status === 'completed' || s.status === 'terminated' || s.status === 'expired') {
        actionHtml = `
          <button class="btn btn-sm btn-outline" style="color:var(--primary-700); border-color:var(--primary-600); font-weight:700;" onclick="AdminController.unlockStudentSession('${s.id}')" title="Izinkan siswa mengerjakan ulang / reset kunci">
            🔓 Buka Kunci
          </button>
        `;
      } else if (s.status === 'active' || s.status === 'suspicious') {
        actionHtml = `
          <button class="btn btn-sm btn-danger" onclick="AdminController.forceExitStudent('${s.id}')" title="Keluarkan siswa dari ujian secara paksa">
            🚫 Keluarkan
          </button>
        `;
      } else if (s.status === 'reset_by_admin') {
        actionHtml = `<span style="font-size:0.775rem; color:var(--success); font-weight:700;">Siap Masuk</span>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align:center; font-weight:700; color:var(--text-subtle);">${idx + 1}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-main);">${s.student_name || 'Peserta Ujian'}</div>
          <div style="font-size: 0.775rem; font-family: var(--font-mono); color: var(--primary-700);">No: ${s.student_number || '-'}</div>
        </td>
        <td><span class="badge badge-accent">${s.class_name || '-'}</span></td>
        <td>
          <div style="font-weight: 700; font-size: 0.875rem;">${s.exam_title || 'Ujian'}</div>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${Utils.formatTime(s.started_at)}</td>
        <td style="font-family: var(--font-mono); font-size: 0.825rem;">${timeText}</td>
        <td style="text-align:center;">
          <span class="badge ${s.violation_count > 0 ? 'badge-danger' : 'badge-neutral'}" style="font-weight:800;">
            ${s.violation_count || 0}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:0.35rem; align-items:center;">
            ${actionHtml}
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  async unlockStudentSession(sessionId) {
    const sessions = await window.DB.getActiveSessions();
    const sess = sessions.find(s => s.id === sessionId);
    const name = sess ? sess.student_name : 'Siswa';

    if (!confirm(`Apakah Anda ingin MEMBUKA KUNCI UJIAN untuk siswa '${name}' agar dapat masuk dan mengerjakan kembali?`)) {
      return;
    }

    await window.DB.unlockStudentExam(sessionId);
    Utils.showToast('Kunci Dibuka', `Kunci ujian untuk ${name} berhasil dibuka! Siswa kini dapat masuk kembali.`, 'success');
    this.renderAttendanceTable();
    if (window.MonitoringManager) MonitoringManager.renderActiveSessionsTable();
  },

  async forceExitStudent(sessionId) {
    if (window.MonitoringManager) {
      await MonitoringManager.terminateSession(sessionId);
      this.renderAttendanceTable();
    }
  },

  async toggleGlobalExamPause() {
    const isCurrentlyPaused = await window.DB.isGlobalExamPaused();
    const newPauseState = !isCurrentlyPaused;

    if (newPauseState) {
      if (!confirm('⚠️ PERINGATAN DARURAT PROKTOR:\nApakah Anda yakin ingin MENGHENTIKAN SEMENTARA SELURUH UJIAN HARI INI?\nSemua siswa yang sedang aktif akan otomatis dikeluarkan dan terkunci hingga Anda membukanya kembali.')) {
        return;
      }
    } else {
      if (!confirm('🟢 Apakah Anda ingin MEMBUKA KEMBALI SELURUH UJIAN agar siswa dapat melanjutkan pengerjaan?')) {
        return;
      }
    }

    await window.DB.setGlobalExamPause(newPauseState);
    this.syncGlobalExamButtonState();

    if (newPauseState) {
      Utils.showToast('Seluruh Ujian Dihentikan', 'Semua sesi ujian telah ditangguhkan sementara.', 'error');
    } else {
      Utils.showToast('Ujian Dibuka Kembali', 'Seluruh ujian kini aktif kembali untuk siswa.', 'success');
    }

    this.renderAttendanceTable();
    if (window.MonitoringManager) MonitoringManager.renderActiveSessionsTable();
  },

  async syncGlobalExamButtonState() {
    const btn = document.getElementById('btnGlobalExamControl');
    if (!btn) return;

    const isPaused = await window.DB.isGlobalExamPaused();
    if (isPaused) {
      btn.className = 'btn btn-sm btn-success animate-pulse';
      btn.innerHTML = '🟢 Buka Kembali Semua Ujian';
      btn.title = 'Ujian sedang dihentikan sementara. Klik untuk membuka kembali bagi siswa.';
    } else {
      btn.className = 'btn btn-sm btn-danger';
      btn.innerHTML = '⛔ Hentikan Semua Ujian';
      btn.title = 'Klik untuk menghentikan sementara seluruh sesi ujian hari ini.';
    }
  },

  async exportAttendanceCSV() {
    const sessions = await window.DB.getActiveSessions();
    if (!sessions.length) {
      Utils.showToast('Gagal', 'Tidak ada data kehadiran untuk diekspor.', 'warning');
      return;
    }

    const data = sessions.map((s, i) => ({
      'No': i + 1,
      'No Peserta': s.student_number || '-',
      'Nama Siswa': s.student_name,
      'Kelas': s.class_name,
      'Mata Pelajaran': s.exam_title,
      'Waktu Mulai': Utils.formatDateTime(s.started_at),
      'Batas Selesai': Utils.formatDateTime(s.expires_at),
      'Pelanggaran': s.violation_count || 0,
      'Status': s.status
    }));

    Utils.exportToCSV(data, 'Rekap_Kehadiran_Ujian_MAN3HSS');
  },

  /* --------------------------------------------------------------------------
     CLASSES MANAGEMENT
  -------------------------------------------------------------------------- */
  async renderClassesAdminTable() {
    const tableBody = document.getElementById('adminClassesTableBody');
    if (!tableBody) return;

    const classes = await window.DB.getClasses();
    tableBody.innerHTML = '';

    classes.forEach(c => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 700;">${c.name}</td>
        <td><span class="badge badge-primary">Tingkat ${c.grade}</span></td>
        <td>${c.description || '-'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="AdminController.openEditClassModal('${c.id}')">Edit</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  openAddClassModal() {
    document.getElementById('classModalTitle').textContent = 'Tambah Kelas Baru';
    document.getElementById('classFormId').value = '';
    document.getElementById('classNameInput').value = '';
    document.getElementById('classGradeSelect').value = 'X';
    document.getElementById('classDescInput').value = '';
    document.getElementById('classFormModal').classList.add('active');
  },

  async openEditClassModal(classId) {
    const classes = await window.DB.getClasses();
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    document.getElementById('classModalTitle').textContent = 'Edit Kelas';
    document.getElementById('classFormId').value = cls.id;
    document.getElementById('classNameInput').value = cls.name;
    document.getElementById('classGradeSelect').value = cls.grade || 'X';
    document.getElementById('classDescInput').value = cls.description || '';
    document.getElementById('classFormModal').classList.add('active');
  },

  closeClassFormModal() {
    document.getElementById('classFormModal').classList.remove('active');
  },

  async saveClassForm() {
    const name = document.getElementById('classNameInput').value.trim();
    const grade = document.getElementById('classGradeSelect').value;
    const desc = document.getElementById('classDescInput').value.trim();
    const id = document.getElementById('classFormId').value;

    if (!name) {
      Utils.showToast('Gagal', 'Nama kelas tidak boleh kosong.', 'warning');
      return;
    }

    if (id) {
      await window.DB.saveClass({ id, name, grade, description: desc });
    } else {
      await window.DB.saveClass({ name, grade, description: desc, active: true });
    }
    Utils.showToast('Berhasil', 'Data kelas berhasil disimpan!', 'success');
    this.closeClassFormModal();
    this.renderClassesAdminTable();
    this.populateStudentClassDropdowns();
    this.refreshDashboardKPIs();
  },

  /* --------------------------------------------------------------------------
     SETTINGS & ADMIN CREDENTIALS MANAGEMENT
  -------------------------------------------------------------------------- */
  async loadSettingsForm() {
    const settings = await window.DB.getSettings();
    document.getElementById('settingAcademicYear').value = settings.academic_year || '2025/2026';
    document.getElementById('settingSemester').value = settings.semester || 'Genap';
    document.getElementById('toggleMenuSusulan').checked = settings.menu_susulan_enabled !== false;
    document.getElementById('toggleMenuRemedial').checked = settings.menu_remedial_enabled !== false;
    document.getElementById('toggleMenuTryout').checked = !!settings.menu_tryout_enabled;
    document.getElementById('toggleMenuKhusus').checked = !!settings.menu_khusus_enabled;
    
    const defMaxEl = document.getElementById('settingDefaultMaxViolations');
    if (defMaxEl) defMaxEl.value = settings.default_max_violations || 3;

    const defExitEl = document.getElementById('settingDefaultExitToken');
    if (defExitEl) defExitEl.value = settings.default_exit_token || 'SELESAI';

    const defDurationEl = document.getElementById('settingDefaultExamDuration');
    if (defDurationEl) defDurationEl.value = settings.default_exam_duration_minutes || 60;

    this.refreshSelfServiceExamStats();

    // Load current admin credentials
    if (window.AuthManager) {
      const creds = AuthManager.getAdminCredentials();
      const emailEl = document.getElementById('settingAdminEmail');
      const nameEl = document.getElementById('settingAdminName');
      if (emailEl) emailEl.value = creds.email || 'proktor@man3hss.sch.id';
      if (nameEl) nameEl.value = creds.name || 'Proktor Madrasah';
      const passEl = document.getElementById('settingAdminNewPass');
      const confEl = document.getElementById('settingAdminConfirmPass');
      if (passEl) passEl.value = '';
      if (confEl) confEl.value = '';
    }
  },

  async saveSettingsForm() {
    const academicYear = document.getElementById('settingAcademicYear').value.trim();
    const semester = document.getElementById('settingSemester').value;
    const menuSusulan = document.getElementById('toggleMenuSusulan').checked;
    const menuRemedial = document.getElementById('toggleMenuRemedial').checked;
    const menuTryout = document.getElementById('toggleMenuTryout').checked;
    const menuKhusus = document.getElementById('toggleMenuKhusus').checked;
    const defaultMaxViolations = parseInt(document.getElementById('settingDefaultMaxViolations')?.value, 10) || 3;
    const defaultExitToken = (document.getElementById('settingDefaultExitToken')?.value || 'SELESAI').trim().toUpperCase();
    const defaultExamDuration = parseInt(document.getElementById('settingDefaultExamDuration')?.value, 10) || 60;

    await window.DB.saveSettings({
      academic_year: academicYear,
      semester: semester,
      menu_susulan_enabled: menuSusulan,
      menu_remedial_enabled: menuRemedial,
      menu_tryout_enabled: menuTryout,
      menu_khusus_enabled: menuKhusus,
      default_max_violations: defaultMaxViolations,
      default_exit_token: defaultExitToken,
      default_exam_duration_minutes: defaultExamDuration
    });

    Utils.showToast('Berhasil', 'Pengaturan portal dan batas pelanggaran berhasil diperbarui!', 'success');
  },

  async saveAdminAccount() {
    const email = document.getElementById('settingAdminEmail')?.value.trim();
    const name = document.getElementById('settingAdminName')?.value.trim();
    const newPass = document.getElementById('settingAdminNewPass')?.value.trim();
    const confirmPass = document.getElementById('settingAdminConfirmPass')?.value.trim();

    if (!email || !name) {
      Utils.showToast('Data Belum Lengkap', 'Email dan Nama Proktor wajib diisi.', 'warning');
      return;
    }

    if (newPass || confirmPass) {
      if (newPass.length < 6) {
        Utils.showToast('Sandi Terlalu Pendek', 'Kata sandi minimal terdiri dari 6 karakter.', 'warning');
        return;
      }
      if (newPass !== confirmPass) {
        Utils.showToast('Sandi Tidak Cocok', 'Konfirmasi kata sandi baru tidak sama.', 'error');
        return;
      }
    }

    await AuthManager.updateAdminAccount(email, name, newPass || null);
    this.renderUserProfile();
    Utils.showToast('Akun Diperbarui', 'Email dan kata sandi admin proktor berhasil disimpan!', 'success');

    // Clear password inputs
    const passEl = document.getElementById('settingAdminNewPass');
    const confEl = document.getElementById('settingAdminConfirmPass');
    if (passEl) passEl.value = '';
    if (confEl) confEl.value = '';
  },

  /* --------------------------------------------------------------------------
     EXAM DIRECT LINK & QR CODE (Scan Barcode / Link Ujian, tanpa Token Masuk)
  -------------------------------------------------------------------------- */
  async openExamLinkModal(examId) {
    const exams = await window.DB.getAllExamsAdmin();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const link = `${window.location.origin}${window.location.pathname.replace(/admin\.html$/, '')}index.html?ujian=${examId}`;

    let modal = document.getElementById('examLinkModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'examLinkModal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 420px;">
          <div class="modal-header">
            <h3>🔗 Link & QR Ujian</h3>
            <button class="modal-close" onclick="AdminController.closeExamLinkModal()">&times;</button>
          </div>
          <div class="modal-body" style="text-align:center;">
            <p style="font-weight:700; margin-bottom: 0.25rem;" id="examLinkTitle"></p>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
              QR/link AMAN ini mengarah ke portal (bukan langsung ke Google Form), supaya sistem keamanan ujian tetap aktif. Siswa yang men-scan atau membuka link ini akan masuk ke menu ujian TANPA Token Masuk (hanya perlu Token Keluar saat selesai).
            </p>
            <div id="examLinkQrContainer" style="display:flex; justify-content:center; margin-bottom:1rem;"></div>
            <div class="form-group">
              <input type="text" id="examLinkUrlInput" class="form-input" readonly style="text-align:center; font-size:0.8rem;">
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="AdminController.copyExamLink()">📋 Salin Link</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('examLinkTitle').textContent = `${exam.subject} — ${exam.title}`;
    document.getElementById('examLinkUrlInput').value = link;

    const qrContainer = document.getElementById('examLinkQrContainer');
    qrContainer.innerHTML = '';
    if (window.QRCode) {
      new QRCode(qrContainer, { text: link, width: 200, height: 200 });
    } else {
      qrContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Pustaka QR gagal dimuat. Salin link secara manual.</p>';
    }

    modal.classList.add('active');
  },

  closeExamLinkModal() {
    const modal = document.getElementById('examLinkModal');
    if (modal) modal.classList.remove('active');
  },

  copyExamLink() {
    const input = document.getElementById('examLinkUrlInput');
    if (!input) return;
    input.select();
    navigator.clipboard?.writeText(input.value).then(() => {
      Utils.showToast('Tersalin', 'Link ujian berhasil disalin ke clipboard.', 'success');
    }).catch(() => {
      document.execCommand('copy');
      Utils.showToast('Tersalin', 'Link ujian berhasil disalin.', 'success');
    });
  },

  /* --------------------------------------------------------------------------
     KELOLA & BERSIHKAN DATA (Ujian Otomatis dari Link Tempel)
  -------------------------------------------------------------------------- */
  async refreshSelfServiceExamStats() {
    const el = document.getElementById('selfServiceExamStats');
    if (!el) return;
    try {
      const stats = await window.DB.getSelfServiceExamStats();
      el.textContent = `${stats.total} ujian tersimpan (${stats.expired} sudah kedaluwarsa)`;
    } catch (err) {
      el.textContent = 'gagal memuat';
      console.warn('refreshSelfServiceExamStats error:', err);
    }
  },

  async cleanupExpiredSelfServiceExams() {
    try {
      const count = await window.DB.deleteExpiredSelfServiceExams();
      if (count === 0) {
        Utils.showToast('Tidak Ada', 'Tidak ada ujian otomatis yang sudah kedaluwarsa saat ini.', 'info');
      } else {
        Utils.showToast('Dibersihkan', `${count} ujian otomatis yang sudah kedaluwarsa berhasil dihapus.`, 'success');
      }
      this.refreshSelfServiceExamStats();
    } catch (err) {
      console.error('cleanupExpiredSelfServiceExams error:', err);
      Utils.showToast('Gagal', 'Terjadi kesalahan saat membersihkan data.', 'error');
    }
  },

  async cleanupAllSelfServiceExams() {
    if (!confirm('⚠️ Ini akan menghapus SEMUA ujian yang dibuat otomatis lewat fitur "Scan Barcode / Link Ujian", termasuk yang MASIH BERLAKU/sedang dipakai siswa. Ujian buatan Admin tidak terpengaruh. Lanjutkan?')) {
      return;
    }
    try {
      const count = await window.DB.deleteAllSelfServiceExams();
      Utils.showToast('Dibersihkan', `${count} ujian otomatis berhasil dihapus semua.`, 'success');
      this.refreshSelfServiceExamStats();
    } catch (err) {
      console.error('cleanupAllSelfServiceExams error:', err);
      Utils.showToast('Gagal', 'Terjadi kesalahan saat membersihkan data.', 'error');
    }
  }
};

window.AdminController = AdminController;
