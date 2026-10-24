import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  getAdvertisements,
  getApiErrorMessage,
  login,
  trackAdvertisement,
} from '../src/api';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ads = useQuery({
    queryKey: ['advertisements', 'login'],
    queryFn: () => getAdvertisements(),
  });

  useEffect(() => {
    for (const ad of ads.data ?? []) {
      void trackAdvertisement(ad.id, 'IMPRESSION').catch(() => undefined);
    }
  }, [ads.data]);

  async function submit() {
    if (!username.trim() || !password) {
      setError(t('auth.required'));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await login(username.trim(), password);
      queryClient.clear();
      router.replace('/');
    } catch (caught) {
      setError(getApiErrorMessage(caught, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.card}>
          <Text variant="headlineSmall" style={styles.title}>
            {t('auth.title')}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('auth.subtitle')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('auth.username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            textContentType="username"
          />
          <TextInput
            mode="outlined"
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void submit()}
          />
          {error && (
            <HelperText type="error" visible accessibilityRole="alert">
              {error}
            </HelperText>
          )}
          <Button
            mode="contained"
            onPress={() => void submit()}
            loading={busy}
            disabled={busy}
          >
            {t('auth.signIn')}
          </Button>
        </View>
        {ads.data && ads.data.length > 0 && (
          <View style={styles.ads}>
            <Text variant="titleMedium" style={styles.title}>
              {t('auth.sponsoredTitle')}
            </Text>
            {ads.data.map((ad) => (
              <View key={ad.id} style={styles.ad}>
                <Chip compact icon="bullhorn">
                  {t('adminAds.sponsored')}
                </Chip>
                <Text variant="titleSmall">{ad.name}</Text>
                {ad.business && <Text>{ad.business.name}</Text>}
              </View>
            ))}
            <Text style={styles.subtitle}>{t('auth.sponsoredNote')}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8F9FA' },
  page: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDEAE3',
    backgroundColor: '#FFFFFF',
    padding: 22,
  },
  title: { color: '#0B6B4F', fontWeight: '700' },
  subtitle: { color: '#5C6F68' },
  ads: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    gap: 10,
    marginTop: 16,
  },
  ad: {
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDEAE3',
    backgroundColor: '#E6F3EC',
    padding: 14,
  },
});
