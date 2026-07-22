# DESIGN.md — Catat Duekku

## 1. Design objective

Catat Duekku adalah aplikasi pencatatan keuangan personal, bukan bank digital.

Pengalaman yang dituju:

- pencatatan cepat;
- kondisi keuangan mudah dipahami;
- visual tenang;
- hierarchy angka jelas;
- interaksi sederhana;
- implementable di Expo/React Native;
- konsisten pada Android, iOS, dan web.

Arah visual berasal dari referensi fintech editorial dengan latar mint, deep teal, lime accent, rounded cards, dan tipografi besar. Referensi tidak boleh disalin secara literal.

## 2. Brand personality

- Calm
- Clear
- Personal
- Modern
- Reliable
- Non-judgmental

### Product voice

Gunakan Bahasa Indonesia singkat dan natural.

Baik:

- “Pengeluaran berhasil dicatat.”
- “Belum ada transaksi bulan ini.”
- “Hubungkan Telegram untuk mencatat lebih cepat.”
- “Pembayaran melebihi sisa utang.”

Hindari:

- jargon akuntansi;
- bahasa menghakimi;
- paragraf panjang;
- kata-kata promosi berlebihan di dalam aplikasi.

### Tagline

**Catat cepat. Uang lebih jelas.**

## 3. Design principles

### 3.1 Balance first

Saldo dan perubahan bulan berjalan menjadi hierarchy utama.

### 3.2 One clear action

Setiap layar memiliki satu primary action yang jelas.

### 3.3 Calm density

Data cukup padat untuk berguna, tetapi tidak terasa seperti dashboard enterprise.

### 3.4 Semantic color

Warna mempunyai fungsi:

- lime: accent;
- green: income/success;
- red: expense/destructive;
- amber: warning;
- deep teal: primary action dan hero surface.

### 3.5 Implementable shapes

Gunakan rounded rectangle, circle, pill, dan overlay notch sederhana. Jangan membuat bentuk yang membutuhkan custom shader atau path rumit.

## 4. Design tokens

### 4.1 Colors

```ts
export const colors = {
  background: "#F1F8EF",
  backgroundSecondary: "#E6F0E4",
  surface: "#FDFEFD",
  surfaceMuted: "#EDF4EB",

  primary: "#0C3B3A",
  primaryStrong: "#07302F",
  primaryPressed: "#062725",
  onPrimary: "#FFFFFF",

  text: "#0C292A",
  textSecondary: "#425F5C",
  textMuted: "#748985",
  border: "#D4E3D7",

  accent: "#BCEB82",
  accentSoft: "#DEF5B8",
  accentText: "#24451F",

  income: "#23835B",
  incomeSurface: "#E6F6EE",

  expense: "#D65B5B",
  expenseSurface: "#FDECEC",

  warning: "#B87912",
  warningSurface: "#FFF3D5",

  overlay: "rgba(7, 32, 31, 0.46)",
  transparent: "transparent"
}
```

Do not hardcode colors inside feature components.

### 4.2 Typography

Font family: **Manrope**.

```ts
export const typography = {
  display: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1.2
  },
  h1: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "700",
    letterSpacing: -0.8
  },
  h2: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.4
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "650"
  },
  amount: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "700",
    letterSpacing: -0.6
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500"
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500"
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "650"
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500"
  }
}
```

Use tabular numbers for money where supported.

### 4.3 Spacing

```ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
}
```

Default mobile horizontal padding: `20`.

### 4.4 Radius

```ts
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  hero: 28,
  pill: 999
}
```

### 4.5 Border and shadow

```ts
export const border = {
  width: 1,
  color: colors.border
}

export const shadow = {
  shadowColor: "#0C292A",
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3
}
```

Prioritize borders over heavy shadows.

### 4.6 Motion

```ts
export const motion = {
  fast: 120,
  normal: 220,
  slow: 320
}
```

- button press: fast;
- bottom sheet: normal;
- list insertion: normal;
- avoid looping decoration;
- support reduced motion.

## 5. Icons

Use **Iconsax** only.

