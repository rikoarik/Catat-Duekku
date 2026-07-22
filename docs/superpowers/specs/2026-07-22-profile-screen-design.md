# Design Spec: Profile & Settings Screen

## 1. Context & Objectives

The Profile screen in Catat Duekku acts as the central hub for account settings, local authentication preferences (PIN and biometrics), synchronization feedback, and data management. It replaces the current placeholder tab under the "profile" navigation route.

We aim to:
- Render a modern, clean, editorial-style layout using deep teal (`#0C3B3A`), soft lime (`#BCEB82`), pale mint (`#EDF4EB`), and off-white.
- Load the user's real session data (full name, email) dynamically from Supabase.
- Integrate switches for PIN Lock and Biometric Lock with the existing `@/core/lib/pin-storage` utility.
- Provide a clear timezone display and app theme details.
- Allow resetting local data via `financeStore.reset()` and logging out of the Supabase session safely.

---

## 2. Proposed Architecture & Component Flow

```mermaid
graph TD
    Main[Main MainPage: profile tab] -->|renders| Profile[ProfileScreen]
    Profile -->|reads auth| Supabase[Supabase Auth Session]
    Profile -->|reads/writes settings| PinStorage[@/core/lib/pin-storage]
    Profile -->|resets| FinStore[financeStore]
    Profile -->|logs out| Router[Expo Router Redirect to /auth]
```

### Components Used:
- `ScreenWrapper` (`@/components/common/screen-wrapper`) for safe area layout.
- `Card` (`@/components/ui/card`) for grouping settings options.
- `Button` (`@/components/ui/button`) for secondary and critical operations.
- `Text` (`@/components/ui/text`) for consistent typography.
- Standard Switches and Icons from `iconsax-react-native`.

---

## 3. UI Layout Specification

### 3.1. Profile Section
- **Visuals**:
  - Circular avatar (width/height: 72px) with `softLime` background.
  - Large bold initials of the user centered in the avatar.
  - Full Name (`user_metadata.full_name` or fallback) in `textPrimary` with semibold ClashDisplay font.
  - Email in `textSecondary` with regular body font.
  - A small pill badge showing status "Cloud Sync Aktif" (green dot indicator).

### 3.2. Security Settings Panel
- **Items**:
  - **Kunci PIN** (Switch): Toggles state. If toggled ON, redirects to `/setup-pin`. If toggled OFF, prompts with a confirmation dialog, then calls `clearPin()` and updates local state.
  - **Biometrik (Sidik Jari / Face ID)** (Switch): Toggles state using `setBiometricEnabled` and local-auth checks. Disabled if device has no biometrics configured.
  - **Ubah PIN** (Button / Row): Navigates user to `/setup-pin` to update the PIN. Only visible when PIN is active.

### 3.3. App Preferences Panel
- **Items**:
  - **Zona Waktu**: Dynamic text showing device's local timezone (e.g. `Asia/Jakarta`).
  - **Tampilan**: Indicates current theme mode (e.g., "Terang" or "Gelap" depending on device color scheme).

### 3.4. Data Management Panel
- **Items**:
  - **Sinkronisasi Data**: Visual feedback indicating that transactions are saved in real-time. Action button to "Sync Ulang" (loads user details).
  - **Reset Semua Data** (Destructive Row): Opens a native confirmation modal (`Alert.alert`). If confirmed, resets the database via `financeStore.reset()`, clears AsyncStorage, and alerts the user.

### 3.5. Logout Button
- Red-tinted pill button (`Button` with variant `outline` or customized red styling) that signs out of Supabase and navigates the user back to the `/auth` gate.
- Version label: `v1.0.0 (Expo 57)` centered at the bottom.

---

## 4. Edge Cases & Error Handling

- **Offline State**: If Supabase call fails, load cached data from AsyncStorage or display placeholders.
- **Biometric Availability Check**: Before rendering the biometrics switch, query `LocalAuthentication.hasHardwareAsync()` and `isEnrolledAsync()`. If not available, gray out the option with a descriptive text helper.
- **PIN Update Navigation**: Ensure we navigate to `/setup-pin` with appropriate route context if needed, or rely on standard Expo router setup.

---

## 5. Verification Plan

### Manual Testing Checklist:
1. Navigating to Profile tab displays correctly with initials.
2. Clicking PIN Switch OFF disables PIN, and Switch ON navigates to `/setup-pin`.
3. Toggling Biometrics updates local storage settings correctly.
4. Clicking "Reset Semua Data" shows confirmation and clears data when confirmed.
5. Clicking "Keluar" logs the user out and redirects to the login screen.
