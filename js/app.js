/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Main Application Initializer (v3.3 Update)
 * Dynamic Academic Year/Semester Loader, Safe Shell Initializer
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  async init() {
    this.initTheme();
    this.initLogoElements();
    this.initNetworkListeners();
    this.initMobileMenu();
    this.initPWA();
    await this.loadAcademicSettings();
    this.checkActiveSessionRecovery();
    this.initStudentPortal();
  },

  initTheme() {
    const savedTheme = StorageManager.get('app_theme', 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        StorageManager.set('app_theme', next);
      });
    }
  },

  initLogoElements() {
    const logoUrl = window.APP_CONFIG?.LOGO_URL || 'assets/logo.svg';
    document.querySelectorAll('img.brand-logo-img, .brand-logo img').forEach(img => {
      img.src = logoUrl;
      img.onerror = () => {
        img.src = 'assets/logo.svg';
      };
    });
  },

  /**
   * Load Academic Year & Semester into Hero Badge
   */
  async loadAcademicSettings() {
    if (!window.DB) return;
    const settings = await window.DB.getSettings();
    const badgeEl = document.getElementById('academicYearBadge');
    if (badgeEl) {
      badgeEl.innerHTML = `<span class="status-dot active"></span> TAHUN AJARAN ${settings.academic_year || '2025/2026'} • SEMESTER ${(settings.semester || 'GENAP').toUpperCase()}`;
    }
  },

  initNetworkListeners() {
    const offlineBanner = document.getElementById('offlineBanner');
    const updateStatus = () => {
      if (!navigator.onLine) {
        if (offlineBanner) offlineBanner.classList.add('active');
        if (window.Utils) Utils.showToast('Koneksi Terputus', 'Periksa jaringan internet Anda.', 'warning');
      } else {
        if (offlineBanner) offlineBanner.classList.remove('active');
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  },

  initMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('mainNavMenu');

    if (toggleBtn && navMenu) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navMenu.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target)) {
          navMenu.classList.remove('open');
        }
      });
    }
  },

  initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => console.log('ServiceWorker registered:', reg.scope))
          .catch(err => console.log('ServiceWorker registration skipped:', err));
      });
    }
  },

  checkActiveSessionRecovery() {
    if (!window.StorageManager) return;
    const session = StorageManager.getActiveSession();
    if (!session) return;

    const now = new Date().getTime();
    const expiry = new Date(session.expires_at).getTime();

    if (now < expiry) {
      const banner = document.getElementById('sessionRecoveryBanner');
      if (banner) {
        banner.style.display = 'block';
        const nameEl = document.getElementById('recoveryExamName');
        if (nameEl) nameEl.textContent = `${session.exam_title || 'Ujian'} - ${session.student_name || 'Siswa'}`;
      }
    } else {
      StorageManager.clearActiveSession();
    }
  },

  async initStudentPortal() {
    const classContainer = document.getElementById('classSelectorContainer');
    if (classContainer && window.ClassesManager) {
      await ClassesManager.renderStudentClassSelector('classSelectorContainer', (classId, grade, categoryFilter) => {
        if (window.ExamsManager) {
          ExamsManager.loadClassExams(classId, grade, categoryFilter);
        }
      });
    }
  }
};

window.App = App;
