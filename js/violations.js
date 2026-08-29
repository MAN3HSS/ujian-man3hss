/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Violation Monitoring, Emergency Loud Siren Alarm, Vibration & Hardware Threat Watcher
 */

const ViolationTracker = {
  violationCount: 0,
  maxAllowed: 3,
  isDebouncing: false,
  broadcastChannel: null,
  audioCtx: null,
  alarmInterval: null,

  init(sessionData) {
    this.maxAllowed = sessionData?.max_violations || 3;
    this.violationCount = sessionData?.violation_count || 0;

    this.setupPageVisibilityListener();
    this.setupWindowBlurListener();
    this.setupMultiTabBroadcast(sessionData?.session_token);
    this.setupHardwareAndPeripheralWatchers();
    this.updateViolationUI();
  },

  /**
   * Loud Synthesized Emergency Siren using Web Audio API + Mobile Vibration
   */
  playLoudSiren() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.stopLoudSiren();

      const pulseAlarm = () => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return;
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          // Piercing two-tone alarm siren
          osc.type = 'sawtooth';
          const now = this.audioCtx.currentTime;
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.linearRampToValueAtTime(1450, now + 0.22);
          osc.frequency.linearRampToValueAtTime(800, now + 0.45);

          // Full Maximum Volume output
          gain.gain.setValueAtTime(1.0, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.45);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.45);
        } catch(e) {}
      };

      pulseAlarm();
      this.alarmInterval = setInterval(pulseAlarm, 500);

      // Force aggressive mobile hardware vibration pattern
      if (navigator.vibrate) {
        navigator.vibrate([500, 150, 500, 150, 700, 200, 900]);
      }

      // Add visual red flashing border
      document.body.classList.add('siren-flashing-active');
    } catch (err) {
      console.warn('Audio alarm alert:', err);
    }
  },

  stopLoudSiren() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(0); } catch(e) {}
    }
    document.body.classList.remove('siren-flashing-active');
  },

  /**
   * BroadcastChannel: Ensure only one tab is active per exam session
   */
  setupMultiTabBroadcast(sessionToken) {
    if (!window.BroadcastChannel || !sessionToken) return;

    try {
      this.broadcastChannel = new BroadcastChannel(`man3hss_exam_${sessionToken}`);
      this.broadcastChannel.postMessage({ type: 'NEW_TAB_OPENED', timestamp: Date.now() });

      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_TAB_OPENED') {
          this.triggerViolation('MULTI_TAB_DETECTED', { detail: 'Sesi dibuka di tab atau jendela browser lain' });
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }
  },

  /**
   * Tab switch detection (Page Visibility API)
   */
  setupPageVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.triggerViolation('TAB_SWITCH', { detail: 'Beralih ke aplikasi/tab lain' });
      }
    });
  },

  /**
   * Window Blur detection
   */
  setupWindowBlurListener() {
    window.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
          return;
        }
        if (!document.hidden) {
          this.triggerViolation('WINDOW_BLUR', { detail: 'Fokus jendela ujian hilang (Klik di luar layar)' });
        }
      }, 350);
    });
  },

  /**
   * Hardware, Peripheral, Split-Screen & Screenshot Watchers
   */
  setupHardwareAndPeripheralWatchers() {
    // 1. Split Screen / Multi-Window on Mobile (Viewport Shrink Detection)
    let lastHeight = window.innerHeight;
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const screenH = window.screen.height || screen.availHeight;
      
      // If height dropped significantly while in exam, student opened split-screen or floating app
      if (screenH > 500 && currentHeight < screenH * 0.72 && !document.hidden) {
        this.triggerViolation('SPLIT_SCREEN_MULTIWINDOW', { detail: 'Layar terbagi / Floating window terdeteksi' });
      }
      lastHeight = currentHeight;
    });

    // 2. Screenshot Key Detection (PrintScreen, Win+Shift+S, Snipping Tool)
    window.addEventListener('keyup', (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(''); // Clear clipboard immediately
        }
        this.triggerViolation('SCREENSHOT_ATTEMPT', { detail: 'Tombol PrintScreen ditekan' });
      }
    });

    // 3. Bluetooth Capability Probe (Flagged if Bluetooth sharing is triggered)
    if (navigator.bluetooth) {
      navigator.bluetooth.addEventListener?.('advertisementreceived', () => {
        this.triggerViolation('BLUETOOTH_ACTIVITY', { detail: 'Aktivitas Bluetooth terdeteksi' });
      });
    }
  },

  /**
   * Trigger violation, Play Loud Siren & Record to Database
   */
  async triggerViolation(eventType, metadata = {}) {
    if (this.isDebouncing) return;
    this.isDebouncing = true;
    setTimeout(() => { this.isDebouncing = false; }, 1500);

    const session = StorageManager.getActiveSession();
    if (!session) return;

    this.violationCount++;
    this.updateViolationUI();

    // PLAY LOUD SIREN ALARM & VIBRATION
    this.playLoudSiren();

    // Log to database
    try {
      await window.DB.logViolation(session.session_token, eventType, metadata);
    } catch (err) {
      console.warn('Failed to log violation to server:', err);
    }

    // Show Warning Modal
    this.showViolationWarningModal(eventType, metadata);
  },

  updateViolationUI() {
    const pill = document.getElementById('violationPill');
    const countEl = document.getElementById('violationCountDisplay');
    if (countEl) countEl.textContent = `${this.violationCount} / ${this.maxAllowed}`;

    if (pill) {
      if (this.violationCount > 0) {
        pill.className = 'violation-pill active-violation';
      } else {
        pill.className = 'violation-pill';
      }
    }
  },

  /**
   * Show Warning Modal to Student with Flashing Siren Header
   */
  showViolationWarningModal(eventType, metadata = {}) {
    const modal = document.getElementById('violationModal');
    if (!modal) return;

    let title = '🚨 PERINGATAN PELANGGARAN!';
    let severityMsg = `Terdeteksi: ${metadata.detail || eventType}. Seluruh aktivitas kecurangan dicatat otomatis oleh proktor.`;

    if (this.violationCount === 1) {
      title = '🚨 PERINGATAN PELANGGARAN (1/3)';
    } else if (this.violationCount === 2) {
      title = '🚨 PERINGATAN KERAS (2/3)';
      severityMsg += ' Peringatan kedua! Satu kali lagi ujian Anda akan ditandai MENCURIGAKAN.';
    } else if (this.violationCount >= this.maxAllowed) {
      title = '⛔ STATUS UJIAN: MENCURIGAKAN';
      severityMsg = 'Batas toleransi pelanggaran terlampaui! Status Anda dilaporkan sebagai pelanggaran berat ke proktor pengawas ruang.';
    }

    const titleEl = document.getElementById('violationModalTitle');
    const msgEl = document.getElementById('violationModalMessage');
    const countEl = document.getElementById('violationModalCount');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = severityMsg;
    if (countEl) countEl.textContent = `${this.violationCount} dari ${this.maxAllowed} Toleransi`;

    modal.classList.add('active');
  },

  dismissViolationModal() {
    // STOP LOUD SIREN
    this.stopLoudSiren();

    const modal = document.getElementById('violationModal');
    if (modal) modal.classList.remove('active');

    // Re-lock Fullscreen
    if (window.SecurityGuard) {
      SecurityGuard.attemptFullscreen();
    }
  }
};

window.ViolationTracker = ViolationTracker;