Rules:

- default style: Linear;
- active navigation: Bold;
- common size: 20 or 24;
- icon-only action requires accessibility label;
- category icon sits in a 36–40 px circular surface;
- do not mix with Lucide, Material Icons, or custom SVG icon sets.

## 6. Layout system

### Mobile

- primary frame: 390 × 844;
- minimum width: 360;
- content padding: 20;
- vertical screen gap: 20–24;
- card gap: 12–16;
- bottom safe area respected;
- one column.

### Tablet

- two-column dashboard where useful;
- max form width: 560;
- content padding: 28.

### Web

- breakpoint sidebar: 900;
- sidebar: 240;
- main max width: 1120;
- page padding: 32;
- grid gap: 20;
- side panel width: 440–480.

## 7. Navigation

### Mobile bottom navigation

Items:

1. Beranda
2. Transaksi
3. Utang
4. Pengaturan

Visual:

- floating pill;
- deep teal surface;
- active icon inside white circle or lime indicator;
- labels optional beneath icon only if readability remains;
- quick add uses a separate floating action or dashboard action.

Do not overload navigation with analytics, report, portfolio, converter, or cards.

### Web sidebar

- wordmark;
- menu items;
- integration status near bottom;
- user profile;
- logout.

## 8. Screens

### 8.1 Login

Layout:

- subtle organic mint background;
- Catat Duekku wordmark;
- heading;
- supporting text;
- white form card;
- fields;
- primary button;
- secondary signup link.

No illustration required.

### 8.2 Signup

Same system as login. Avoid creating a visually unrelated page.

### 8.3 Onboarding

Maximum three screens:

1. Profil.
2. Akun awal.
3. Telegram optional.

Use progress dots and clear Skip.

### 8.4 Dashboard

Structure:

```text
Header
BalanceHero
QuickActions
MonthlyMetrics
RecentTransactions
CategorySpending
DebtSummary
BottomNavigation
```

#### Header

- “Halo, Riko”
- “Ringkasan keuanganmu”
- avatar
- circular menu/settings button

#### BalanceHero

- deep teal;
- lime accent strip;
- large balance;
- show/hide;
- current month;
- optional simple change indicator;
- no credit card metaphor;
- no payment network branding;
- no card number.

#### QuickActions

- Tambah pengeluaran
- Tambah pemasukan
- Bayar utang

#### MonthlyMetrics

Use compact cards:

- Pemasukan
- Pengeluaran
- Sisa utang

#### CategorySpending

Use horizontal bars or simple donut only if readable. Avoid trading-style line charts.

### 8.5 Add transaction

Mobile: bottom sheet.  
Web: side panel.

Order:

1. type segmented control;
2. money input;
3. category;
4. account;
5. description;
6. date;
7. primary button.

Money input must receive focus first.

### 8.6 Transactions

- search;
- filters;
- month;
- date grouping;
- rows;
- empty state;
- floating add.

### 8.7 Transaction detail

- amount;
- metadata;
- edit;
- delete;
- source;
- confirmation before destructive action.

### 8.8 Debts

- remaining total;
- active/paid filter;
- progress cards;
- due date;
- pay action.

### 8.9 Debt payment

- amount;
- account;
- date;
- remaining preview;
- primary payment action.

### 8.10 Settings

Sections:

- Profil
- Akun
- Kategori
- Telegram
- Import dan export
- Tampilan
- Keluar

### 8.11 Telegram

Disconnected and connected states are required.

### 8.12 Import/export

Include upload, preview, validation summary, import result, CSV export, and XLSX export.

## 9. Components

### Foundation

- `Screen`
- `AppText`
- `Stack`
- `Row`
- `Divider`

### Input

- `TextField`
- `MoneyField`
- `SelectField`
- `DateField`
- `SearchField`
- `SegmentedControl`
- `FilterChip`

### Actions

- `Button`
- `IconButton`
- `QuickAction`
- `FloatingAddButton`

### Feedback

- `Skeleton`
- `LoadingView`
- `EmptyState`
- `ErrorState`
- `Toast`
- `ConfirmDialog`
- `BottomSheet`

