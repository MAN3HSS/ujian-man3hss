/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Storage Manager: LocalStorage & SessionStorage safe wrapper (v3.4 Update)
 */

const StorageManager = {
  PREFIX: 'man3hss_',

  set(key, value, isSession = false) {
    const storage = isSession ? window.sessionStorage : window.localStorage;
    try {
      storage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
  },

  get(key, defaultValue = null, isSession = false) {
    const storage = isSession ? window.sessionStorage : window.localStorage;
    try {
      const item = storage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Storage get failed:', e);
      return defaultValue;
    }
  },

  remove(key, isSession = false) {
    const storage = isSession ? window.sessionStorage : window.localStorage;
    try {
      storage.removeItem(this.PREFIX + key);
    } catch (e) {
      console.warn('Storage remove failed:', e);
    }
  },

  // Active Exam Session Helper (Stores complete session in both session and local storage)
  saveActiveSession(sessionData) {
    this.set('active_exam_session', sessionData, true);
    this.set('active_exam_session_backup', sessionData, false);
  },

  getActiveSession() {
    return this.get('active_exam_session', null, true) || this.get('active_exam_session_backup', null, false);
  },

  clearActiveSession() {
    this.remove('active_exam_session', true);
    this.remove('active_exam_session_backup', false);
  }
};

window.StorageManager = StorageManager;
