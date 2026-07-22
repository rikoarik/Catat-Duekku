# Interactive App Feature Tour Design Specification

**Date:** 2026-07-22  
**Feature:** Interactive App Feature Tour (Spotlight Walkthrough)  
**Target App:** Catat Duekku (Expo React Native)  

---

## 1. Executive Summary
An interactive 10-step feature tour designed to onboard users seamlessly by highlighting key features directly on the live UI using a spotlight overlay and popover tooltips. Automatically triggers when a new user enters the Dashboard for the first time, with an option to replay anytime from the Profile settings menu. Includes a prominent "Lewati / Skip" button on every step.

---

## 2. Tour Steps & Content Specification

| Step # | Feature Name | Highlight Target / Element ID | Title (ID) | Description (ID) | Title (EN) | Description (EN) |
|---|---|---|---|---|---|---|
| **1** | Total Saldo | `tour-total-balance` | Ringkasan Saldo Utama | Lihat total akumulasi uang dari seluruh dompet aktif Anda dalam satu angka. | Total Balance Summary | View your total accumulated wealth across all active wallets in a single view. |
| **2** | Multi-Dompet | `tour-wallets-list` | Kelola Multi-Dompet | Akses dan kelola dompet tunai, rekening bank, serta e-wallet secara terpisah. | Manage Multi-Wallets | Access and manage cash, bank accounts, and e-wallets separately. |
| **3** | Filter Transaksi | `tour-transaction-filter` | Filter & Cari Transaksi | Cari transaksi dengan cepat berdasarkan rentang tanggal, kategori, atau dompet. | Filter & Search | Quickly search transactions by date range, category, or wallet. |
| **4** | Tambah Transaksi | `tour-add-transaction-btn` | Tambah Transaksi Cepat | Catat pengeluaran, pemasukan, atau transfer antar dompet hanya dalam beberapa ketukan. | Quick Add Transaction | Record expenses, income, or transfers between wallets in just a few taps. |
| **5** | Scan Struk OCR | `tour-scan-receipt-btn` | Scan Struk AI / OCR | Pindai foto nota belanjaan fisik Anda, nominal & toko otomatis terdeteksi tanpa ketik manual. | AI Receipt Scanner | Scan physical receipts; total amount and merchant are auto-detected instantly. |
| **6** | Target Anggaran | `tour-budget-limits` | Target Anggaran Bulanan | Tetapkan batas anggaran per kategori untuk menjaga pengeluaran tetap terkontrol. | Monthly Budget Targets | Set category budget limits to keep your spending strictly under control. |
| **7** | Analisis Keuangan | `tour-analytics-chart` | Grafik Tren & Analisis | Pantau grafik pemasukan vs pengeluaran dan persentase kategori pengeluaran Anda. | Financial Analytics | Track income vs expense trends and category breakdowns visually. |
| **8** | Pusat Notifikasi | `tour-notifications-btn` | Pengingat & Notifikasi | Dapatkan pengingat otomatis untuk tagihan bulanan dan transaksi rutin. | Reminders & Alerts | Receive automated reminders for monthly bills and scheduled transactions. |
| **9** | Keamanan PIN | `tour-security-settings` | Keamanan PIN & Biometrik | Lindungi data finansial Anda dengan PIN 6-digit dan autentikasi Face ID/Fingerprint. | Security & Biometrics | Secure your financial data with 6-digit PIN and Face ID/Fingerprint authentication. |
| **10** | Bahasa & Tema | `tour-theme-language` | Pengaturan Bahasa & Tema | Sesuaikan mode tampilan terang/gelap dan pilih bahasa favorit Anda (Indonesia / English). | Language & Theme | Switch light/dark visual themes and select your preferred language (ID / EN). |

---

## 3. Component Architecture & State Management

### 3.1 Data Flow & Storage (`@/core/lib/tour-storage.ts`)
- **AsyncStorage Key:** `@catat_duekku_app_tour_completed` (boolean)
- **Functions:**
  - `isAppTourCompleted(): Promise<boolean>`
  - `setAppTourCompleted(completed: boolean): Promise<void>`
  - `resetAppTour(): Promise<void>`

### 3.2 Global Context Hook (`@/features/tour/context/tour-context.tsx`)
- State variables:
  - `isTourActive: boolean`
  - `currentStepIndex: number` (0 to 9)
  - `targetCoordinates: { x: number, y: number, width: number, height: number } | null`
- Action methods:
  - `startTour()`
  - `nextStep()`
  - `previousStep()`
  - `skipTour()` (marks tour completed & closes overlay)
  - `completeTour()` (marks tour completed & closes overlay)

### 3.3 UI Components (`@/features/tour/components/`)
1. `AppTourOverlay.tsx`: Fullscreen Portal modal rendered over the screen.
   - Semi-transparent backdrop (`rgba(7, 36, 35, 0.78)`).
   - Spotlight hole cutout centered at active element coordinates with soft lime (`#B7E36D`) pulsing border.
2. `TourTooltipCard.tsx`: Floating card component containing:
   - Header row with step badge (e.g. `1 dari 10` / `1 of 10`) and "X / Lewati" button.
   - Step Title & Description text formatted with `getTheme(colorScheme)`.
   - Footer action buttons: `Sebelumnya` (Previous), `Lewati` (Skip), `Lanjut` (Next / Finish).

---

## 4. Integration & Replay Ability

1. **Dashboard Entry Point (`src/app/(main)/index.tsx`)**:
   - On screen mount (`useEffect`), check `isAppTourCompleted()`.
   - If `false`, invoke `startTour()`.
2. **Profile Screen Replay Option (`src/features/profile/screens/profile-screen.tsx`)**:
   - Add new action item under Bantuan / Panduan:
     - **Title:** "Panduan Aplikasi (App Tour)"
     - **Icon:** `Book` / `InfoCircle` (Iconsax)
     - **Action:** Triggers `startTour()`.

---

## 5. Verification Plan

### Automated Checks
- Run `npm run type-check` or `npx tsc` to verify TypeScript contracts.
- Validate i18n keys for all 10 tour steps in `src/core/i18n/strings.ts`.

### Manual Verification
- Test cold start for a newly registered user: verifies Tour starts automatically at Step 1 on Dashboard.
- Test "Lewati" (Skip) button at Step 3: verifies Tour closes immediately and sets completed state in `AsyncStorage`.
- Test Replay from Profile screen: verifies Tour opens starting from Step 1.
- Test Dark mode vs Light mode rendering: verifies Tooltip card and Spotlight cutout adapt to `getTheme(colorScheme)`.