### Finance

- `BalanceHero`
- `MetricCard`
- `TransactionRow`
- `DebtCard`
- `CategoryBar`
- `SectionHeader`

Do not create a component abstraction before it is used in at least two places, except basic primitives.

## 10. Component specifications

### Button

Variants:

- primary;
- secondary;
- ghost;
- destructive.

Sizes:

- md: 48;
- sm: 40.

Primary:

- deep teal background;
- white text;
- pill or radius 16;
- pressed state uses primaryPressed.

### Card

- surface;
- radius 20–28;
- border;
- padding 16 or 20;
- optional shadow;
- optional simple decorative notch.

### TextField

- label;
- field;
- helper/error;
- minimum height 48;
- focus ring deep teal;
- error border expense.

### FilterChip

- unselected: white/surface with border;
- selected: deep teal with white text;
- height around 36.

### TransactionRow

```text
[category icon]  Description                   Amount
                 Category • Account            Time
```

- row minimum height: 64;
- amount aligned right;
- expense uses expense;
- income uses income;
- row remains understandable without color.

### DebtCard

- name;
- remaining;
- progress;
- due date;
- status;
- pay button.

## 11. States

Every data screen requires:

- skeleton loading;
- empty state;
- recoverable error;
- refreshing;
- disabled submit;
- success feedback.

Required empty copy:

Transactions:

> Belum ada transaksi. Catat pemasukan atau pengeluaran pertamamu.

Debts:

> Tidak ada utang aktif.

Search:

> Tidak ada transaksi yang cocok dengan filter ini.

Telegram:

> Telegram belum terhubung.

## 12. Accessibility

- touch target minimum 44 × 44;
- screen-reader labels;
- visible focus on web;
- logical keyboard order;
- support text scaling;
- no color-only meaning;
- adequate contrast;
- reduced motion;
- keyboard avoidance for form sheets.

## 13. Formatting

### Currency

```text
Rp4.309.573
-Rp25.000
+Rp7.500.000
```

No decimal values for IDR.

### Date

```text
21 Jul 2026
Hari ini, 12.30
Kemarin
```

### Status

Use concise Indonesian labels:

- Tercatat
- Belum dibayar
- Cicilan
- Lunas
- Terhubung
- Gagal diimpor

## 14. Restrictions

Do not include:

- credit/debit card UI;
- Visa, PayPal, or bank network marks;
- money sending;
- deposit;
- exchange rates;
- currency flags;
- investments;
- trading;
- English primary copy;
- heavy blur;
- excessive gradients;
- complex 3D charts;
- copied brand assets;
- more than one icon library.

## 15. Design acceptance checklist

A design is accepted when:

- it feels inspired by the reference mood but original;
- it is clearly an expense tracker;
- balance is the primary hierarchy;
- no bank-card metaphor exists;
- Manrope and Iconsax are consistent;
- token usage is consistent;
- 390 px mobile screens do not overflow;
- desktop is responsive, not stretched mobile;
- add transaction is reachable quickly;
- loading, empty, error, validation, and disabled states exist;
- shapes can be implemented in Expo;
- UI copy is Indonesian;
- accessibility requirements are represented.


## AI experience

AI is integrated into existing finance flows, not presented as a separate chat-first product.

### Natural-language input

- dashboard action: `Catat dengan AI`;
- placeholder: `Contoh: makan siang 25 ribu pakai bank`;
- parsing loading state;
- transaction preview before save;
- `Ubah` and `Konfirmasi` actions.

### Receipt scanner

- camera and gallery entry;
- upload progress;
- image thumbnail;
- extraction state;
- extracted transaction preview;
- retry and manual fallback.

### AI insight card

- title: `Insight bulan ini`;
- maximum three concise observations;
- one suggested next action;
- button: `Tanya AI`.

### Required AI states

- parsing;
- low confidence;
- invalid extraction;
- service unavailable;
- preview;
- correction;
- confirmation;
- manual fallback.

Never auto-save an AI-generated transaction.
