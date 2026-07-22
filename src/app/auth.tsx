import { AuthScreen } from '@/features/auth/screens/auth-screen';
import { hasPin } from '@/core/lib/pin-storage';
import { router } from 'expo-router';

export default function AuthPage() {
  return (
    <AuthScreen
      onAuthSuccess={async () => {
        router.replace(await hasPin() ? '/pin-lock' : '/setup-pin');
      }}
      onRegisterSuccess={() => {
        router.replace('/setup-pin');
      }}
    />
  );
}
