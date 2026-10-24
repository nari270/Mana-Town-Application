import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '../src/AppFooter';
import { hasRole, useSession } from '../src/session';
import { NatureBackdrop } from '../src/NatureBackdrop';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getReverseGeocodedLocality } from '../src/api';
import { useLocationContext } from '../src/LocationContext';

type Destination =
  '/businesses' | '/entrepreneurs' | '/report-issue' | '/owner' | '/tourism';

type DiscoveryCardData = {
  href: Href;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const isCompact = width < 440;
  const session = useSession();
  const adminMode = hasRole(session, 'ADMIN');
  const {
    locality,
    selectedLocality,
    setDetectedLocality,
    setSelectedLocality,
  } = useLocationContext();
  const [locationAttribution, setLocationAttribution] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [areaInput, setAreaInput] = useState('');

  const updateCurrentLocation = async (requestPermission: boolean) => {
    setLocationLoading(true);
    setLocationError('');
    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        if (requestPermission)
          setLocationError(t('home.locationPermissionDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const result = await getReverseGeocodedLocality({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        language: i18n.resolvedLanguage ?? 'en',
      });
      setDetectedLocality(result.locality);
      setLocationAttribution(result.attribution);
    } catch {
      setLocationError(t('home.locationLookupError'));
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    void Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (permission.granted) void updateCurrentLocation(false);
      })
      .catch(() => setLocationError(t('home.locationLookupError')));
  }, []);

  useEffect(() => {
    setAreaInput(locality);
  }, [locality]);

  const useCurrentLocation = () => {
    setSelectedLocality('');
    void updateCurrentLocation(true);
  };

  const discoveryCards: DiscoveryCardData[] = [
    {
      href: '/businesses',
      icon: 'storefront-outline',
      title: t('home.businesses.title'),
      description: t('home.businesses.description'),
    },
    {
      href: '/entrepreneurs',
      icon: 'account-heart-outline',
      title: t('home.entrepreneurs.title'),
      description: t('home.entrepreneurs.description'),
    },
    {
      href: {
        pathname: '/businesses',
        params: { category: 'farm-agriculture-services' },
      },
      icon: 'sprout-outline',
      title: t('home.farmCard.title'),
      description: t('home.farmCard.description'),
    },
    {
      href: '/tourism',
      icon: 'map-marker-radius-outline',
      title: t('home.tourism.teaserTitle', {
        town: locality || t('town'),
      }),
      description: t('home.tourism.teaserDescription'),
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <NatureBackdrop />
      <View style={[styles.content, isWide && styles.wideContent]}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.brandText}>
              <Text variant="titleMedium" style={styles.brand}>
                {t('brand')}
              </Text>
              <Text variant="labelSmall" style={styles.brandCaption}>
                {locality || t('town')} · Andhra Pradesh
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.hero, isWide && styles.wideHero]}>
          <View style={styles.heroCopy}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.useCurrentLocation')}
              disabled={locationLoading}
              onPress={useCurrentLocation}
              style={styles.locationPill}
            >
              <MaterialCommunityIcons
                name={locationLoading ? 'loading' : 'map-marker'}
                size={15}
                color="#D8F6E8"
              />
              <Text variant="labelMedium" style={styles.locationText}>
                {locationLoading
                  ? t('home.locationLoading')
                  : `${locality || t('town')}, Andhra Pradesh`}
              </Text>
              {!locationLoading && (
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={14}
                  color="#D8F6E8"
                />
              )}
            </Pressable>
            {locationAttribution && !selectedLocality ? (
              <Link href="https://www.openstreetmap.org/copyright" asChild>
                <Pressable accessibilityRole="link">
                  <Text variant="labelSmall" style={styles.locationAttribution}>
                    {locationAttribution}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
            {locationError ? (
              <Text accessibilityRole="alert" style={styles.locationError}>
                {locationError}
              </Text>
            ) : null}
            <View style={styles.customLocationPicker}>
              <TextInput
                dense
                label={t('home.customAreaLabel')}
                value={areaInput}
                onChangeText={setAreaInput}
                onSubmitEditing={() => setSelectedLocality(areaInput.trim())}
                returnKeyType="done"
                style={styles.customLocationInput}
              />
              <Button
                mode="outlined"
                disabled={!areaInput.trim()}
                onPress={() => setSelectedLocality(areaInput.trim())}
                textColor="#FFFFFF"
                style={styles.customLocationButton}
              >
                {t('home.customAreaButton')}
              </Button>
            </View>
            <Text
              variant={isWide ? 'displaySmall' : 'headlineMedium'}
              style={styles.heroTitle}
            >
              {t('home.heroTitle', {
                town: locality || t('town'),
              })}
            </Text>
            <Text variant="bodyLarge" style={styles.heroSubtitle}>
              {t('home.heroTagline')}
            </Text>
            <Text variant="bodyMedium" style={styles.heroDescription}>
              {t('home.heroDescription')}
            </Text>
            <Link href="/businesses" asChild>
              <Button
                mode="contained"
                icon="arrow-right"
                contentStyle={styles.heroButtonContent}
                style={styles.heroButton}
                labelStyle={styles.heroButtonLabel}
              >
                {t(isCompact ? 'home.exploreShort' : 'home.explore')}
              </Button>
            </Link>
          </View>
          <View
            accessible={false}
            style={[
              styles.heroArtwork,
              isCompact && styles.compactHeroArtwork,
              isWide && styles.wideHeroArtwork,
            ]}
          >
            <View style={styles.artworkSun} />
            <View style={styles.artworkHillBack} />
            <View style={styles.artworkHillFront} />
            <View style={styles.artworkPin}>
              <MaterialCommunityIcons
                name="map-marker"
                size={isWide ? 65 : 54}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.artworkTown}>
              <View style={styles.townBuilding} />
              <View style={[styles.townBuilding, styles.townBuildingTall]} />
              <View style={styles.townBuilding} />
            </View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t('home.discoveryTitle', { town: locality || t('town') })}
            </Text>
            <Text variant="bodyMedium" style={styles.sectionSubtitle}>
              {t('home.discoverySubtitle')}
            </Text>
          </View>
        </View>

        <View style={styles.discoveryGrid}>
          {discoveryCards.map((card) => (
            <Link key={card.title} href={card.href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={card.title}
                style={({ pressed }) => [
                  styles.discoveryCard,
                  { width: isWide ? '47%' : '100%' },
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.discoveryIcon}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={25}
                    color="#087C5D"
                  />
                </View>
                <View style={styles.discoveryCardCopy}>
                  <Text variant="titleMedium" style={styles.discoveryCardTitle}>
                    {card.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={styles.discoveryCardDescription}
                  >
                    {card.description}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={19}
                  color="#087C5D"
                />
              </Pressable>
            </Link>
          ))}
        </View>

        <View style={styles.communityActions}>
          <Link href="/report-issue" asChild>
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.communityAction,
                styles.reportAction,
                isWide && styles.wideCommunityAction,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.reportActionIcon}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={23}
                  color="#A66D0A"
                />
              </View>
              <View style={styles.actionCopy}>
                <Text variant="titleMedium" style={styles.actionTitle}>
                  {t('home.reportAction.title')}
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  {t('home.reportAction.description')}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="#A66D0A"
              />
            </Pressable>
          </Link>
          <Link href="/owner" asChild>
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.communityAction,
                styles.ownerAction,
                isWide && styles.wideCommunityAction,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.ownerActionIcon}>
                <MaterialCommunityIcons
                  name="store-edit-outline"
                  size={23}
                  color="#087C5D"
                />
              </View>
              <View style={styles.actionCopy}>
                <Text variant="titleMedium" style={styles.actionTitle}>
                  {t('home.ownerAction.title')}
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  {t('home.ownerAction.description')}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="#087C5D"
              />
            </Pressable>
          </Link>
          {adminMode && (
            <Link href="/admin" asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [
                  styles.communityAction,
                  styles.adminAction,
                  isWide && styles.wideCommunityAction,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.adminActionIcon}>
                  <MaterialCommunityIcons
                    name="view-dashboard-outline"
                    size={23}
                    color="#7350B8"
                  />
                </View>
                <View style={styles.actionCopy}>
                  <Text variant="titleMedium" style={styles.actionTitle}>
                    {t('admin.title')}
                  </Text>
                  <Text variant="bodySmall" style={styles.actionDescription}>
                    {t('home.adminDescription')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color="#7350B8"
                />
              </Pressable>
            </Link>
          )}
        </View>

        <View style={styles.communityBanner}>
          <View style={styles.communityIcon}>
            <MaterialCommunityIcons
              name="hand-heart-outline"
              size={25}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.communityCopy}>
            <Text variant="titleMedium" style={styles.communityTitle}>
              {t('home.communityTitle')}
            </Text>
            <Text variant="bodySmall" style={styles.communitySubtitle}>
              {t('home.communitySubtitle', {
                town: locality || t('town'),
              })}
            </Text>
          </View>
          <MaterialCommunityIcons name="heart" size={18} color="#E28186" />
        </View>

        <View style={styles.bottomNav}>
          <BottomNavItem
            href="/"
            icon="home-variant"
            label={t('nav.home')}
            active
          />
          <BottomNavItem
            href="/businesses"
            icon="storefront-outline"
            label={t('nav.businesses')}
          />
          <BottomNavItem
            href="/report-issue"
            icon="lightbulb-on-outline"
            label={t('nav.reportIssue')}
          />
          <BottomNavItem
            href="/owner"
            icon="account-outline"
            label={t('nav.profile')}
          />
        </View>
        <AppFooter />
      </View>
    </ScrollView>
  );
}

function BottomNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: Destination | '/';
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        style={styles.navItem}
      >
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={active ? '#087C5D' : '#788D86'}
        />
        <Text
          variant="labelSmall"
          numberOfLines={1}
          style={[styles.navLabel, active && styles.navLabelActive]}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  content: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    gap: 20,
  },
  wideContent: {
    maxWidth: 1120,
    gap: 26,
  },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  logoMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#087C5D',
  },
  brandText: {
    flexShrink: 1,
  },
  brand: {
    color: '#134B3D',
    fontWeight: '800',
  },
  brandCaption: {
    color: '#688078',
  },
  language: {
    width: 236,
    maxWidth: '100%',
    flexShrink: 0,
  },
  hero: {
    minHeight: 270,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#087C5D',
    padding: 22,
    elevation: 3,
  },
  wideHero: {
    minHeight: 320,
    paddingHorizontal: 38,
    paddingVertical: 28,
  },
  heroCopy: {
    zIndex: 1,
    flex: 1,
    gap: 8,
  },
  locationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locationText: {
    color: '#E7F8EF',
  },
  locationAttribution: {
    color: '#D5EFE3',
  },
  locationError: {
    color: '#FFE0D6',
  },
  customLocationPicker: {
    width: '100%',
    maxWidth: 340,
    gap: 6,
    marginBottom: 2,
  },
  customLocationInput: {
    backgroundColor: '#FFFFFF',
  },
  customLocationButton: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(255,255,255,0.75)',
  },
  heroTitle: {
    maxWidth: 470,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 42,
  },
  heroSubtitle: {
    color: '#E9F7F0',
    fontWeight: '600',
  },
  heroDescription: {
    maxWidth: 440,
    color: '#D5EFE3',
    lineHeight: 22,
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  heroButtonContent: {
    minHeight: 46,
    flexDirection: 'row-reverse',
  },
  heroButtonLabel: {
    color: '#087C5D',
    fontWeight: '700',
  },
  heroArtwork: {
    width: 126,
    height: 174,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  compactHeroArtwork: {
    width: 94,
  },
  wideHeroArtwork: {
    width: 310,
    height: 232,
    marginRight: 10,
  },
  artworkSun: {
    position: 'absolute',
    top: 14,
    right: 8,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F9C85E',
  },
  artworkHillBack: {
    position: 'absolute',
    bottom: 8,
    left: 4,
    width: 122,
    height: 76,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    backgroundColor: '#58B98B',
    transform: [{ rotate: '-8deg' }],
  },
  artworkHillFront: {
    position: 'absolute',
    bottom: 0,
    right: -9,
    width: 120,
    height: 62,
    borderTopLeftRadius: 78,
    borderTopRightRadius: 70,
    backgroundColor: '#B5E7C6',
    transform: [{ rotate: '8deg' }],
  },
  artworkPin: {
    zIndex: 1,
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderRadius: 40,
    backgroundColor: '#F2A950',
    borderWidth: 5,
    borderColor: '#FFF4DA',
    elevation: 4,
  },
  artworkTown: {
    position: 'absolute',
    zIndex: 2,
    bottom: 9,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  townBuilding: {
    width: 24,
    height: 23,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: '#FFF8E8',
  },
  townBuildingTall: {
    width: 29,
    height: 36,
    backgroundColor: '#F4C16F',
  },
  identity: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDEAE3',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  identityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  identityTitle: {
    color: '#315E52',
  },
  identityOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#173F34',
    fontWeight: '800',
    marginTop: 3,
  },
  sectionSubtitle: {
    marginTop: 2,
    color: '#74877F',
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  discoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  discoveryCard: {
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2EAE4',
    backgroundColor: '#FFFFFF',
    padding: 15,
    elevation: 1,
  },
  discoveryIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#E7F2EA',
  },
  discoveryCardCopy: {
    flex: 1,
    gap: 4,
  },
  discoveryCardTitle: {
    color: '#193F34',
    fontWeight: '800',
  },
  discoveryCardDescription: {
    color: '#70847B',
    lineHeight: 18,
  },
  communityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  communityAction: {
    minHeight: 92,
    flex: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  wideCommunityAction: {
    flexBasis: '30%',
  },
  reportAction: {
    backgroundColor: '#FFF5DF',
  },
  ownerAction: {
    backgroundColor: '#E3F0E8',
  },
  adminAction: {
    backgroundColor: '#F1ECF9',
  },
  reportActionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F4E2B7',
  },
  ownerActionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#CBE5D5',
  },
  adminActionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#E2D8F2',
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    color: '#193F34',
    fontWeight: '700',
  },
  actionDescription: {
    color: '#70847B',
    lineHeight: 17,
  },
  communityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#E6F3EA',
    padding: 15,
  },
  communityIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#087C5D',
  },
  communityCopy: {
    flex: 1,
    gap: 2,
  },
  communityTitle: {
    color: '#1C493B',
    fontWeight: '700',
  },
  communitySubtitle: {
    color: '#6C8379',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
    borderTopWidth: 1,
    borderColor: '#E3EBE6',
    backgroundColor: '#FFFFFF',
    marginHorizontal: -18,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  navItem: {
    minWidth: 62,
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navLabel: {
    maxWidth: '100%',
    color: '#788D86',
    textAlign: 'center',
  },
  navLabelActive: {
    color: '#087C5D',
    fontWeight: '700',
  },
});
