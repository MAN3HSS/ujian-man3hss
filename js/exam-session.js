/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Exam Session Lifecycle Controller (exam.html)
 * Enforces Exit Token Verification, Fullscreen Lock & Google Forms Gateway
 */

const ExamSession = {
  session: null,
  timer: null,

  async init() {
    this.session = StorageManager.getActiveSession();
    if (!this.session) {
      window.location.href = 'index.html';
      return;
    }

    // Check if session has already expired
    const now = new Date().getTime();
    const expiry = new Date(this.session.expires_at).getTime();
    if (now >= expiry) {
      this.handleSessionExpired();
      return;
    }

    this.renderHeaderInfo();
    this.setupTimer();
    this.setupFormGateway();
    this.startProctorHeartbeatChecker();

    // Initialize Security & Violation Guard
    if (window.SecurityGuard) SecurityGuard.initExamSecurity();
    if (window.ViolationTracker) ViolationTracker.init(this.session);
  },

  startProctorHeartbeatChecker() {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    this._heartbeatInterval = setInterval(async () => {
      if (!this.session) return;
      const sessId = this.session.session_id || this.session.session_token || this.session.session_identifier;
      if (!sessId) return;

      try {
        // 1. Check Global Emergency Pause
        const isGlobalPaused = await window.DB.isGlobalExamPaused();
        if (isGlobalPaused) {
          clearInterval(this._heartbeatInterval);
          this.handleGlobalEmergencyStop();
          return;
        }

        // 2. Check Individual Session Termination
        const currentStatus = await window.DB.checkSessionStatus(sessId);
        if (currentStatus === 'terminated') {
          clearInterval(this._heartbeatInterval);
          this.handleForcedTermination();
        }
      } catch(err) {
        console.warn('Heartbeat check error:', err);
      }
    }, 2500);
  },

  handleGlobalEmergencyStop() {
    if (this.timer) this.timer.stop();
    if (window.SecurityGuard) SecurityGuard.isLocked = false;
    
    const fsOverlay = document.getElementById('fullscreenLockOverlay');
    if (fsOverlay) fsOverlay.style.display = 'none';

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }
    } catch(e) {}

    StorageManager.clearActiveSession();
    
    const examMain = document.getElementById('examMainContent');
    const completionEl = document.getElementById('completionScreen');

    if (examMain) examMain.style.display = 'none';
    if (completionEl) {
      completionEl.style.display = 'flex';
      const titleEl = document.getElementById('completionTitle');
      const msgEl = document.getElementById('completionMessage');

      if (titleEl) {
        titleEl.textContent = '⛔ Ujian Dihentikan Sementara oleh Proktor';
        titleEl.style.color = 'var(--danger)';
      }
      if (msgEl) {
        msgEl.textContent = 'Seluruh sesi ujian hari ini telah DITANGGUHKAN / DIHENTIKAN SEMENTARA secara serentak oleh Proktor Madrasah. Harap tetap tenang di tempat duduk Anda hingga pengawas memberikan instruksi lebih lanjut.';
      }
    }
  },

  handleForcedTermination() {
    if (this.timer) this.timer.stop();
    if (window.SecurityGuard) SecurityGuard.isLocked = false;
    
    const fsOverlay = document.getElementById('fullscreenLockOverlay');
    if (fsOverlay) fsOverlay.style.display = 'none';

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }
    } catch(e) {}

    StorageManager.clearActiveSession();
    
    const examMain = document.getElementById('examMainContent');
    const completionEl = document.getElementById('completionScreen');

    if (examMain) examMain.style.display = 'none';
    if (completionEl) {
      completionEl.style.display = 'flex';
      const titleEl = document.getElementById('completionTitle');
      const msgEl = document.getElementById('completionMessage');

      if (titleEl) {
        titleEl.textContent = '⛔ Sesi Ujian Dihentikan Pengawas';
        titleEl.style.color = 'var(--danger)';
      }
      if (msgEl) {
        msgEl.textContent = 'Sesi ujian Anda telah DIHENTIKAN SECARA PAKSA oleh Proktor / Pengawas Madrasah karena terindikasi melakukan pelanggaran atau diskualifikasi.';
      }
    }
  },

  renderHeaderInfo() {
    const titleEl = document.getElementById('examHeaderTitle');
    const subjEl = document.getElementById('examHeaderSubject');
    const studentBadge = document.getElementById('examStudentBadge');

    if (titleEl) titleEl.textContent = this.session.exam_title || 'Ujian Online';
    if (subjEl) subjEl.textContent = this.session.subject || 'MAN 3 HSS';
    if (studentBadge) {
      studentBadge.textContent = `${this.session.student_name || 'Siswa'} (${this.session.class_name || 'Kelas'})`;
    }
  },

  setupTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerContainer = document.getElementById('timerContainer');

    this.timer = new ExamTimer(
      this.session.expires_at,
      (seconds, status) => {
        if (timerDisplay) timerDisplay.textContent = Utils.formatSecondsToHMS(seconds);
        if (timerContainer) {
          timerContainer.className = `timer-container timer-${status}`;
        }
      },
      () => {
        this.handleSessionExpired();
      }
    );

    this.timer.start();
  },

  setupFormGateway() {
    const frameContainer = document.getElementById('examFrameContainer');
    if (!frameContainer) return;

    const formUrl = this.session.form_url;
    const allowIframe = this.session.allow_iframe !== false;

    if (allowIframe && formUrl) {
      frameContainer.innerHTML = `
        <iframe 
          id="googleFormIframe" 
          class="exam-iframe" 
          src="${formUrl}" 
          title="Google Forms Ujian" 
          allow="autoplay" 
          loading="lazy">
        </iframe>
      `;
    } else {
      frameContainer.innerHTML = `
        <div class="card card-glass gform-gateway-card animate-fade-in">
          <div class="gform-gateway-icon">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 style="margin-bottom: 0.75rem;">Akses Lembar Soal Google Forms</h2>
          <p style="margin-bottom: 1.5rem; font-size: 0.95rem;">
            Klik tombol di bawah untuk membuka lembar soal ujian resmi. Timer ujian tetap berjalan pada portal ini.
          </p>
          <a href="${formUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            BUKA GOOGLE FORMS
          </a>
        </div>
      `;
    }
  },

  /**
   * Exit Token Confirmation Flow
   */
  confirmFinishExam() {
    const modal = document.getElementById('finishConfirmModal');
    const exitInput = document.getElementById('exitTokenInput');
    const errorEl = document.getElementById('exitTokenError');

    if (exitInput) exitInput.value = '';
    if (errorEl) errorEl.style.display = 'none';
    if (modal) modal.classList.add('active');

    setTimeout(() => { if (exitInput) exitInput.focus(); }, 150);
  },

  closeFinishModal() {
    const modal = document.getElementById('finishConfirmModal');
    if (modal) modal.classList.remove('active');
  },

  async verifyAndFinishExam() {
    const exitInput = document.getElementById('exitTokenInput');
    const errorEl = document.getElementById('exitTokenError');
    const tokenKeluar = exitInput ? exitInput.value.trim() : '';

    if (!tokenKeluar) {
      if (errorEl) {
        errorEl.textContent = 'Harap masukkan Token Keluar dari pengawas.';
        errorEl.style.display = 'block';
      }
      return;
    }

    const btn = document.getElementById('btnSubmitExitToken');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Memverifikasi...';
    }

    try {
      const sessId = this.session ? (this.session.session_id || this.session.session_token || this.session.session_identifier) : null;
      const result = await window.DB.verifyExitToken(sessId, tokenKeluar);

      if (!result.success) {
        if (errorEl) {
          errorEl.textContent = result.message || 'Token Keluar tidak valid.';
          errorEl.style.display = 'block';
        }
        return;
      }

      // Exit Token valid -> Unlock and finish!
      this.closeFinishModal();
      if (this.timer) this.timer.stop();
      if (window.SecurityGuard) SecurityGuard.isLocked = false;
      
      const fsOverlay = document.getElementById('fullscreenLockOverlay');
      if (fsOverlay) fsOverlay.style.display = 'none';

      // Exit fullscreen if browser supports it
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitFullscreenElement) {
          document.webkitExitFullscreen();
        }
      } catch(e) {}

      StorageManager.clearActiveSession();
      this.showCompletionScreen(false);
    } catch (err) {
      console.error('Exit verification error:', err);
      if (errorEl) {
        errorEl.textContent = 'Terjadi kesalahan saat memverifikasi token keluar.';
        errorEl.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'SELESAIKAN & KELUAR';
      }
    }
  },

  handleSessionExpired() {
    if (this.timer) this.timer.stop();
    if (this.session) {
      window.DB.updateSessionStatus(this.session.session_id, 'expired');
    }
    if (window.SecurityGuard) SecurityGuard.isLocked = false;
    StorageManager.clearActiveSession();
    this.showCompletionScreen(true);
  },

  showCompletionScreen(isExpired = false) {
    const examMain = document.getElementById('examMainContent');
    const completionEl = document.getElementById('completionScreen');

    if (examMain) examMain.style.display = 'none';
    if (completionEl) {
      completionEl.style.display = 'flex';
      const titleEl = document.getElementById('completionTitle');
      const msgEl = document.getElementById('completionMessage');

      if (titleEl) titleEl.textContent = isExpired ? 'Waktu Ujian Telah Habis' : 'Ujian Telah Selesai';
      if (msgEl) {
        msgEl.textContent = isExpired 
          ? 'Batas waktu pengerjaan ujian telah berakhir. Jawaban Anda yang telah terkirim pada Google Forms akan diproses oleh proktor.'
          : 'Terima kasih telah mengerjakan ujian dengan jujur dan tertib. Sesi ujian Anda telah resmi diakhiri dan dicatat di sistem.';
      }
    }
  }
};

window.ExamSession = ExamSession;
