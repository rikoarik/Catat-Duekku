const strings = {
  id: {
    common: {
      appName: 'Catat Duekku',
      continue: 'Lanjutkan',
      understand: 'Mengerti',
      tryAgain: 'Coba Lagi',
      save: 'Simpan',
      edit: 'Edit',
      syncNow: 'Sync Sekarang',
      reset: 'Reset',
      cancel: 'Batal',
    },
    dashboard: {
      fallbackUserName: 'Sahabat Duekku',
      greetingHello: 'Halo',
      greetingWelcome: 'Ringkasan keuanganmu',
      walletTitle: 'Dompet & Akun',
      walletDescription: 'Kelola akun tunai, bank, dan e-wallet Anda.',
      analyticsTitle: 'Analisis Keuangan',
      analyticsDescription: 'Grafik dan statistik pengeluaran bulanan Anda.',
      profileTitle: 'Profil & Pengaturan',
      profileDescription: 'Pengaturan akun, waktu, dan keamanan PIN/biometrik.',
      balanceLabel: 'Saldo',
      quickExpenseTitle: 'Catat pengeluaran cepat',
      quickManual: 'Manual',
      insightTag: 'Insight AI',
      insightToday: 'Hari ini',
      insightDefault: 'Pengeluaran makan minggu ini 15% lebih hemat dari minggu lalu.',
      spectrumPemasukan: 'Pemasukan',
      spectrumPengeluaran: 'Pengeluaran',
      spectrumTabungan: 'Tabungan',
      spectrumUtang: 'Sisa utang',
      spectrumBudget: 'Sisa budget',
    },
    auth: {
      welcomeBack: 'Selamat Datang,',
      createAccount: 'Buat Akun Baru',
      loginSubtitle: 'Senang melihat Anda kembali. Masukkan email dan kata sandi Anda.',
      registerSubtitle: 'Mulai perjalanan keuanganmu. Hanya membutuhkan waktu beberapa detik.',
      tabLogin: 'Masuk',
      tabRegister: 'Daftar',
      fullNameLabel: 'Nama Lengkap',
      fullNamePlaceholder: 'Masukkan nama lengkap',
      emailLabel: 'Alamat Email',
      emailPlaceholder: 'nama@email.com',
      passwordLabel: 'Kata Sandi',
      rememberMe: 'Ingat saya',
      forgotPassword: 'Lupa Kata Sandi?',
      socialDivider: 'Atau masuk dengan',
      socialGoogle: 'Google',
      socialApple: 'Apple',
      continueWithFacebook: 'Lanjutkan dengan Facebook',
      loginSuccessTitle: 'Berhasil Masuk!',
      loginSuccessMessage: 'Selamat datang kembali di Catat Duekku.',
      registerSuccessTitle: 'Akun Berhasil Dibuat!',
      registerSuccessMessage: 'Selamat datang! Akun Anda telah terdaftar.',
      loginFailedTitle: 'Gagal Masuk',
      loginFailedMessage: 'Periksa kembali email dan kata sandi Anda.',
      registerFailedTitle: 'Pendaftaran Gagal',
      registerFailedMessage: 'Gagal membuat akun baru. Silakan coba lagi.',
      genericErrorMessage: 'Terjadi kesalahan pada sistem.',
      inputIncompleteTitle: 'Input Belum Lengkap',
      inputIncompleteLogin: 'Email dan kata sandi wajib diisi.',
      inputIncompleteRegister: 'Nama lengkap wajib diisi.',
      genericErrorTitle: 'Terjadi Kesalahan',
      biometricPrompt: 'Masuk ke Catat Duekku',
      enterApp: 'Masuk Aplikasi',
    },
    profile: {
      title: 'Profile',
      sectionProfile: 'Profil',
      sectionSecurity: 'Keamanan',
      sectionPreferences: 'Preferensi Sistem',
      sectionData: 'Penyimpanan & Data',
      editProfileLabel: 'Ubah Profil',
      editProfileDescription: 'Ubah nama lengkap Anda yang terdaftar',
      pinLockLabel: 'Kunci PIN',
      pinLockDescription: 'Kunci akses aplikasi dengan 6 digit PIN',
      biometricLabel: 'Sidik Jari / Face ID',
      biometricDescription: 'Gunakan autentikasi biometrik',
      biometricUnsupported: 'Perangkat tidak mendukung biometrik',
      changePinLabel: 'Ubah PIN',
      changePinDescription: 'Ganti 6 digit PIN Anda saat ini',
      timezoneLabel: 'Zona Waktu',
      timezoneDescription: 'Mengikuti wilayah pencatatan Anda',
      appearanceLabel: 'Tampilan Aplikasi',
      appearanceDescription: 'Mengikuti pengaturan sistem perangkat',
      appearanceDark: 'Gelap',
      appearanceLight: 'Terang',
      languageLabel: 'Bahasa Aplikasi',
      languageDescription: 'Pilih bahasa tampilan aplikasi (ID / EN)',
      languageIndonesian: 'Bahasa Indonesia 🇮🇩',
      languageEnglish: 'English 🇬🇧',
      resyncLabel: 'Sinkronisasi Ulang',
      resyncDescription: 'Segarkan koneksi database cloud',
      resetLabel: 'Reset Semua Data',
      resetDescription: 'Hapus permanen seluruh data dan PIN',
      logoutLabel: 'Keluar Akun',
      cloudSyncActive: 'Cloud Sync Aktif',
      defaultUserName: 'Pengguna Catat Duekku',
      defaultEmail: 'tidak_terhubung@email.com',
      syncSuccessTitle: 'Sinkronisasi Berhasil',
      syncSuccessMessage: 'Data transaksi dan pengaturan Anda telah sinkron dengan cloud.',
      disablePinTitle: 'Nonaktifkan PIN',
      disablePinMessage: 'Apakah Anda yakin ingin menonaktifkan kunci PIN? Ini juga akan menonaktifkan autentikasi biometrik.',
      disablePinConfirm: 'Nonaktifkan',
      pinDisabledTitle: 'PIN Dinonaktifkan',
      pinDisabledMessage: 'Kunci PIN keamanan Anda telah dinonaktifkan.',
      pinRequiredTitle: 'PIN Diperlukan',
      pinRequiredMessage: 'Anda harus mengaktifkan kunci PIN terlebih dahulu sebelum mengaktifkan autentikasi biometrik sebagai cadangan.',
      setupPinNow: 'Atur PIN Sekarang',
      biometricPrompt: 'Konfirmasi biometrik perangkat Anda',
      biometricEnabledTitle: 'Biometrik Aktif',
      biometricEnabledMessage: 'Autentikasi Face ID / Sidik Jari berhasil diaktifkan.',
      resetDataTitle: 'Hapus Semua Data',
      resetDataMessage: 'Tindakan ini akan menghapus seluruh data transaksi, utang, anggaran, target tabungan, dan PIN Anda secara permanen dari perangkat ini. Aksi ini tidak dapat dibatalkan.',
      resetDataConfirm: 'Reset Permanen',
      dataResetTitle: 'Data Dihapus',
      dataResetMessage: 'Semua data transaksi dan pengaturan keamanan telah direset ke setelan awal.',
      logoutTitle: 'Keluar dari Aplikasi',
      logoutMessage: 'Apakah Anda yakin ingin keluar dari akun Anda?',
      logoutConfirm: 'Keluar',
      editTitle: 'Edit Profil',
      editSubtitle: 'Perbarui data diri Anda yang terhubung dengan cloud',
      fullNameLabel: 'Nama Lengkap',
      fullNamePlaceholder: 'Masukkan nama lengkap Anda',
      emailReadOnlyLabel: 'Alamat Email (Tidak dapat diubah)',
      saveChanges: 'Simpan Perubahan',
      saving: 'Menyimpan...',
      editInputIncompleteTitle: 'Input Tidak Lengkap',
      editInputIncompleteMessage: 'Nama lengkap wajib diisi.',
      editFailedTitle: 'Gagal Memperbarui',
      editSuccessTitle: 'Profil Diperbarui',
      editSuccessMessage: 'Nama lengkap profil Anda telah berhasil diubah.',
      genericError: 'Terjadi kesalahan sistem.',
    },
    onboarding: {
      skip: 'Lewati',
      next: 'Lanjut',
      enableNotificationsAndStart: 'Aktifkan Notifikasi & Mulai',
      step1Title: 'Catat Keuangan Serba Cerdas',
      step1Subtitle: 'FINANCIAL CLARITY',
      step1Description: 'Lacak setiap pemasukan, pengeluaran, dan kategori transaksi Anda secara cepat, intuitif, dan terorganisir.',
      step2Title: 'Anggaran & Target Masa Depan',
      step2Subtitle: 'SMART BUDGETING',
      step2Description: 'Tetapkan limit anggaran harian/bulanan serta pantau perkembangan tabungan impian Anda secara nyata.',
      step3Title: 'Pengingat & Keamanan Data',
      step3Subtitle: 'ALWAYS REMINDED & SECURE',
      step3Description: 'Dapatkan notifikasi pengingat pengeluaran harian dan jatuh tempo tagihan agar finansial Anda tetap sehat.',
    },
    tour: {
      stepOf: 'dari',
      skip: 'Lewati',
      previous: 'Sebelumnya',
      next: 'Lanjut',
      finish: 'Selesai Tour',
      step1Title: 'Ringkasan Saldo Utama',
      step1Desc: 'Lihat total akumulasi uang dari seluruh dompet aktif Anda dalam satu angka.',
      step2Title: 'Kelola Multi-Dompet',
      step2Desc: 'Akses dan kelola dompet tunai, rekening bank, serta e-wallet secara terpisah.',
      step3Title: 'Filter & Cari Transaksi',
      step3Desc: 'Cari transaksi dengan cepat berdasarkan rentang tanggal, kategori, atau dompet.',
      step4Title: 'Tambah Transaksi Cepat',
      step4Desc: 'Catat pengeluaran, pemasukan, atau transfer antar dompet hanya dalam beberapa ketukan.',
      step5Title: 'Scan Struk AI / OCR',
      step5Desc: 'Pindai foto nota belanjaan fisik Anda, nominal & toko otomatis terdeteksi tanpa ketik manual.',
      step6Title: 'Target Anggaran Bulanan',
      step6Desc: 'Tetapkan batas anggaran per kategori untuk menjaga pengeluaran tetap terkontrol.',
      step7Title: 'Grafik Tren & Analisis',
      step7Desc: 'Pantau grafik pemasukan vs pengeluaran dan persentase kategori pengeluaran Anda.',
      step8Title: 'Pengingat & Notifikasi',
      step8Desc: 'Dapatkan pengingat otomatis untuk tagihan bulanan dan transaksi rutin.',
      step9Title: 'Keamanan PIN & Biometrik',
      step9Desc: 'Lindungi data finansial Anda dengan PIN 6-digit dan autentikasi Face ID/Fingerprint.',
      step10Title: 'Pengaturan Bahasa & Tema',
      step10Desc: 'Sesuaikan mode tampilan terang/gelap dan pilih bahasa favorit Anda (Indonesia / English).',
    },
  },
  en: {
    common: {
      appName: 'Catat Duekku',
      continue: 'Continue',
      understand: 'Understand',
      tryAgain: 'Try Again',
      save: 'Save',
      edit: 'Edit',
      syncNow: 'Sync Now',
      reset: 'Reset',
      cancel: 'Cancel',
    },
    dashboard: {
      fallbackUserName: 'Duekku Friend',
      greetingHello: 'Hello',
      greetingWelcome: 'Your financial summary',
      walletTitle: 'Wallet & Accounts',
      walletDescription: 'Manage your cash, bank, and e-wallet accounts.',
      analyticsTitle: 'Financial Analytics',
      analyticsDescription: 'Monthly spending charts and statistics.',
      profileTitle: 'Profile & Settings',
      profileDescription: 'Account settings, timezone, and security PIN/biometrics.',
      balanceLabel: 'Balance',
      quickExpenseTitle: 'Quick Expense Entry',
      quickManual: 'Manual',
      insightTag: 'AI Insight',
      insightToday: 'Today',
      insightDefault: 'Food expenses this week are 15% lower than last week.',
      spectrumPemasukan: 'Income',
      spectrumPengeluaran: 'Expense',
      spectrumTabungan: 'Savings',
      spectrumUtang: 'Debt Balance',
      spectrumBudget: 'Remaining Budget',
    },
    auth: {
      welcomeBack: 'Welcome Back,',
      createAccount: 'Create New Account',
      loginSubtitle: 'Glad to see you back. Enter your email and password.',
      registerSubtitle: 'Start your financial journey. It only takes a few seconds.',
      tabLogin: 'Log In',
      tabRegister: 'Register',
      fullNameLabel: 'Full Name',
      fullNamePlaceholder: 'Enter your full name',
      emailLabel: 'Email Address',
      emailPlaceholder: 'name@email.com',
      passwordLabel: 'Password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot Password?',
      socialDivider: 'Or continue with',
      socialGoogle: 'Google',
      socialApple: 'Apple',
      continueWithFacebook: 'Continue with Facebook',
      loginSuccessTitle: 'Login Successful!',
      loginSuccessMessage: 'Welcome back to Catat Duekku.',
      registerSuccessTitle: 'Account Created!',
      registerSuccessMessage: 'Welcome! Your account has been registered.',
      loginFailedTitle: 'Login Failed',
      loginFailedMessage: 'Please check your email and password.',
      registerFailedTitle: 'Registration Failed',
      registerFailedMessage: 'Failed to create a new account. Please try again.',
      genericErrorMessage: 'An error occurred on the system.',
      inputIncompleteTitle: 'Incomplete Input',
      inputIncompleteLogin: 'Email and password are required.',
      inputIncompleteRegister: 'Full name is required.',
      genericErrorTitle: 'An Error Occurred',
      biometricPrompt: 'Sign in to Catat Duekku',
      enterApp: 'Enter App',
    },
    profile: {
      title: 'Profile',
      sectionProfile: 'Profile',
      sectionSecurity: 'Security',
      sectionPreferences: 'System Preferences',
      sectionData: 'Storage & Data',
      editProfileLabel: 'Edit Profile',
      editProfileDescription: 'Update your registered full name',
      appTourLabel: 'Panduan Aplikasi',
      appTourDescription: 'Mulai ulang tur panduan fitur interaktif aplikasi',
      pinLockLabel: 'PIN Lock',
      pinLockDescription: 'Lock app access with 6-digit PIN',
      biometricLabel: 'Fingerprint / Face ID',
      biometricDescription: 'Use biometric authentication',
      biometricUnsupported: 'Device does not support biometrics',
      changePinLabel: 'Change PIN',
      changePinDescription: 'Change your current 6-digit PIN',
      timezoneLabel: 'Timezone',
      timezoneDescription: 'Matches your recording region',
      appearanceLabel: 'App Theme',
      appearanceDescription: 'Follows system device theme',
      appearanceDark: 'Dark',
      appearanceLight: 'Light',
      languageLabel: 'App Language',
      languageDescription: 'Select application display language (ID / EN)',
      languageIndonesian: 'Bahasa Indonesia 🇮🇩',
      languageEnglish: 'English 🇬🇧',
      resyncLabel: 'Re-sync Data',
      resyncDescription: 'Refresh cloud database connection',
      resetLabel: 'Reset All Data',
      resetDescription: 'Permanently delete all data and PIN',
      logoutLabel: 'Log Out',
      cloudSyncActive: 'Cloud Sync Active',
      defaultUserName: 'Catat Duekku User',
      defaultEmail: 'unconnected@email.com',
      syncSuccessTitle: 'Sync Successful',
      syncSuccessMessage: 'Your transactions and settings are synced with the cloud.',
      disablePinTitle: 'Disable PIN',
      disablePinMessage: 'Are you sure you want to disable PIN lock? This will also disable biometric auth.',
      disablePinConfirm: 'Disable',
      pinDisabledTitle: 'PIN Disabled',
      pinDisabledMessage: 'Your security PIN lock has been disabled.',
      pinRequiredTitle: 'PIN Required',
      pinRequiredMessage: 'You must enable PIN lock before enabling biometric authentication as a fallback.',
      setupPinNow: 'Set Up PIN Now',
      biometricPrompt: 'Confirm device biometrics',
      biometricEnabledTitle: 'Biometrics Enabled',
      biometricEnabledMessage: 'Face ID / Fingerprint authentication successfully enabled.',
      resetDataTitle: 'Delete All Data',
      resetDataMessage: 'This action will permanently delete all transaction data, debts, budgets, savings goals, and PIN from this device. This action cannot be undone.',
      resetDataConfirm: 'Permanently Reset',
      dataResetTitle: 'Data Deleted',
      dataResetMessage: 'All transaction data and security settings have been reset to default.',
      logoutTitle: 'Log Out of App',
      logoutMessage: 'Are you sure you want to log out of your account?',
      logoutConfirm: 'Log Out',
      editTitle: 'Edit Profile',
      editSubtitle: 'Update your cloud-connected profile info',
      fullNameLabel: 'Full Name',
      fullNamePlaceholder: 'Enter your full name',
      emailReadOnlyLabel: 'Email Address (Cannot be changed)',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      editInputIncompleteTitle: 'Incomplete Input',
      editInputIncompleteMessage: 'Full name is required.',
      editFailedTitle: 'Update Failed',
      editSuccessTitle: 'Profile Updated',
      editSuccessMessage: 'Your profile full name has been updated successfully.',
      genericError: 'System error occurred.',
    },
    onboarding: {
      skip: 'Skip',
      next: 'Next',
      enableNotificationsAndStart: 'Enable Notifications & Start',
      step1Title: 'Smart Financial Tracking',
      step1Subtitle: 'FINANCIAL CLARITY',
      step1Description: 'Track every income, expense, and category quickly, intuitively, and organized.',
      step2Title: 'Budgeting & Future Goals',
      step2Subtitle: 'SMART BUDGETING',
      step2Description: 'Set daily/monthly budget limits and track your real-time savings goals growth.',
      step3Title: 'Reminders & Secure Data',
      step3Subtitle: 'ALWAYS REMINDED & SECURE',
      step3Description: 'Get daily expense reminders and bill due dates so your finances stay healthy.',
    },
    tour: {
      stepOf: 'of',
      skip: 'Skip',
      previous: 'Previous',
      next: 'Next',
      finish: 'Finish Tour',
      step1Title: 'Total Balance Summary',
      step1Desc: 'View your total accumulated wealth across all active wallets in a single view.',
      step2Title: 'Manage Multi-Wallets',
      step2Desc: 'Access and manage cash, bank accounts, and e-wallets separately.',
      step3Title: 'Filter & Search',
      step3Desc: 'Quickly search transactions by date range, category, or wallet.',
      step4Title: 'Quick Add Transaction',
      step4Desc: 'Record expenses, income, or transfers between wallets in just a few taps.',
      step5Title: 'AI Receipt Scanner',
      step5Desc: 'Scan physical receipts; total amount and merchant are auto-detected instantly.',
      step6Title: 'Monthly Budget Targets',
      step6Desc: 'Set category budget limits to keep your spending strictly under control.',
      step7Title: 'Financial Analytics',
      step7Desc: 'Track income vs expense trends and category breakdowns visually.',
      step8Title: 'Reminders & Alerts',
      step8Desc: 'Receive automated reminders for monthly bills and scheduled transactions.',
      step9Title: 'Security & Biometrics',
      step9Desc: 'Secure your financial data with 6-digit PIN and Face ID/Fingerprint authentication.',
      step10Title: 'Language & Theme',
      step10Desc: 'Switch light/dark visual themes and select your preferred language (ID / EN).',
    },
  },
} as const;

