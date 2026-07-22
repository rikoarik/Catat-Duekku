import { AuthScreen } from '@/features/auth/screens/auth-screen';
import { router } from 'expo-router';

export default function AuthPage() {
  return (
    <AuthScreen
      onAuthSuccess={() => {
        // Normal login → verify PIN or biometric at pin-lock
        router.replace('/pin-lock');
      }}
      onRegisterSuccess={() => {
        // New user → setup PIN flow
        router.replace('/setup-pin');
      }}
      onBiometricSuccess={() => {
        // Biometric login → skip PIN entirely, go to main app
        router.replace('/(main)');
      }}
    />
  );
}
