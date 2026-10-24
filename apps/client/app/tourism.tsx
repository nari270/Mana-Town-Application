import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Text } from 'react-native-paper';
import { AppFooter } from '../src/AppFooter';
import { NatureBackdrop } from '../src/NatureBackdrop';
import { touristPlaces } from '../src/touristPlaces';
import { useLocationContext } from '../src/LocationContext';

export default function TourismScreen() {
  const { t } = useTranslation();
  const { locality } = useLocationContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [linkError, setLinkError] = useState(false);

  const openExternalLink = (url: string) => {
    setLinkError(false);
    void Linking.openURL(url).catch(() => setLinkError(true));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <NatureBackdrop />
      <View style={[styles.content, isWide && styles.wideContent]}>
        <Link href="/" asChild>
          <Button mode="text" icon="arrow-left" style={styles.backButton}>
            {t('nav.home')}
          </Button>
        </Link>
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <MaterialCommunityIcons
              name="map-marker-radius-outline"
              size={27}
              color="#087C5D"
            />
          </View>
          <View style={styles.headingCopy}>
            <Text variant="labelSmall" style={styles.eyebrow}>
              {t('home.tourism.eyebrow')}
            </Text>
            <Text variant="headlineMedium" style={styles.title}>
              {t('home.tourism.title', { town: locality || t('town') })}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('home.tourism.subtitle')}
            </Text>
          </View>
        </View>
        <View style={styles.places}>
          {touristPlaces.map((place) => (
            <View
              key={place.key}
              style={[styles.placeCard, isWide && styles.widePlaceCard]}
            >
              <Image
                source={place.image}
                style={styles.placeImage}
                resizeMode="cover"
                accessibilityLabel={t(`home.tourism.places.${place.key}.title`)}
              />
              <View style={styles.placeBody}>
                <Text variant="titleMedium" style={styles.placeTitle}>
                  {t(`home.tourism.places.${place.key}.title`)}
                </Text>
                <Text variant="bodySmall" style={styles.placeDescription}>
                  {t(`home.tourism.places.${place.key}.description`)}
                </Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={t('home.tourism.openMap')}
                  onPress={() =>
                    openExternalLink(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapsQuery)}`,
                    )
                  }
                  style={({ pressed }) => [
                    styles.mapButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="google-maps"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text variant="labelMedium" style={styles.mapButtonText}>
                    {t('home.tourism.openMap')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={t('home.tourism.photoCredit', {
                    artist: place.imageCredit,
                  })}
                  onPress={() => openExternalLink(place.imageSource)}
                  style={styles.creditPressable}
                >
                  <Text variant="labelSmall" style={styles.photoCredit}>
                    {t('home.tourism.photoCredit', {
                      artist: place.imageCredit,
                    })}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        {linkError && (
          <Text accessibilityRole="alert" style={styles.linkError}>
            {t('home.tourism.linkError')}
          </Text>
        )}
        <AppFooter />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    minHeight: '100%',
    backgroundColor: '#F5F8F3',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    gap: 22,
  },
  wideContent: {
    maxWidth: 1080,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headingIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#E2F1E8',
  },
  headingCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: '#56877A',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#193F34',
    fontWeight: '800',
  },
  subtitle: {
    color: '#70847B',
    lineHeight: 21,
  },
  places: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  placeCard: {
    overflow: 'hidden',
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4EAE5',
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  widePlaceCard: {
    width: '31.5%',
  },
  placeImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#E6EFE8',
  },
  placeBody: {
    gap: 10,
    padding: 16,
  },
  placeTitle: {
    minHeight: 52,
    color: '#193F34',
    fontWeight: '800',
  },
  placeDescription: {
    minHeight: 72,
    color: '#70847B',
    lineHeight: 19,
  },
  mapButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
    backgroundColor: '#087C5D',
    paddingHorizontal: 12,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  creditPressable: {
    minHeight: 26,
    justifyContent: 'center',
  },
  photoCredit: {
    color: '#71847C',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  linkError: {
    color: '#A83232',
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.82,
  },
});