export type StringKey =
  | 'common.appName'
  | 'common.continue'
  | 'common.understand'
  | 'common.tryAgain'
  | 'common.save'
  | 'common.edit'
  | 'common.syncNow'
  | 'common.reset'
  | 'common.cancel'
  | 'dashboard.fallbackUserName'
  | 'dashboard.greetingHello'
  | 'dashboard.greetingWelcome'
  | 'dashboard.walletTitle'
  | 'dashboard.walletDescription'
  | 'dashboard.analyticsTitle'
  | 'dashboard.analyticsDescription'
  | 'dashboard.profileTitle'
  | 'dashboard.profileDescription'
  | 'dashboard.balanceLabel'
  | 'dashboard.quickExpenseTitle'
  | 'dashboard.quickManual'
  | 'dashboard.insightTag'
  | 'dashboard.insightToday'
  | 'dashboard.insightDefault'
  | 'dashboard.spectrumPemasukan'
  | 'dashboard.spectrumPengeluaran'
  | 'dashboard.spectrumTabungan'
  | 'dashboard.spectrumUtang'
  | 'dashboard.spectrumBudget'
  | 'auth.welcomeBack'
  | 'auth.createAccount'
  | 'auth.loginSubtitle'
  | 'auth.registerSubtitle'
  | 'auth.tabLogin'
  | 'auth.tabRegister'
  | 'auth.fullNameLabel'
  | 'auth.fullNamePlaceholder'
  | 'auth.emailLabel'
  | 'auth.emailPlaceholder'
  | 'auth.passwordLabel'
  | 'auth.rememberMe'
  | 'auth.forgotPassword'
  | 'auth.socialDivider'
  | 'auth.socialGoogle'
  | 'auth.socialApple'
  | 'auth.continueWithFacebook'
  | 'auth.loginSuccessTitle'
  | 'auth.loginSuccessMessage'
  | 'auth.registerSuccessTitle'
  | 'auth.registerSuccessMessage'
  | 'auth.loginFailedTitle'
  | 'auth.loginFailedMessage'
  | 'auth.registerFailedTitle'
  | 'auth.registerFailedMessage'
  | 'auth.genericErrorMessage'
  | 'auth.inputIncompleteTitle'
  | 'auth.inputIncompleteLogin'
  | 'auth.inputIncompleteRegister'
  | 'auth.genericErrorTitle'
  | 'auth.biometricPrompt'
  | 'auth.enterApp'
  | 'profile.title'
  | 'profile.sectionProfile'
  | 'profile.sectionSecurity'
  | 'profile.sectionPreferences'
  | 'profile.sectionData'
  | 'profile.editProfileLabel'
  | 'profile.editProfileDescription'
  | 'profile.pinLockLabel'
  | 'profile.pinLockDescription'
  | 'profile.biometricLabel'
  | 'profile.biometricDescription'
  | 'profile.biometricUnsupported'
  | 'profile.changePinLabel'
  | 'profile.changePinDescription'
  | 'profile.timezoneLabel'
  | 'profile.timezoneDescription'
  | 'profile.appearanceLabel'
  | 'profile.appearanceDescription'
  | 'profile.appearanceDark'
  | 'profile.appearanceLight'
  | 'profile.languageLabel'
  | 'profile.languageDescription'
  | 'profile.languageIndonesian'
  | 'profile.languageEnglish'
  | 'profile.resyncLabel'
  | 'profile.resyncDescription'
  | 'profile.resetLabel'
  | 'profile.resetDescription'
  | 'profile.logoutLabel'
  | 'profile.cloudSyncActive'
  | 'profile.defaultUserName'
  | 'profile.defaultEmail'
  | 'profile.syncSuccessTitle'
  | 'profile.syncSuccessMessage'
  | 'profile.disablePinTitle'
  | 'profile.disablePinMessage'
  | 'profile.disablePinConfirm'
  | 'profile.pinDisabledTitle'
  | 'profile.pinDisabledMessage'
  | 'profile.pinRequiredTitle'
  | 'profile.pinRequiredMessage'
  | 'profile.setupPinNow'
  | 'profile.biometricPrompt'
  | 'profile.biometricEnabledTitle'
  | 'profile.biometricEnabledMessage'
  | 'profile.resetDataTitle'
  | 'profile.resetDataMessage'
  | 'profile.resetDataConfirm'
  | 'profile.dataResetTitle'
  | 'profile.dataResetMessage'
  | 'profile.logoutTitle'
  | 'profile.logoutMessage'
  | 'profile.logoutConfirm'
  | 'profile.editTitle'
  | 'profile.editSubtitle'
  | 'profile.fullNameLabel'
  | 'profile.fullNamePlaceholder'
  | 'profile.emailReadOnlyLabel'
  | 'profile.saveChanges'
  | 'profile.saving'
  | 'profile.editInputIncompleteTitle'
  | 'profile.editInputIncompleteMessage'
  | 'profile.editFailedTitle'
  | 'profile.editSuccessTitle'
  | 'profile.editSuccessMessage'
  | 'profile.genericError'
  | 'onboarding.skip'
  | 'onboarding.next'
  | 'onboarding.enableNotificationsAndStart'
  | 'onboarding.step1Title'
  | 'onboarding.step1Subtitle'
  | 'onboarding.step1Description'
  | 'onboarding.step2Title'
  | 'onboarding.step2Subtitle'
  | 'onboarding.step2Description'
  | 'onboarding.step3Title'
  | 'onboarding.step3Subtitle'
  | 'onboarding.step3Description';

export function t(key: StringKey, lang: 'id' | 'en' = 'id'): string {
  const dict = strings[lang] || strings.id;
  const [section, name] = key.split('.') as [keyof typeof dict, string];
  return (dict[section] as any)?.[name] ?? key;
}

export { strings };
