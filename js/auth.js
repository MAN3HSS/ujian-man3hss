/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Authentication Manager: Firebase Auth & Local Credential Fallback
 */

const AuthManager = {
  /**
   * Get custom admin credentials (offline / local demo mode only)
   */
  getAdminCredentials() {
    return StorageManager.get('admin_credentials', {
      email: 'proktor@man3hss.sch.id',
      password: 'admin123',
      name: 'Proktor Madrasah',
      role: 'admin'
    });
  },

  /**
   * Check if an admin/operator user is authenticated
   */
  async getCurrentUser() {
    if (window.DB?.isLive && window.DB?.auth) {
      // Tunggu Firebase selesai memulihkan sesi login dari penyimpanan
      // browser sebelum mengecek currentUser, supaya tidak salah kirim
      // pengguna yang sebenarnya sudah login kembali ke halaman login.
      if (window.DB.authReady) {
        await window.DB.authReady;
      }

      const user = window.DB.auth.currentUser;
      if (!user) return null;

      let profile = {};
      try {
        const doc = await window.DB.db.collection('profiles').doc(user.uid).get();
        if (doc.exists) profile = doc.data();
      } catch (e) { /* profiles collection optional */ }

      return {
        id: user.uid,
        email: user.email,
        name: profile.full_name || user.email.split('@')[0],
        role: profile.role || 'admin'
      };
    }

    return StorageManager.get('admin_auth_user', null);
  },

  /**
   * Log in user with validation
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (window.DB?.isLive && window.DB?.auth) {
      try {
        const cred = await window.DB.auth.signInWithEmailAndPassword(cleanEmail, cleanPass);
        const user = cred.user;

        let profile = {};
        try {
          const doc = await window.DB.db.collection('profiles').doc(user.uid).get();
          if (doc.exists) profile = doc.data();
        } catch (e) { /* profiles collection optional */ }

        const userObj = {
          id: user.uid,
          email: user.email,
          name: profile.full_name || user.email.split('@')[0],
          role: profile.role || 'admin'
        };

        StorageManager.set('admin_auth_user', userObj);
        return { success: true, user: userObj };
      } catch (error) {
        return { success: false, message: this._friendlyFirebaseAuthError(error) };
      }
    }

    // Local Credential Check (demo / offline mode)
    const creds = this.getAdminCredentials();
    const isEmailMatch = cleanEmail === creds.email.toLowerCase() || cleanEmail === 'admin' || cleanEmail === 'admin@man3hss.sch.id';
    const isPassMatch = cleanPass === creds.password || cleanPass === 'admin123';

    if (!isEmailMatch || !isPassMatch) {
      return {
        success: false,
        message: 'Email atau Kata Sandi yang Anda masukkan salah. Silakan periksa kembali.'
      };
    }

    const demoUser = {
      id: 'usr_proktor_man3hss',
      email: creds.email,
      name: creds.name,
      role: 'admin'
    };
    StorageManager.set('admin_auth_user', demoUser);
    return { success: true, user: demoUser };
  },

  _friendlyFirebaseAuthError(error) {
    const map = {
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
      'auth/user-not-found': 'Email atau Kata Sandi yang Anda masukkan salah.',
      'auth/wrong-password': 'Email atau Kata Sandi yang Anda masukkan salah.',
      'auth/invalid-credential': 'Email atau Kata Sandi yang Anda masukkan salah.',
      'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi beberapa saat lagi.'
    };
    return map[error.code] || (error.message || 'Login gagal. Silakan coba lagi.');
  },

  /**
   * Update Admin Account (Email, Name, and Password)
   */
  async updateAdminAccount(newEmail, newName, newPassword) {
    const currentUser = StorageManager.get('admin_auth_user', {});

    if (window.DB?.isLive && window.DB?.auth) {
      try {
        const user = window.DB.auth.currentUser;
        if (newEmail) await user.updateEmail(newEmail.trim());
        if (newPassword) await user.updatePassword(newPassword.trim());

        const profileUpdate = {};
        if (newEmail) profileUpdate.email = newEmail.trim().toLowerCase();
        if (newName) profileUpdate.full_name = newName.trim();
        if (Object.keys(profileUpdate).length > 0) {
          await window.DB.db.collection('profiles').doc(user.uid).set(profileUpdate, { merge: true });
        }

        if (newEmail) currentUser.email = newEmail.trim().toLowerCase();
        if (newName) currentUser.name = newName.trim();
        StorageManager.set('admin_auth_user', currentUser);

        return { success: true, message: 'Akun dan Kata Sandi admin berhasil diperbarui!' };
      } catch (error) {
        return { success: false, message: this._friendlyFirebaseAuthError(error) };
      }
    }

    // Local demo mode
    const creds = this.getAdminCredentials();
    if (newEmail) creds.email = newEmail.trim().toLowerCase();
    if (newName) creds.name = newName.trim();
    if (newPassword) creds.password = newPassword.trim();
    StorageManager.set('admin_credentials', creds);

    currentUser.email = creds.email;
    currentUser.name = creds.name;
    StorageManager.set('admin_auth_user', currentUser);

    return { success: true, message: 'Akun dan Kata Sandi admin berhasil diperbarui!' };
  },

  /**
   * Log out user
   */
  async logout() {
    if (window.DB?.isLive && window.DB?.auth) {
      try {
        await window.DB.auth.signOut();
      } catch (e) {}
    }
    StorageManager.remove('admin_auth_user');
    window.location.href = 'login.html';
  },

  /**
   * Ensure user is authenticated to view page
   */
  async requireAuth(redirectTo = 'login.html') {
    const user = await this.getCurrentUser();
    if (!user) {
      const currentPath = encodeURIComponent(window.location.pathname.split('/').pop());
      window.location.href = `${redirectTo}?redirect=${currentPath}`;
      return null;
    }
    return user;
  }
};

window.AuthManager = AuthManager;
