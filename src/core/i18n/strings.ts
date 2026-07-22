const strings = {
  common: {
    appName: 'Catat Duekku',
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
    insightDefault:
      'Pengeluaran makan minggu ini 15% lebih hemat dari minggu lalu.',
    spectrumPemasukan: 'Pemasukan',
    spectrumPengeluaran: 'Pengeluaran',
    spectrumTabungan: 'Tabungan',
    spectrumUtang: 'Sisa utang',
    spectrumBudget: 'Sisa budget',
  },
} as const;

export type StringKey =
  | 'common.appName'
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
  | 'dashboard.spectrumBudget';

export function t(key: StringKey): string {
  const [section, name] = key.split('.') as [keyof typeof strings, string];
  return strings[section][name as never];
}

// ponytail: single-locale static dictionary; add locale selection/provider only when multi-language is needed.
export { strings };
