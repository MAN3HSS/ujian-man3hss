/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Utilities: Date/Time formatting, Toast notifications, Modals, Device Detect, SHA-256
 */

const Utils = {
  /**
   * Format ISO string or Date to Indonesian localized string with WITA timezone
   */
  formatDateTime(dateInput, includeTime = true) {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    
    const options = {
      timeZone: window.APP_CONFIG?.DEFAULT_TIMEZONE || 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }

    try {
      const formatted = new Intl.DateTimeFormat('id-ID', options).format(date);
      return includeTime ? `${formatted} WITA` : formatted;
    } catch (e) {
      return date.toLocaleString('id-ID');
    }
  },

  /**
   * Format time only (HH:MM WITA)
   */
  formatTime(dateInput) {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    try {
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: window.APP_CONFIG?.DEFAULT_TIMEZONE || 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
      return `${timeStr} WITA`;
    } catch (e) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} WITA`;
    }
  },

  /**
   * Format seconds to HH:MM:SS string
   */
  formatSecondsToHMS(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(' : ');
  },

  /**
   * Compute SHA-256 Hash using Web Crypto API
   */
  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Device & Browser Diagnostic Detection
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'Desktop';
    let browser = 'Unknown Browser';

    if (/Android/i.test(ua)) {
      deviceType = /Tablet|iPad/i.test(ua) ? 'Tablet (Android)' : 'Mobile (Android)';
    } else if (/iPhone|iPod/i.test(ua)) {
      deviceType = 'Mobile (iPhone)';
    } else if (/iPad/i.test(ua)) {
      deviceType = 'Tablet (iPad)';
    } else if (/CrOS/i.test(ua)) {
      deviceType = 'Chromebook';
    } else if (/Macintosh/i.test(ua)) {
      deviceType = 'Desktop (macOS)';
    } else if (/Windows/i.test(ua)) {
      deviceType = 'Desktop (Windows)';
    } else if (/Linux/i.test(ua)) {
      deviceType = 'Desktop (Linux)';
    }

    if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
    else if (/OPR\//i.test(ua)) browser = 'Opera';

    return {
      deviceType,
      browser,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      userAgent: ua,
      hasFullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
      hasStorage: typeof window.localStorage !== 'undefined'
    };
  },

  /**
   * Toast notification system
   */
  showToast(title, message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg class="toast-icon" style="color:var(--warning)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" style="color:var(--danger)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Export Array of objects to CSV download
   */
  exportToCSV(data, filename) {
    if (!data || !data.length) {
      Utils.showToast('Gagal Export', 'Tidak ada data untuk diekspor', 'warning');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] === null || row[header] === undefined ? '' : row[header];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

window.Utils = Utils;
