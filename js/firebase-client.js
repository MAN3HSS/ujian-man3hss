/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Database & Storage Service Layer (Firebase / Firestore Edition)
 * Menggantikan supabase-client.js — method & nama tetap sama (window.DB)
 * supaya file lain (admin.js, exams.js, dst) TIDAK perlu diubah.
 */

class FirebaseService {
  constructor() {
    this.db = null;
    this.auth = null;
    this.isLive = false;
    this.init();
  }

  init() {
    const config = window.APP_CONFIG || {};
    const hasValidConfig = config.FIREBASE_CONFIG &&
                           config.FIREBASE_CONFIG.apiKey &&
                           !String(config.FIREBASE_CONFIG.apiKey).includes('YOUR_') &&
                           config.FIREBASE_CONFIG.projectId;

    if (window.firebase && hasValidConfig) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config.FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.isLive = true;

        // Firebase Auth memulihkan sesi login secara ASINKRON setelah
        // halaman dimuat. `authReady` menunggu proses itu selesai supaya
        // pengecekan login (getCurrentUser/requireAuth) tidak salah
        // mengira pengguna belum login padahal sesinya masih tersimpan.
        this.authReady = new Promise((resolve) => {
          const unsubscribe = this.auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });

        console.log('✅ Firebase Live Client initialized');
      } catch (err) {
        console.warn('⚠️ Firebase init fallback:', err);
        this.isLive = false;
        this.initLocalDatabase();
      }
    } else {
      this.isLive = false;
      this.initLocalDatabase();
    }
  }

  /* ============================================================
     LOCAL DEMO FALLBACK (dipakai jika Firebase belum dikonfigurasi)
     Identik dengan versi Supabase — tidak diubah.
  ============================================================ */
  initLocalDatabase() {
    if (!StorageManager.get('db_settings')) {
      StorageManager.set('db_settings', {
        school_name: "MAN 3 HULU SUNGAI SELATAN",
        app_name: "PORTAL UJIAN MAN 3 HSS",
        tagline: "Sistem Ujian Online Terintegrasi",
        academic_year: "2025/2026",
        semester: "Genap",
        timezone: "Asia/Makassar",
        max_violations: 3,
        menu_susulan_enabled: true,
        menu_remedial_enabled: true,
        menu_tryout_enabled: false,
        menu_khusus_enabled: false
      });
    }

    if (!StorageManager.get('db_classes')) {
      StorageManager.set('db_classes', [
        { id: 'c1', name: 'X IPA 1', grade: 'X', active: true, description: 'Kelas Sepuluh MIPA 1' },
        { id: 'c2', name: 'X IPA 2', grade: 'X', active: true, description: 'Kelas Sepuluh MIPA 2' },
        { id: 'c3', name: 'X IPS 1', grade: 'X', active: true, description: 'Kelas Sepuluh IPS 1' }
      ]);
    }

    if (!StorageManager.get('db_students')) {
      StorageManager.set('db_students', []);
    }

    if (!StorageManager.get('db_exams')) {
      StorageManager.set('db_exams', []);
    }
  }

  /* ============================================================
     HELPERS
  ============================================================ */
  _col(name) {
    return this.db.collection(name);
  }

  async _getAllDocs(collectionName) {
    const snap = await this._col(collectionName).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /* ============================================================
     SETTINGS
  ============================================================ */
  async getSettings() {
    if (!this.isLive) return StorageManager.get('db_settings', {});

    const ref = this.db.collection('settings').doc('main');
    const doc = await ref.get();
    if (!doc.exists) {
      const defaults = {
        academic_year: '2025/2026',
        semester: 'Genap',
        menu_susulan_enabled: true,
        menu_remedial_enabled: true,
        menu_tryout_enabled: false,
        menu_khusus_enabled: false
      };
      await ref.set(defaults);
      return defaults;
    }
    return doc.data();
  }

  async saveSettings(settingsData) {
    if (!this.isLive) {
      const current = StorageManager.get('db_settings', {});
      const updated = { ...current, ...settingsData };
      StorageManager.set('db_settings', updated);
      return updated;
    }
    const ref = this.db.collection('settings').doc('main');
    await ref.set(settingsData, { merge: true });
    return await this.getSettings();
  }

  async isGlobalExamPaused() {
    const settings = await this.getSettings();
    return !!settings.global_exam_paused;
  }

  async setGlobalExamPause(isPaused) {
    await this.saveSettings({ global_exam_paused: isPaused });
    return isPaused;
  }

  /* ============================================================
     CLASSES
  ============================================================ */
  async getClasses() {
    let classes;
    if (!this.isLive) {
      classes = StorageManager.get('db_classes', []);
    } else {
      classes = await this._getAllDocs('classes');
    }
    classes.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' })
    );
    return classes;
  }

  async saveClass(classData) {
    if (!this.isLive) {
      const classes = StorageManager.get('db_classes', []);
      if (classData.id) {
        const idx = classes.findIndex(c => c.id === classData.id);
        if (idx !== -1) classes[idx] = { ...classes[idx], ...classData };
      } else {
        classData.id = `c_${Date.now()}`;
        if (classData.active === undefined) classData.active = true;
        classes.push(classData);
      }
      StorageManager.set('db_classes', classes);
      return true;
    }

    if (classData.id) {
      const { id, ...rest } = classData;
      await this._col('classes').doc(id).set(rest, { merge: true });
    } else {
      if (classData.active === undefined) classData.active = true;
      await this._col('classes').add(classData);
    }
    return true;
  }

  /* ============================================================
     STUDENTS
  ============================================================ */
  async getStudents(classId = null, grade = null) {
    if (!this.isLive) {
      let students = StorageManager.get('db_students', []);
      if (classId) {
        students = students.filter(s => s.class_id === classId || s.class_name === classId);
      } else if (grade) {
        const classes = await this.getClasses();
        const gradeClassIds = classes.filter(c => c.grade === grade).map(c => c.id);
        students = students.filter(s => gradeClassIds.includes(s.class_id));
      }
      students.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'id', { numeric: true, sensitivity: 'base' }));
      return students;
    }

    let query = this._col('students');
    if (classId) {
      query = query.where('class_id', '==', classId);
    }
    const snap = await query.get();
    let students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (grade && !classId) {
      const classes = await this.getClasses();
      const gradeClassIds = classes.filter(c => c.grade === grade).map(c => c.id);
      students = students.filter(s => gradeClassIds.includes(s.class_id));
    }

    students.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'id', { numeric: true, sensitivity: 'base' }));
    return students;
  }

  async saveStudent(studentData) {
    if (!this.isLive) {
      let students = StorageManager.get('db_students', []);
      if (studentData.id) {
        const idx = students.findIndex(s => s.id === studentData.id);
        if (idx !== -1) students[idx] = { ...students[idx], ...studentData };
      } else {
        studentData.id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        if (studentData.active === undefined) studentData.active = true;
        students.push(studentData);
      }
      StorageManager.set('db_students', students);
      return true;
    }

    if (studentData.id) {
      const { id, ...rest } = studentData;
      await this._col('students').doc(id).set(rest, { merge: true });
    } else {
      if (studentData.active === undefined) studentData.active = true;
      await this._col('students').add(studentData);
    }
    return true;
  }

  async deleteStudent(studentId) {
    if (!this.isLive) {
      let students = StorageManager.get('db_students', []);
      students = students.filter(s => s.id !== studentId);
      StorageManager.set('db_students', students);
      return true;
    }
    await this._col('students').doc(studentId).delete();
    return true;
  }

  async importStudents(studentsArray) {
    if (!this.isLive) {
      let students = StorageManager.get('db_students', []);
      studentsArray.forEach(item => {
        const existingIdx = students.findIndex(s => s.student_number === item.student_number);
        if (existingIdx !== -1) {
          students[existingIdx] = { ...students[existingIdx], ...item };
        } else {
          item.id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          students.push(item);
        }
      });
      StorageManager.set('db_students', students);
      return students.length;
    }

    // Firestore: batched write (max 500 per batch)
    const existing = await this._getAllDocs('students');
    let batch = this.db.batch();
    let opsInBatch = 0;
    let count = 0;

    for (const item of studentsArray) {
      const match = existing.find(s => s.student_number === item.student_number);
      const ref = match ? this._col('students').doc(match.id) : this._col('students').doc();
      if (item.active === undefined) item.active = true;
      batch.set(ref, item, { merge: true });
      opsInBatch++;
      count++;
      if (opsInBatch === 450) {
        await batch.commit();
        batch = this.db.batch();
        opsInBatch = 0;
      }
    }
    if (opsInBatch > 0) await batch.commit();
    return count;
  }

  async clearAllStudents() {
    if (!this.isLive) {
      StorageManager.set('db_students', []);
      return true;
    }
    const snap = await this._col('students').get();
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  }

  async deleteMultipleStudents(studentIds) {
    if (!this.isLive) {
      let students = StorageManager.get('db_students', []);
      students = students.filter(s => !studentIds.includes(s.id));
      StorageManager.set('db_students', students);
      return true;
    }
    const batch = this.db.batch();
    studentIds.forEach(id => batch.delete(this._col('students').doc(id)));
    await batch.commit();
    return true;
  }

  /* ============================================================
     EXAMS (Student-facing accessor)
  ============================================================ */
  async getExams(classId = null, filterType = null, grade = null) {
    const allExams = await this.getAllExamsAdmin();
    let exams = allExams.filter(e => e.status === 'active');

    if (['Ujian Susulan', 'Remedial', 'Try Out', 'Khusus'].includes(filterType)) {
      return exams.filter(e => e.type === filterType);
    }

    if (classId) {
      return exams.filter(e =>
        e.type === 'Ujian Utama' && Array.isArray(e.classes) && e.classes.includes(classId)
      );
    }

    if (grade) {
      const classes = await this.getClasses();
      const gradeClassIds = classes.filter(c => c.grade === grade).map(c => c.id);
      return exams.filter(e =>
        e.type === 'Ujian Utama' && Array.isArray(e.classes) && e.classes.some(cid => gradeClassIds.includes(cid))
      );
    }

    return [];
  }

  /* ============================================================
     SESSION & TOKEN VERIFICATION
  ============================================================ */
  async verifyTokenAndStartSession(examId, tokenInput, studentName, classId, className, studentNumber = '') {
    const isPaused = await this.isGlobalExamPaused();
    if (isPaused) {
      return {
        success: false,
        message: '⛔ SELURUH UJIAN SEDANG DITANGGUHKAN / DIHENTIKAN SEMENTARA oleh Proktor Madrasah. Harap tunggu hingga proktor membuka kembali ujian.'
      };
    }

    const exams = await this.getAllExamsAdmin();
    const exam = exams.find(e => e.id === examId);
    if (!exam || exam.status !== 'active') {
      return { success: false, message: 'Ujian tidak ditemukan atau sedang dinonaktifkan oleh proktor.' };
    }

    const now = new Date();
    if (new Date(exam.start_at) > now) {
      return { success: false, message: 'Ujian belum dimulai. Silakan tunggu jadwal resmi.' };
    }
    if (new Date(exam.end_at) < now) {
      return { success: false, message: 'Jadwal ujian ini telah berakhir.' };
    }

    const sessions = await this.getActiveSessions();
    const cleanStudentName = (studentName || '').trim().toLowerCase();
    const cleanStudentNumber = (studentNumber || '').trim();

    const previousSession = sessions.find(s => {
      if (s.exam_id !== exam.id) return false;
      const matchNumber = cleanStudentNumber && cleanStudentNumber !== '-' && s.student_number === cleanStudentNumber;
      const matchName = cleanStudentName && (s.student_name || '').trim().toLowerCase() === cleanStudentName;
      const isLockedStatus = s.status === 'completed' || s.status === 'terminated' || s.status === 'expired';
      return (matchNumber || matchName) && isLockedStatus && !s.is_reset_allowed;
    });

    if (previousSession) {
      let statusDesc = 'Telah Selesai';
      if (previousSession.status === 'terminated') statusDesc = 'Dikeluarkan Pengawas';
      else if (previousSession.status === 'expired') statusDesc = 'Waktu Habis';

      return {
        success: false,
        message: `🔒 AKSES TERKUNCI: Anda tercatat '${statusDesc}' pada ujian ini. Anda tidak dapat mengerjakan untuk kedua kalinya. Jika memerlukan ujian ulang (karena kendala teknis), silakan hubungi Proktor Pengawas untuk membuka kunci ujian Anda.`
      };
    }

    const cleanInput = (tokenInput || '').trim().toUpperCase();
    const cleanPlain = (exam.token_masuk_plain || '').trim().toUpperCase();
    const inputHash = await Utils.sha256(cleanInput);

    const isTokenValid = (cleanPlain && cleanInput === cleanPlain) ||
                         (exam.token_hash && inputHash === exam.token_hash);

    if (!isTokenValid) {
      return {
        success: false,
        message: `Token Masuk '${tokenInput}' salah. Minta token kepada pengawas ruang.`,
        code: 'INVALID_TOKEN'
      };
    }

    const devInfo = Utils.getDeviceInfo();
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Math.min(
      now.getTime() + exam.duration_minutes * 60000,
      new Date(exam.end_at).getTime()
    )).toISOString();

    const newSession = {
      exam_id: exam.id,
      exam_title: exam.title,
      class_id: classId,
      class_name: className || 'Kelas',
      student_name: studentName || 'Peserta Ujian',
      student_number: studentNumber || '-',
      session_identifier: sessionToken,
      token_keluar_plain: exam.token_keluar_plain || 'SELESAI',
      token_keluar_hash: exam.token_keluar_hash || null,
      device_type: devInfo.deviceType,
      browser: devInfo.browser,
      started_at: now.toISOString(),
      expires_at: expiresAt,
      status: 'active',
      violation_count: 0,
      last_activity_at: now.toISOString()
    };

    let newSessionId;
    if (!this.isLive) {
      newSessionId = `s_${Date.now()}`;
      const sessions = StorageManager.get('db_sessions', []);
      sessions.unshift({ id: newSessionId, ...newSession });
      StorageManager.set('db_sessions', sessions);
    } else {
      const ref = await this._col('sessions').add(newSession);
      newSessionId = ref.id;
    }

    return {
      success: true,
      session_id: newSessionId,
      session_token: sessionToken,
      exam_title: exam.title,
      subject: exam.subject,
      student_name: newSession.student_name,
      student_number: newSession.student_number,
      class_name: newSession.class_name,
      form_url: exam.form_url,
      token_keluar_plain: newSession.token_keluar_plain,
      duration_minutes: exam.duration_minutes,
      started_at: now.toISOString(),
      expires_at: expiresAt,
      allow_iframe: exam.allow_iframe !== false,
      max_violations: exam.max_violations || 3
    };
  }

  async unlockStudentExam(sessionId) {
    return await this.updateSessionStatus(sessionId, 'reset_by_admin', { is_reset_allowed: true });
  }

  async verifyExitToken(sessionId, tokenKeluarInput) {
    const cleanInput = (tokenKeluarInput || '').trim().toUpperCase();
    if (!cleanInput) {
      return { success: false, message: 'Harap masukkan Token Keluar dari pengawas.' };
    }

    const sessions = await this.getActiveSessions();
    const activeStoredSession = StorageManager.getActiveSession();

    let session = sessions.find(s =>
      (sessionId && (s.id === sessionId || s.session_identifier === sessionId || s.session_token === sessionId)) ||
      (activeStoredSession && (s.id === activeStoredSession.session_id || s.session_identifier === activeStoredSession.session_token))
    );

    if (!session && activeStoredSession) {
      session = activeStoredSession;
    }

    const inputHash = await Utils.sha256(cleanInput);
    let isExitValid = cleanInput === 'SELESAI';

    if (session) {
      const plainToken = (session.token_keluar_plain || '').trim().toUpperCase();
      if (plainToken && cleanInput === plainToken) isExitValid = true;
      if (session.token_keluar_hash && inputHash === session.token_keluar_hash) isExitValid = true;
    }

    if (session && session.exam_id) {
      const exams = await this.getAllExamsAdmin();
      const exam = exams.find(e => e.id === session.exam_id);
      if (exam) {
        const examPlain = (exam.token_keluar_plain || '').trim().toUpperCase();
        if (examPlain && cleanInput === examPlain) isExitValid = true;
        if (exam.token_keluar_hash && inputHash === exam.token_keluar_hash) isExitValid = true;
      }
    }

    if (!isExitValid) {
      return {
        success: false,
        message: `Token Keluar '${tokenKeluarInput}' tidak valid! Minta Token Keluar resmi kepada pengawas ruangan.`
      };
    }

    if (session) {
      await this.updateSessionStatus(session.id, 'completed');
    }

    return { success: true, message: 'Sesi ujian berhasil diselesaikan.' };
  }

  async logViolation(sessionToken, eventType, metadata = {}) {
    const sessions = await this.getActiveSessions();
    const session = sessions.find(s => s.session_identifier === sessionToken);
    if (!session) return { success: false };

    const newCount = (session.violation_count || 0) + 1;
    let severity = 'WARNING';
    let newStatus = session.status;
    if (newCount === 2) severity = 'SERIOUS WARNING';
    if (newCount >= 3) {
      severity = 'FINAL WARNING';
      newStatus = 'suspicious';
    }

    await this.updateSessionStatus(session.id, newStatus, {
      violation_count: newCount,
      last_activity_at: new Date().toISOString()
    });

    const violationEntry = {
      session_id: session.id,
      student_name: session.student_name,
      student_number: session.student_number || '-',
      class_name: session.class_name,
      event_type: eventType,
      severity: severity,
      event_time: new Date().toISOString(),
      metadata: metadata
    };

    if (!this.isLive) {
      const violations = StorageManager.get('db_violations', []);
      violations.unshift({ id: `v_${Date.now()}`, ...violationEntry });
      StorageManager.set('db_violations', violations);
    } else {
      await this._col('violations').add(violationEntry);
    }

    return {
      success: true,
      violation_count: newCount,
      max_allowed: 3,
      severity: severity,
      is_suspicious: newCount >= 3
    };
  }

  /* ============================================================
     ADMIN CRUD — EXAMS
  ============================================================ */
  async getAllExamsAdmin() {
    if (!this.isLive) return StorageManager.get('db_exams', []);
    return await this._getAllDocs('exams');
  }

  async toggleExamStatus(examId) {
    const exams = await this.getAllExamsAdmin();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return false;
    const newStatus = exam.status === 'active' ? 'inactive' : 'active';

    if (!this.isLive) {
      exam.status = newStatus;
      StorageManager.set('db_exams', exams);
    } else {
      await this._col('exams').doc(examId).update({ status: newStatus });
    }
    return newStatus;
  }

  async saveExam(examData) {
    if (!this.isLive) {
      const exams = StorageManager.get('db_exams', []);
      if (examData.id) {
        const idx = exams.findIndex(e => e.id === examData.id);
        if (idx !== -1) exams[idx] = { ...exams[idx], ...examData };
      } else {
        examData.id = `e_${Date.now()}`;
        if (!examData.status) examData.status = 'active';
        exams.unshift(examData);
      }
      StorageManager.set('db_exams', exams);
      return true;
    }

    if (examData.id) {
      const { id, ...rest } = examData;
      await this._col('exams').doc(id).set(rest, { merge: true });
    } else {
      if (!examData.status) examData.status = 'active';
      await this._col('exams').add(examData);
    }
    return true;
  }

  async deleteExam(examId) {
    if (!this.isLive) {
      let exams = StorageManager.get('db_exams', []);
      exams = exams.filter(e => e.id !== examId);
      StorageManager.set('db_exams', exams);
      return true;
    }
    await this._col('exams').doc(examId).delete();
    return true;
  }

  /* ============================================================
     ADMIN METRICS
  ============================================================ */
  async getAdminMetrics() {
    const exams = await this.getAllExamsAdmin();
    const sessions = await this.getActiveSessions();
    const violations = await this.getAllViolations();
    const classes = await this.getClasses();
    const students = await this.getStudents();

    const activeExams = exams.filter(e => e.status === 'active').length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;

    return {
      totalExams: exams.length,
      activeExams,
      totalClasses: classes.length,
      totalStudents: students.length,
      activeSessions,
      todayViolations: violations.length
    };
  }

  /* ============================================================
     SESSIONS
  ============================================================ */
  async getActiveSessions() {
    if (!this.isLive) return StorageManager.get('db_sessions', []);
    return await this._getAllDocs('sessions');
  }

  async updateSessionStatus(sessionId, status, extraFields = {}) {
    const now = new Date().toISOString();
    const fields = { status, last_activity_at: now, ...extraFields };
    if (status === 'terminated' || status === 'completed') {
      fields.ended_at = now;
    }

    if (!this.isLive) {
      const sessions = StorageManager.get('db_sessions', []);
      const sess = sessions.find(s => s.id === sessionId || s.session_identifier === sessionId);
      if (sess) {
        Object.assign(sess, fields);
        StorageManager.set('db_sessions', sessions);
      }
      return true;
    }

    let docId = sessionId;
    const doc = await this._col('sessions').doc(sessionId).get();
    if (!doc.exists) {
      const snap = await this._col('sessions').where('session_identifier', '==', sessionId).limit(1).get();
      if (!snap.empty) docId = snap.docs[0].id;
      else return true;
    }
    await this._col('sessions').doc(docId).update(fields);
    return true;
  }

  async checkSessionStatus(sessionId) {
    const sessions = await this.getActiveSessions();
    const sess = sessions.find(s => s.id === sessionId || s.session_identifier === sessionId || s.session_token === sessionId);
    return sess ? sess.status : 'active';
  }

  async deleteSession(sessionId) {
    if (!this.isLive) {
      let sessions = StorageManager.get('db_sessions', []);
      sessions = sessions.filter(s => s.id !== sessionId && s.session_identifier !== sessionId);
      StorageManager.set('db_sessions', sessions);
      return true;
    }
    await this._col('sessions').doc(sessionId).delete();
    return true;
  }

  async clearAllSessions() {
    if (!this.isLive) {
      StorageManager.set('db_sessions', []);
      return true;
    }
    const snap = await this._col('sessions').get();
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  }

  /* ============================================================
     VIOLATIONS
  ============================================================ */
  async getAllViolations() {
    if (!this.isLive) return StorageManager.get('db_violations', []);
    return await this._getAllDocs('violations');
  }

  async deleteViolation(violationId) {
    if (!this.isLive) {
      let violations = StorageManager.get('db_violations', []);
      violations = violations.filter(v => v.id !== violationId);
      StorageManager.set('db_violations', violations);
      return true;
    }
    await this._col('violations').doc(violationId).delete();
    return true;
  }

  async clearAllViolations() {
    if (!this.isLive) {
      StorageManager.set('db_violations', []);
      return true;
    }
    const snap = await this._col('violations').get();
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  }
}

window.DB = new FirebaseService();
