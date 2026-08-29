/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Smart Server-Synced Timer Engine
 */

class ExamTimer {
  constructor(expiresAtIso, onTick, onExpire) {
    this.expiresAt = new Date(expiresAtIso).getTime();
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.timerInterval = null;
    this.isExpired = false;
  }

  start() {
    this.tick();
    this.timerInterval = setInterval(() => this.tick(), 1000);
  }

  tick() {
    const now = Date.now();
    const remainingMs = this.expiresAt - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    if (this.onTick) {
      this.onTick(remainingSeconds, this.getStatus(remainingSeconds));
    }

    if (remainingSeconds <= 0 && !this.isExpired) {
      this.isExpired = true;
      this.stop();
      if (this.onExpire) {
        this.onExpire();
      }
    }
  }

  getStatus(seconds) {
    if (seconds <= 300) return 'critical'; // < 5 mins
    if (seconds <= 600) return 'warning';  // < 10 mins
    return 'normal';
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

window.ExamTimer = ExamTimer;
