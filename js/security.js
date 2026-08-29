/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Security Guard: Aggressive Fullscreen Lock, Anti-Cheat, Shortcut & Context Blocker
 */

const SecurityGuard = {
  isFullscreenActive: false,
  isLocked: false,

  /**
   * Initialize security listeners for the exam gateway
   */
  initExamSecurity() {
    this.isLocked = true;
    this.disableCopyPasteSelection();
    this.disableDeveloperShortcuts();
    this.setupNavigationGuard();
    this.setupFullscreenEnforcement();
  },

  /**
   * Enforce Fullscreen Mode
   */
  setupFullscreenEnforcement() {
    const fsOverlay = document.getElementById('fullscreenLockOverlay');
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    
    // If not already fullscreen, display lock overlay immediately so browser UI is never exposed
    if (!isFs) {
      if (fsOverlay) fsOverlay.style.display = 'flex';
      this.attemptFullscreen();
    } else {
      if (fsOverlay) fsOverlay.style.display = 'none';
    }

    // Re-attempt on any initial click/touch in case browser requires immediate interaction
    const initialClickHandler = () => {
      this.attemptFullscreen();
    };
    document.addEventListener('click', initialClickHandler);
    document.addEventListener('touchstart', initialClickHandler);

    // Listen for fullscreen change
    const onFullscreenChange = () => {
      const isNowFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      this.isFullscreenActive = isNowFs;

      if (!isNowFs && this.isLocked) {
        if (fsOverlay) fsOverlay.style.display = 'flex';
        if (window.ViolationTracker) {
          ViolationTracker.triggerViolation('FULLSCREEN_EXIT', { detail: 'Keluar dari mode layar penuh' });
        }
      } else {
        if (fsOverlay) fsOverlay.style.display = 'none';
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  },

  async attemptFullscreen() {
    const docEl = document.documentElement;
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
        this.isFullscreenActive = true;
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
        this.isFullscreenActive = true;
      }
    } catch (err) {
      console.warn('Fullscreen request prompt pending user interaction');
    }
  },

  /**
   * Disable copy, cut, paste, context menu, text selection, and drag
   */
  disableCopyPasteSelection() {
    const blockEvent = (e) => {
      if (!this.isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    ['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart'].forEach(evt => {
      document.addEventListener(evt, blockEvent, true);
    });

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
  },

  /**
   * Block developer tools, inspection, and page navigation shortcuts
   */
  disableDeveloperShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!this.isLocked) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const key = e.key ? e.key.toUpperCase() : '';

      // Block F12 (DevTools), F5 (Refresh)
      if (e.key === 'F12' || e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        this.notifyShortcutBlocked(e.key);
        return false;
      }

      // Block Ctrl + (U, S, P, C, V, X, A, R, N, T, W)
      if (isCtrl && ['U', 'S', 'P', 'C', 'V', 'X', 'A', 'R', 'N', 'T', 'W'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        this.notifyShortcutBlocked(`Ctrl+${key}`);
        return false;
      }

      // Block Ctrl + Shift + (I, J, C, R)
      if (isCtrl && e.shiftKey && ['I', 'J', 'C', 'R'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        this.notifyShortcutBlocked(`Ctrl+Shift+${key}`);
        return false;
      }

      // Block Alt + Arrow (Navigation)
      if (isAlt && ['ARROWLEFT', 'ARROWRIGHT'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);
  },

  notifyShortcutBlocked(shortcutName) {
    if (window.Utils) {
      Utils.showToast('Tindakan Terkunci', `Kombinasi tombol (${shortcutName}) dinonaktifkan demi keamanan ujian.`, 'warning');
    }
    if (window.ViolationTracker) {
      ViolationTracker.triggerViolation('SHORTCUT_BLOCKED', { shortcut: shortcutName });
    }
  },

  /**
   * Navigation Guard (beforeunload & history lock)
   */
  setupNavigationGuard() {
    window.addEventListener('beforeunload', (e) => {
      if (!this.isLocked) return;
      e.preventDefault();
      e.returnValue = 'Sesi ujian Anda sedang berjalan. Yakin ingin meninggalkan halaman?';
      return e.returnValue;
    });

    window.history.pushState(null, "", window.location.href);
    window.addEventListener('popstate', () => {
      if (this.isLocked) {
        window.history.pushState(null, "", window.location.href);
        if (window.Utils) {
          Utils.showToast('Navigasi Terkunci', 'Gunakan tombol Selesai Ujian di portal untuk keluar.', 'warning');
        }
      }
    });
  }
};

window.SecurityGuard = SecurityGuard;
