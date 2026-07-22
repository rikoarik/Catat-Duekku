# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Catat Duekku Architecture & Coding Rules

## 🎨 Brand Design Tokens & Palette
- **Deep Teal (`#0F3D3E`)**: Primary brand color for text (light mode), cards, and background (dark mode).
- **Soft Lime (`#B7E36D`)**: Primary accent color for buttons, active indicators, and coin badge.
- **Pale Mint (`#E6F4F1`)**: Surface element background for light mode.
- **Off-White (`#FAFCFB`)**: Screen background for light mode.
- **Income (`#22C55E`)**: Green token for income transactions.
- **Expense (`#FF6B6B`)**: Coral red token for expense transactions.
- **Theme Utility**: ALWAYS use `getTheme(colorScheme)` from `@/core/theme/colors` for theme-aware color lookup.

---

## 🧩 Reusable UI Components & Guidelines
All UI elements MUST be built using these established reusable primitives in `src/components/`:

1. **`Card` (`@/components/ui/card`)**
   - Modern rounded cards with 24px border radius.
   - Variants: `default` (white/teal bg), `surface` (pale mint bg), `teal` (deep teal bg), `lime` (soft lime bg), `outline`.
   - Props: `variant`, `padding`, `borderRadius`.

2. **`Button` (`@/components/ui/button`)**
   - Interactive pill-shaped buttons (`borderRadius: 100`).
   - Variants: `primary` (deep teal), `lime` (soft lime), `secondary` (surface mint), `dark` (#071F20), `outline`.
   - Sizes: `small`, `medium`, `large`. Supports leading `icon`.

3. **`ScreenWrapper` (`@/components/common/screen-wrapper`)**
   - Container component to wrap every screen.
   - Handles `SafeAreaView` (notch/island) and `StatusBar` status automatically.
   - Variants: `background`, `surface`, `teal`.

4. **`KeyboardAwareScrollView` (`react-native-keyboard-aware-scroll-view`)**
   - **MANDATORY RULE FOR INPUTS**: Every screen containing form input fields (`Input`, `TextInput`) MUST be wrapped with `KeyboardAwareScrollView` (`enableOnAndroid={true}`) so that inputs and submit buttons are never covered by the soft keyboard.

---

## 🛠️ Utility Functions & Domain Types
1. **`formatCurrency(amount, currencyCode, showSymbol)` (`@/core/utils/formatters`)**
   - Automatically formats currency into IDR (`Rp 4.309.573`) or international format.

2. **`formatDate(date)` (`@/core/utils/formatters`)**
   - Formats dates into Indonesian long format (e.g., `21 Juli 2026`).

3. **Domain Types (`@/types/transaction`)**
   - Standard interfaces for `Transaction`, `Wallet`, `Category`, and `BalanceSummary`.

---

## 📁 Clean Architecture Directory Conventions
- `src/app/`: Expo Router screens & navigation layouts (`_layout.tsx`, `index.tsx`).
- `src/core/`: Application core (theme tokens, formatters, storage).
- `src/components/ui/`: Base reusable atomic UI components.
- `src/components/common/`: Common screen layouts & structural components.
- `src/features/`: Feature-based business logic (transactions, wallet, analytics).
- `src/types/`: Shared TypeScript domain types.

---

## 🔐 Security Flow Rules

### Post-Register Flow (Mandatory)
After a new user registers, the navigation MUST follow this exact order:
1. **`/setup-pin`** — User creates a 6-digit PIN (two-step: create → confirm).
2. **`/setup-biometric`** — Suggest fingerprint/Face ID. Auto-skipped if hardware unavailable.
3. **`/(main)`** — Dashboard / main app.

### Returning User Flow (Option A — Local Auth)
On app cold start:
- If **no session** → `/auth` (Login/Register)
- If **session + PIN set** → `/pin-lock` (biometric auto-prompt, then PIN fallback)
- If **session + no PIN** → `/setup-pin` (edge case recovery)

### Security Component Rules
- Every **PIN entry screen** MUST use `PinDots` (`@/components/ui/pin-dots`) and `PinPad` (`@/components/ui/pin-pad`) reusable components.
- PIN is stored locally in `AsyncStorage` via `@/core/lib/pin-storage` utilities. Never transmit the PIN to any server.
- Biometric preference is stored locally using `setBiometricEnabled` / `isBiometricEnabled`.
- Wrong PIN entry MUST trigger a shake animation. After **5 failures**, show `StatusModal` with type `'error'`.

