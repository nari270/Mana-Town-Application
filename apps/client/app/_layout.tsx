import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { hasRole, useSession } from '../src/session';
import { ProfileMenu } from '../src/ProfileMenu';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  MD3LightTheme,
  PaperProvider,
} from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { initializeLocalization, localization } from '@mana-town/localization';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0B6B4F',
    secondary: '#4CAF50',
    background: '#F8F9FA',
  },
};

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [ready, setReady] = useState(false);
  const session = useSession();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const area = segments[0] as string | undefined;

  useEffect(() => {
    if (!navigationState?.key) return;
    if (!session && area !== 'login') router.replace('/login');
    else if (area === 'admin' && !hasRole(session, 'ADMIN'))
      router.replace('/');
  }, [area, session, navigationState?.key, router]);

  useEffect(() => {
    let active = true;
    void initializeLocalization().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <I18nextProvider i18n={localization}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          {ready ? (
            <>
              <Stack screenOptions={{ headerShown: false }} />
              <ProfileMenu />
            </>
          ) : (
            <ActivityIndicator
              accessibilityLabel="Loading application"
              style={{ flex: 1 }}
              color={theme.colors.primary}
            />
          )}
        </PaperProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
