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
import { AppFooter } from '../src/AppFooter';
import { NatureBackdrop } from '../src/NatureBackdrop';
import {
  getAdvertisements,
  getApiErrorMessage,
  login,
  register,
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
  const { height, width } = useWindowDimensions();
  const wide = width >= 860;
  const shortViewport = height < 620;
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
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
    if (!email.trim() || !password || (registering && !displayName.trim())) {
      setError(t('auth.required'));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      if (registering) {
        const result = await register(
          email.trim(),
          password,
          displayName.trim(),
        );
        if (result.session) {
          queryClient.clear();
          router.replace('/');
        } else {
          setNotice(t('auth.confirmEmail'));
        }
      } else {
        await login(email.trim(), password);
        queryClient.clear();
        router.replace('/');
      }
    } catch (caught) {
      setError(getApiErrorMessage(caught, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, shortViewport && styles.shortPage]}
      >
        <NatureBackdrop />
        <View
          style={[
            styles.shell,
            wide && styles.shellWide,
            wide && shortViewport && styles.shellWideShort,
          ]}
        >
          <View
            style={[
              styles.brand,
              wide && styles.brandWide,
              wide && shortViewport && styles.brandWideShort,
            ]}
          >
            <View style={styles.circleLarge} />
            <View style={styles.circleSmall} />
            <View style={styles.logo}>
              <MaterialCommunityIcons
                name="home-city-outline"
                size={34}
                color="#087C5D"
              />
            </View>
            <Text
              variant={shortViewport ? 'titleLarge' : 'headlineMedium'}
              style={styles.brandName}
            >
              ManaTown
            </Text>
            <Text variant="titleMedium" style={styles.tagline}>
              {t('auth.brandTagline')}
            </Text>
            {!shortViewport && (
              <Text style={styles.intro}>{t('auth.brandIntro')}</Text>
            )}
            {!shortViewport && (
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
            )}
          </View>

          <View
            style={[
              styles.formPanel,
              wide && styles.formPanelWide,
              wide && shortViewport && styles.formPanelWideShort,
            ]}
          >
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
              {registering ? t('auth.createAccount') : t('auth.welcome')}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t(registering ? 'auth.registerSubtitle' : 'auth.subtitle')}
            </Text>
            {registering && (
              <TextInput
                mode="outlined"
                label={t('auth.displayName')}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                left={<TextInput.Icon icon="account-outline" />}
                outlineStyle={styles.outline}
              />
            )}
            <TextInput
              mode="outlined"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              left={<TextInput.Icon icon="email-outline" />}
              outlineStyle={styles.outline}
            />
            <TextInput
              mode="outlined"
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={registering ? 'new-password' : 'current-password'}
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
              {t(registering ? 'auth.createAccount' : 'auth.signIn')}
            </Button>
            {notice && (
              <HelperText type="info" visible>
                {notice}
              </HelperText>
            )}
            <Button
              mode="text"
              disabled={busy}
              onPress={() => {
                setRegistering((value) => !value);
                setError(undefined);
                setNotice(undefined);
              }}
            >
              {t(registering ? 'auth.haveAccount' : 'auth.needAccount')}
            </Button>
            <View style={styles.secure}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={16}
                color="#5C6F68"
              />
              <Text style={styles.secureText}>{t('auth.secureNote')}</Text>
            </View>

            {!shortViewport && ads.data && ads.data.length > 0 && (
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
        <AppFooter compact={shortViewport} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  page: {
    position: 'relative',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  shortPage: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  shell: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(193, 218, 198, 0.9)',
    shadowColor: '#315E42',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  shellWide: { maxWidth: 940, flexDirection: 'row' },
  shellWideShort: { minHeight: 0, maxWidth: 900 },
  brand: {
    overflow: 'hidden',
    gap: 10,
    padding: 28,
    backgroundColor: '#087C5D',
  },
  brandWide: { flex: 1, justifyContent: 'center', padding: 40 },
  brandWideShort: { padding: 20, gap: 6 },
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
  formPanelWideShort: { padding: 16, gap: 7 },
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
