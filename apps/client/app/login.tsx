import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  getAdvertisements,
  getApiErrorMessage,
  login,
  trackAdvertisement,
} from '../src/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const features: { icon: IconName; key: string }[] = [
  { icon: 'storefront-outline', key: 'auth.featureBusinesses' },
  { icon: 'face-woman-shimmer-outline', key: 'auth.featureWomen' },
  { icon: 'bullhorn-outline', key: 'auth.featureIssues' },
];

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <View style={[styles.shell, wide && styles.shellWide]}>
          <View style={[styles.brand, wide && styles.brandWide]}>
            <View style={styles.circleLarge} />
            <View style={styles.circleSmall} />
            <View style={styles.logo}>
              <MaterialCommunityIcons
                name="home-city-outline"
                size={34}
                color="#087C5D"
              />
            </View>
            <Text variant="headlineMedium" style={styles.brandName}>
              ManaTown
            </Text>
            <Text variant="titleMedium" style={styles.tagline}>
              {t('auth.brandTagline')}
            </Text>
            <Text style={styles.intro}>{t('auth.brandIntro')}</Text>
            <View style={styles.featureList}>
              {features.map((feature) => (
                <View key={feature.key} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <MaterialCommunityIcons
                      name={feature.icon}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.featureText}>{t(feature.key)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.formPanel, wide && styles.formPanelWide]}>
            <SegmentedButtons
              density="small"
              value={i18n.resolvedLanguage === 'te' ? 'te' : 'en'}
              onValueChange={(value) => void i18n.changeLanguage(value)}
              buttons={[
                { value: 'en', label: 'English' },
                { value: 'te', label: 'తెలుగు' },
              ]}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {t('auth.welcome')}
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
              left={<TextInput.Icon icon="account-outline" />}
              outlineStyle={styles.outline}
            />
            <TextInput
              mode="outlined"
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={() => void submit()}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  accessibilityLabel={
                    showPassword
                      ? t('auth.hidePassword')
                      : t('auth.showPassword')
                  }
                  onPress={() => setShowPassword((value) => !value)}
                />
              }
              outlineStyle={styles.outline}
            />
            {error && (
              <HelperText type="error" visible accessibilityRole="alert">
                {error}
              </HelperText>
            )}
            <Button
              mode="contained"
              icon="login"
              onPress={() => void submit()}
              loading={busy}
              disabled={busy}
              contentStyle={styles.buttonContent}
            >
              {t('auth.signIn')}
            </Button>
            <View style={styles.secure}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={16}
                color="#5C6F68"
              />
              <Text style={styles.secureText}>{t('auth.secureNote')}</Text>
            </View>

            {ads.data && ads.data.length > 0 && (
              <View style={styles.ads}>
                <Text variant="titleSmall" style={styles.adsTitle}>
                  {t('auth.sponsoredTitle')}
                </Text>
                {ads.data.map((ad) => (
                  <View key={ad.id} style={styles.ad}>
                    <MaterialCommunityIcons
                      name="bullhorn"
                      size={20}
                      color="#B87908"
                    />
                    <View style={styles.adText}>
                      <Text variant="titleSmall">{ad.name}</Text>
                      {ad.business && <Text>{ad.business.name}</Text>}
                    </View>
                    <Chip compact>{t('adminAds.sponsored')}</Chip>
                  </View>
                ))}
                <Text style={styles.subtitle}>{t('auth.sponsoredNote')}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#E8F4EE' },
  page: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  shell: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3E8DD',
  },
  shellWide: { maxWidth: 940, flexDirection: 'row', minHeight: 560 },
  brand: {
    overflow: 'hidden',
    gap: 10,
    padding: 28,
    backgroundColor: '#087C5D',
  },
  brandWide: { flex: 1, justifyContent: 'center', padding: 40 },
  circleLarge: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  circleSmall: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  logo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  brandName: { color: '#FFFFFF', fontWeight: '800', marginTop: 8 },
  tagline: { color: '#D8F6E8' },
  intro: { color: '#E7F8EF', lineHeight: 22 },
  featureList: { gap: 12, marginTop: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  featureText: { color: '#FFFFFF', fontWeight: '600' },
  formPanel: { gap: 14, padding: 24 },
  formPanelWide: { flex: 1, justifyContent: 'center', padding: 40 },
  title: { color: '#134B3D', fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#5C6F68' },
  outline: { borderRadius: 14 },
  buttonContent: { height: 48 },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: { color: '#5C6F68', fontSize: 12 },
  ads: { gap: 8, marginTop: 8 },
  adsTitle: { color: '#134B3D', fontWeight: '700' },
  ad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#FFF1C9',
    padding: 12,
  },
  adText: { flex: 1 },
});
