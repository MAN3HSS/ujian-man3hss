/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Exams Controller (v3.5 Update)
 * Class-First Student Selector, Auto-Loaded Participant Numbers, Token Verification
 */

const ExamsManager = {
  currentClassId: null,
  currentGrade: 'X',
  currentCategoryFilter: null,
  selectedExam: null,
  _examCache: [],

  /**
   * Load & Render Exams strictly for chosen class or special category
   */
  async loadClassExams(classId, grade, categoryFilter) {
    this.currentClassId = classId;
    this.currentGrade = grade;
    this.currentCategoryFilter = categoryFilter;
    await this.renderExamsList('examListContainer');
  },

  async renderExamsList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
        <div style="margin: 0 auto 1rem; width: 36px; height: 36px; border: 3px solid var(--border-medium); border-top-color: var(--primary-600); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p style="color:var(--text-muted);">Memuat daftar mata pelajaran...</p>
      </div>
    `;

    let exams = [];
    try {
      exams = await window.DB.getExams(this.currentClassId, this.currentCategoryFilter, this.currentGrade);
    } catch(err) {
      console.warn('getExams error:', err);
    }

    if (exams && exams.length > 0) {
      exams.forEach(e => {
        const idx = this._examCache.findIndex(x => x.id === e.id);
        if (idx >= 0) this._examCache[idx] = e;
        else this._examCache.push(e);
      });
    }

    container.innerHTML = '';

    if (!exams || exams.length === 0) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-surface-muted);">
          <svg style="width: 56px; height: 56px; color: var(--text-subtle); margin: 0 auto 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">Tidak Ada Jadwal Ujian Aktif</h3>
          <p style="max-width: 440px; margin: 0 auto 1.5rem; font-size: 0.9rem; color: var(--text-muted);">
            Belum ada jadwal ujian aktif untuk rombel atau kategori yang dipilih saat ini.
          </p>
        </div>
      `;
      return;
    }

    const now = new Date();

    exams.forEach(exam => {
      const start = new Date(exam.start_at);
      const end = new Date(exam.end_at);
      
      let statusBadge = '';
      let isActionable = false;

      if (now < start) {
        statusBadge = `<span class="badge badge-warning">Akan Datang</span>`;
      } else if (now > end) {
        statusBadge = `<span class="badge badge-neutral">Selesai</span>`;
      } else {
        statusBadge = `<span class="badge badge-success"><span class="status-dot active"></span> Aktif</span>`;
        isActionable = true;
      }

      let typeBadgeClass = 'badge-primary';
      if (exam.type === 'Ujian Susulan') typeBadgeClass = 'badge-accent';
      else if (exam.type === 'Remedial') typeBadgeClass = 'badge-warning';
      else if (exam.type === 'Try Out') typeBadgeClass = 'badge-info';

      const card = document.createElement('div');
      card.className = 'exam-card animate-fade-in';
      card.innerHTML = `
        <div>
          <div class="exam-card-header">
            <span class="badge ${typeBadgeClass}">${exam.type || 'Ujian Utama'}</span>
            ${statusBadge}
          </div>
          <div class="exam-card-subject">${exam.subject || 'Mata Pelajaran'}</div>
          <h3 class="exam-card-title">${exam.title}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 1rem;">
            ${exam.description || 'Silakan ikuti instruksi pengawas dan pastikan koneksi stabil.'}
          </p>

          <div class="exam-card-meta">
            <div class="meta-item">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>${exam.duration_minutes} Menit</span>
            </div>
            <div class="meta-item">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>${Utils.formatTime(exam.start_at)} - ${Utils.formatTime(exam.end_at)}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 1.5rem;">
          <button class="btn btn-block ${isActionable ? 'btn-primary' : 'btn-secondary'}" 
                  ${!isActionable ? 'disabled' : ''} 
                  onclick="ExamsManager.openTokenModal('${exam.id}')">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            ${isActionable ? 'MASUK UJIAN' : (now < start ? 'BELUM DIMULAI' : 'TELAH BERAKHIR')}
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  },

  /**
   * Open Modal: 1. Select Class, 2. Select Registered Student & Number, 3. Entry Token
   */
  async openTokenModal(examId) {
    let exam = this._examCache.find(e => e.id === examId);
    if (!exam) {
      try {
        const exams = await window.DB.getAllExamsAdmin();
        exam = exams.find(e => e.id === examId);
      } catch(err) {
        console.warn('openTokenModal DB lookup failed:', err);
      }
    }
    if (!exam) {
      if (window.Utils) Utils.showToast('Gagal', 'Data ujian tidak ditemukan.', 'error');
      return;
    }

    this.selectedExam = exam;

    const modalBackdrop = document.getElementById('tokenModal');
    if (!modalBackdrop) return;

    const setSafe = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setSafe('modalExamTitle', exam.title);
    setSafe('modalExamSubject', exam.subject);
    setSafe('modalExamDuration', `${exam.duration_minutes} Menit`);

    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
      tokenInput.value = '';
      tokenInput.placeholder = 'MASUKKAN TOKEN';
    }

    const errEl = document.getElementById('tokenErrorMsg');
    if (errEl) errEl.style.display = 'none';

    // Populate Class Dropdown in Modal (Filtered by active grade only)
    const classSelect = document.getElementById('studentClassSelect');
    if (classSelect) {
      let classes = await window.DB.getClasses();
      
      // Strict separation: only show classes belonging to current grade
      if (this.currentGrade) {
        const gradeClasses = classes.filter(c => c.grade === this.currentGrade);
        if (gradeClasses.length > 0) classes = gradeClasses;
      }

      classSelect.innerHTML = `<option value="">-- Pilih Kelas Anda --</option>`;
      classes.forEach(c => {
        const isSelected = c.id === this.currentClassId;
        classSelect.innerHTML += `<option value="${c.id}" data-name="${c.name}" ${isSelected ? 'selected' : ''}>${c.name}</option>`;
      });

      // Trigger student population for default selected class
      await this.onModalClassChange();
    }

    modalBackdrop.classList.add('active');
  },

  /**
   * Triggered when student selects a Class in modal -> Loads only students from that class
   */
  async onModalClassChange() {
    const classSelect = document.getElementById('studentClassSelect');
    const studentSelect = document.getElementById('studentNameSelect');
    const badge = document.getElementById('studentNumberBadge');
    if (!classSelect || !studentSelect) return;

    const classId = classSelect.value;
    if (badge) badge.style.display = 'none';

    if (!classId) {
      studentSelect.innerHTML = `<option value="">-- Pilih Kelas Terlebih Dahulu --</option>`;
      return;
    }

    studentSelect.innerHTML = `<option value="">Memuat nama siswa...</option>`;
    const students = await window.DB.getStudents(classId);

    if (!students || students.length === 0) {
      studentSelect.innerHTML = `
        <option value="">-- Belum ada data siswa di kelas ini --</option>
      `;
      return;
    }

    studentSelect.innerHTML = `<option value="">-- Pilih Nama Anda --</option>`;
    students.forEach(st => {
      // Show ONLY student name in the option text
      studentSelect.innerHTML += `
        <option value="${st.full_name}" data-number="${st.student_number || '-'}">
          ${st.full_name}
        </option>
      `;
    });
  },

  onStudentNameChange() {
    const studentSelect = document.getElementById('studentNameSelect');
    const badge = document.getElementById('studentNumberBadge');
    const numText = document.getElementById('studentNumberText');
    if (!studentSelect || !badge) return;

    const opt = studentSelect.options[studentSelect.selectedIndex];
    const studentNumber = opt ? opt.dataset.number : '';

    if (studentSelect.value && studentNumber && studentNumber !== '-') {
      if (numText) numText.textContent = studentNumber;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  },

  closeTokenModal() {
    const modalBackdrop = document.getElementById('tokenModal');
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  },

  /**
   * Verify Student Identity, Class & Entry Token
   */
  async submitTokenVerification() {
    const classSelect = document.getElementById('studentClassSelect');
    const classId = classSelect ? classSelect.value : null;
    const className = classSelect && classSelect.selectedIndex > 0 ? (classSelect.options[classSelect.selectedIndex].dataset.name || classSelect.options[classSelect.selectedIndex].text) : '';

    const studentSelect = document.getElementById('studentNameSelect');
    const studentName = studentSelect ? studentSelect.value.trim() : '';
    const studentNumber = studentSelect && studentSelect.selectedIndex > 0 ? (studentSelect.options[studentSelect.selectedIndex].dataset.number || '-') : '-';

    const tokenEl = document.getElementById('tokenInput');
    const tokenInput = tokenEl ? tokenEl.value.trim() : '';

    const errorEl = document.getElementById('tokenErrorMsg');

    if (!classId) {
      if (errorEl) {
        errorEl.textContent = 'Harap pilih Kelas Anda terlebih dahulu.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (!studentName) {
      if (errorEl) {
        errorEl.textContent = 'Harap pilih Nama & Nomor Peserta Anda.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (!tokenInput) {
      if (errorEl) {
        errorEl.textContent = 'Harap masukkan Token Masuk Ujian.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (errorEl) errorEl.style.display = 'none';

    const verifyBtn = document.getElementById('btnVerifyToken');
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `Memverifikasi...`;
    }

    try {
      const result = await window.DB.verifyTokenAndStartSession(
        this.selectedExam.id,
        tokenInput,
        studentName,
        classId,
        className,
        studentNumber
      );

      if (!result.success) {
        if (errorEl) {
          errorEl.textContent = result.message || 'Token Masuk salah.';
          errorEl.style.display = 'block';
        }
        Utils.showToast('Verifikasi Gagal', result.message || 'Token tidak valid', 'error');
        return;
      }

      // Save active session in StorageManager
      StorageManager.saveActiveSession(result);
      
      // Close Token Modal
      this.closeTokenModal();

      // Open Device Diagnostic & Rules Modal
      this.openConfirmationModal(result);
    } catch (err) {
      console.error('Token verification error:', err);
      if (errorEl) {
        errorEl.textContent = `Terjadi kesalahan: ${err.message || 'Gagal memverifikasi'}`;
        errorEl.style.display = 'block';
      }
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `VERIFIKASI & LANJUT`;
      }
    }
  },

  /* --------------------------------------------------------------------------
     SCAN BARCODE / LINK UJIAN (Tanpa Token Masuk)
  -------------------------------------------------------------------------- */
  directLinkExam: null,
  _qrScanner: null,

  openDirectLinkModal(prefillExamId) {
    const modal = document.getElementById('directLinkModal');
    if (!modal) return;

    this.directLinkExam = null;
    document.getElementById('directLinkStepFind').style.display = 'block';
    document.getElementById('directLinkStepIdentity').style.display = 'none';
    document.getElementById('btnStartDirectSession').style.display = 'none';

    const urlInput = document.getElementById('directLinkUrlInput');
    if (urlInput) urlInput.value = prefillExamId || '';
    const errEl = document.getElementById('directLinkErrorMsg');
    if (errEl) errEl.style.display = 'none';
    const nameInput = document.getElementById('directNameInput');
    if (nameInput) nameInput.value = '';
    const classInput = document.getElementById('directClassInput');
    if (classInput) classInput.value = '';

    modal.classList.add('active');
    const container = modal.querySelector('.modal-container');
    if (container) container.scrollTop = 0;

    // Jika sudah datang lewat link (?ujian=ID), langsung cari ujiannya.
    if (prefillExamId) {
      this.resolveDirectLink();
    }
  },

  closeDirectLinkModal() {
    this.stopBarcodeScanner();
    const modal = document.getElementById('directLinkModal');
    if (modal) modal.classList.remove('active');
  },

  /**
   * Ambil kode/ID ujian dari teks yang di-scan atau ditempel. Menerima:
   * 1. Link buatan sistem kita sendiri (index.html?ujian=ID) — dari fitur Link/QR admin
   * 2. Link Google Form ASLI (yang sama dengan yang diisi admin di kolom Link Google Form saat bikin ujian)
   * 3. Kode/ID ujian polos
   */
  _extractGoogleFormId(text) {
    const match = (text || '').match(/forms\/d\/e\/([a-zA-Z0-9_-]+)/) || (text || '').match(/forms\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  },

  async _findExamByLinkOrCode(text) {
    const raw = (text || '').trim();
    if (!raw) return null;

    let exams = [];
    try {
      exams = await window.DB.getAllExamsAdmin();
    } catch (err) {
      console.warn('_findExamByLinkOrCode lookup failed:', err);
      return null;
    }

    // 1. Link buatan sistem sendiri: index.html?ujian=ID
    try {
      const url = new URL(raw);
      const fromQuery = url.searchParams.get('ujian');
      if (fromQuery) {
        const byId = exams.find(e => e.id === fromQuery.trim());
        if (byId) return byId;
      }
    } catch (e) { /* bukan URL absolut, lanjut cara lain */ }

    // 2. Link Google Form asli — cocokkan ID unik Google Form-nya
    const scannedFormId = this._extractGoogleFormId(raw);
    if (scannedFormId) {
      const byFormId = exams.find(e => this._extractGoogleFormId(e.form_url || '') === scannedFormId);
      if (byFormId) return byFormId;
    }

    // 3. Cocokkan persis dengan Link Google Form yang tersimpan di ujian (fallback)
    const byExactUrl = exams.find(e => (e.form_url || '').trim() === raw);
    if (byExactUrl) return byExactUrl;

    // 4. Kode/ID ujian polos
    const byId = exams.find(e => e.id === raw);
    if (byId) return byId;

    return null;
  },

  async startBarcodeScanner() {
    const container = document.getElementById('directLinkScannerContainer');
    if (!container) return;

    if (!window.Html5Qrcode) {
      Utils.showToast('Gagal', 'Pustaka pemindai kamera gagal dimuat. Pastikan koneksi internet aktif.', 'error');
      return;
    }

    container.style.display = 'block';
    container.innerHTML = '<div id="directLinkQrReader" style="width:100%;"></div>';

    try {
      this._qrScanner = new Html5Qrcode('directLinkQrReader');
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        Utils.showToast('Kamera Tidak Ditemukan', 'Tidak ada kamera yang terdeteksi di perangkat ini.', 'error');
        return;
      }
      // Prioritaskan kamera belakang jika ada (biasanya lebih jelas untuk scan)
      const backCam = cameras.find(c => /back|belakang|rear/i.test(c.label)) || cameras[0];

      await this._qrScanner.start(
        backCam.id,
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          const urlInput = document.getElementById('directLinkUrlInput');
          if (urlInput) urlInput.value = decodedText;
          this.stopBarcodeScanner();
          this.resolveDirectLink();
        },
        () => { /* diabaikan: dipanggil terus tiap frame gagal decode */ }
      );
    } catch (err) {
      console.warn('Camera scanner error:', err);
      Utils.showToast('Gagal Membuka Kamera', 'Pastikan Anda mengizinkan akses kamera di browser.', 'error');
    }
  },

  stopBarcodeScanner() {
    const container = document.getElementById('directLinkScannerContainer');

    // Reset tampilan SEKARANG JUGA (tidak menunggu promise library selesai),
    // supaya modal selalu bisa langsung tertutup meski proses stop kamera
    // di baliknya lambat/gagal.
    if (container) { container.style.display = 'none'; }

    if (this._qrScanner) {
      const scannerToStop = this._qrScanner;
      this._qrScanner = null;
      try {
        scannerToStop.stop()
          .then(() => scannerToStop.clear())
          .catch(() => {})
          .finally(() => { if (container) container.innerHTML = ''; });
      } catch (e) {
        if (container) container.innerHTML = '';
      }
    }

    // Jaring pengaman tambahan: paksa hentikan SEMUA stream kamera aktif
    // di halaman ini, kalau-kalau library gagal melepaskannya sendiri.
    try {
      document.querySelectorAll('#directLinkScannerContainer video').forEach(video => {
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
    } catch (e) { /* abaikan */ }
  },

  async resolveDirectLink() {
    const urlInput = document.getElementById('directLinkUrlInput');
    const errEl = document.getElementById('directLinkErrorMsg');
    const inputText = urlInput ? urlInput.value.trim() : '';

    if (errEl) errEl.style.display = 'none';

    if (!inputText) {
      if (errEl) { errEl.textContent = 'Harap scan barcode atau tempel link ujian (Google Form) terlebih dahulu.'; errEl.style.display = 'block'; }
      return;
    }

    const findBtn = document.getElementById('btnFindDirectLink');
    if (findBtn) { findBtn.disabled = true; findBtn.textContent = 'Mencari...'; }

    let exam = await this._findExamByLinkOrCode(inputText);

    if (!exam) {
      // Link belum terdaftar sebagai ujian. Kalau memang terlihat seperti
      // link Google Form yang valid, langsung buat ujian baru otomatis
      // (tanpa perlu isi apapun) supaya bisa langsung dipakai.
      const looksLikeGoogleForm = this._extractGoogleFormId(inputText) || /^https?:\/\//i.test(inputText);
      if (!looksLikeGoogleForm) {
        if (findBtn) { findBtn.disabled = false; findBtn.textContent = 'Cari Ujian'; }
        if (errEl) { errEl.textContent = 'Link/kode tidak dikenali. Pastikan itu link Google Form yang valid.'; errEl.style.display = 'block'; }
        return;
      }

      try {
        exam = await window.DB.createExamFromLink(inputText);
        Utils.showToast('Ujian Baru Dibuat', 'Link ini belum terdaftar, ujian baru otomatis dibuat & langsung aktif.', 'success');
      } catch (err) {
        console.error('Auto-create exam from link failed:', err);
        if (findBtn) { findBtn.disabled = false; findBtn.textContent = 'Cari Ujian'; }
        if (errEl) { errEl.textContent = `Gagal membuat ujian otomatis: ${err.message || 'Terjadi kesalahan'}`; errEl.style.display = 'block'; }
        return;
      }
    }

    if (findBtn) { findBtn.disabled = false; findBtn.textContent = 'Cari Ujian'; }

    if (exam.status !== 'active') {
      if (errEl) { errEl.textContent = 'Ujian ditemukan, tapi sedang DINONAKTIFKAN oleh proktor.'; errEl.style.display = 'block'; }
      return;
    }

    this.directLinkExam = exam;

    document.getElementById('directLinkExamSubject').textContent = exam.subject || '';
    document.getElementById('directLinkExamTitle').textContent = exam.title || '';
    document.getElementById('directLinkExamDuration').textContent = `${exam.duration_minutes} Menit`;

    document.getElementById('directLinkStepFind').style.display = 'none';
    document.getElementById('directLinkStepIdentity').style.display = 'block';
    document.getElementById('btnStartDirectSession').style.display = 'block';
  },

  async submitDirectEntry() {
    if (!this.directLinkExam) return;

    const nameInput = document.getElementById('directNameInput');
    const classInput = document.getElementById('directClassInput');
    const studentName = nameInput ? nameInput.value.trim() : '';
    const className = classInput ? classInput.value.trim() : '';

    const errorEl = document.getElementById('directLinkIdentityErrorMsg');
    if (errorEl) errorEl.style.display = 'none';

    if (!studentName) {
      if (errorEl) { errorEl.textContent = 'Harap tulis Nama Lengkap Anda.'; errorEl.style.display = 'block'; }
      return;
    }
    if (!className) {
      if (errorEl) { errorEl.textContent = 'Harap tulis Kelas Anda.'; errorEl.style.display = 'block'; }
      return;
    }

    const startBtn = document.getElementById('btnStartDirectSession');
    if (startBtn) { startBtn.disabled = true; startBtn.innerHTML = 'Memproses...'; }

    try {
      const result = await window.DB.startSessionByDirectLink(this.directLinkExam.id, studentName, className);

      if (!result.success) {
        if (errorEl) { errorEl.textContent = result.message || 'Gagal memulai sesi ujian.'; errorEl.style.display = 'block'; }
        Utils.showToast('Gagal', result.message || 'Gagal memulai sesi ujian.', 'error');
        return;
      }

      StorageManager.saveActiveSession(result);
      this.closeDirectLinkModal();
      this.openConfirmationModal(result);
    } catch (err) {
      console.error('submitDirectEntry error:', err);
      if (errorEl) { errorEl.textContent = `Terjadi kesalahan: ${err.message || 'Gagal memulai sesi'}`; errorEl.style.display = 'block'; }
    } finally {
      if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = 'MULAI UJIAN'; }
    }
  },

  openConfirmationModal(sessionData) {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
      window.location.href = 'exam.html';
      return;
    }

    const dev = Utils.getDeviceInfo();
    const setSafe = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setSafe('diagDevice', dev.deviceType);
    setSafe('diagBrowser', dev.browser);
    setSafe('diagNetwork', navigator.onLine ? 'Terhubung (Online)' : 'Terputus (Offline)');
    setSafe('diagFullscreen', dev.hasFullscreen ? 'Didukung' : 'Didukung Terbatas');

    const agreementCheckbox = document.getElementById('ruleAgreementCheckbox');
    if (agreementCheckbox) agreementCheckbox.checked = false;

    const btnStart = document.getElementById('btnStartExamGateway');
    if (btnStart) btnStart.disabled = true;

    modal.classList.add('active');
  },

  closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
  },

  async launchExamGateway() {
    const agreementCheckbox = document.getElementById('ruleAgreementCheckbox');
    if (agreementCheckbox && !agreementCheckbox.checked) {
      Utils.showToast('Persetujuan Diperlukan', 'Harap centang persetujuan tata tertib ujian sebelum memulai.', 'warning');
      return;
    }

    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } catch(err) {}

    this.closeConfirmModal();
    window.location.href = 'exam.html';
  }
};

window.ExamsManager = ExamsManager;
