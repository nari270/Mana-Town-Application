import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getBusinessCategories,
  getBusinesses,
  getReverseGeocodedLocality,
  getApiErrorMessage,
} from '../src/api';
import { NatureBackdrop } from '../src/NatureBackdrop';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '../src/AppFooter';
import { useLocationContext } from '../src/LocationContext';

export default function BusinessesScreen() {
  const { t, i18n } = useTranslation();
  const { category: categoryParam } = useLocalSearchParams<{
    category?: string;
  }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categoryParam ?? '');
  const [locationStatus, setLocationStatus] = useState<
    'checking' | 'required' | 'locating' | 'ready' | 'denied' | 'error'
  >('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const {
    locality,
    selectedLocality,
    setDetectedLocality,
    setSelectedLocality,
  } = useLocationContext();
  const [locationAttribution, setLocationAttribution] = useState('');
  const [localityError, setLocalityError] = useState('');
  const [localityLoading, setLocalityLoading] = useState(false);
  const [areaInput, setAreaInput] = useState('');
  useEffect(() => {
    setCategory(categoryParam ?? '');
  }, [categoryParam]);
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      setCanAskAgain(permission.canAskAgain);
      if (!permission.granted) {
        setLocationStatus('required');
        return;
      }
      await loadCurrentLocation();
    };
    void checkPermission().catch(() => {
      setLocationStatus('error');
    });
  }, []);
  useEffect(() => {
    setAreaInput(selectedLocality);
  }, [selectedLocality]);
  const loadCurrentLocation = async () => {
    setLocationStatus('locating');
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus('ready');
      setLocalityLoading(true);
      setLocalityError('');
      try {
        const result = await getReverseGeocodedLocality({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          language: i18n.resolvedLanguage ?? 'en',
        });
        setDetectedLocality(result.locality);
        setLocationAttribution(result.attribution);
      } catch {
        setDetectedLocality('');
        setLocalityError(t('directory.localityLookupError'));
      } finally {
        setLocalityLoading(false);
      }
    } catch {
      setLocationStatus('error');
    }
  };
  const requestLocationPermission = async () => {
    setLocationStatus('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(permission.canAskAgain);
      if (!permission.granted) {
        setLocationStatus('denied');
        return;
      }
      await loadCurrentLocation();
    } catch {
      setLocationStatus('error');
    }
  };
  const categories = useQuery({
    queryKey: ['business-categories'],
    queryFn: getBusinessCategories,
  });
  const businesses = useInfiniteQuery({
    queryKey: [
      'businesses',
      search,
      category,
      selectedLocality,
      currentLocation?.latitude,
      currentLocation?.longitude,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getBusinesses({
        page: pageParam,
        search,
        category,
        ...(selectedLocality
          ? { locality: selectedLocality }
          : (currentLocation ?? {})),
        pageSize: 20,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total
        ? lastPage.page + 1
        : undefined,
    enabled: locationStatus === 'ready',
  });
  const items = businesses.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedCategory = categories.data?.find(
    (item) => item.slug === category,
  );
  const heading = selectedCategory
    ? i18n.resolvedLanguage === 'te'
      ? selectedCategory.nameTelugu
      : selectedCategory.nameEnglish
    : t('directory.title');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <NatureBackdrop />
      <View style={styles.content}>
        <Link href="/" asChild>
          <Button mode="text" icon="arrow-left">
            {t('nav.home')}
          </Button>
        </Link>
        <View style={styles.pageHeading}>
          <View style={styles.headingIcon}>
            <MaterialCommunityIcons
              name="storefront-outline"
              size={25}
              color="#087C5D"
            />
          </View>
          <View style={styles.headingCopy}>
            <Text variant="headlineMedium" style={styles.heading}>
              {heading}
            </Text>
            <View style={styles.location}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#6B8379"
              />
              <View style={styles.locationDetails}>
                <Text variant="bodyMedium" style={styles.locationText}>
                  {locality ||
                    t(
                      locationStatus === 'ready'
                        ? 'directory.currentLocation'
                        : 'directory.locationRequired',
                    )}
                </Text>
                {localityLoading ? (
                  <Text variant="labelSmall" style={styles.attribution}>
                    {t('directory.identifyingLocation')}
                  </Text>
                ) : locationAttribution && !selectedLocality ? (
                  <Link href="https://www.openstreetmap.org/copyright" asChild>
                    <Text variant="labelSmall" style={styles.attribution}>
                      {locationAttribution}
                    </Text>
                  </Link>
                ) : null}
                {localityError && !selectedLocality ? (
                  <Text variant="labelSmall" style={styles.locationError}>
                    {localityError}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
        {locationStatus !== 'ready' ? (
          <View style={styles.permissionCard}>
            <MaterialCommunityIcons
              name="map-marker-alert-outline"
              size={28}
              color="#087C5D"
            />
            <Text variant="titleMedium" style={styles.permissionTitle}>
              {locationStatus === 'checking' || locationStatus === 'locating'
                ? t('directory.locationLoading')
                : t('directory.locationRequired')}
            </Text>
            <Text variant="bodyMedium" style={styles.permissionDescription}>
              {locationStatus === 'denied' || !canAskAgain
                ? t('directory.locationDenied')
                : locationStatus === 'error'
                  ? t('directory.locationError')
                  : t('directory.locationExplanation')}
            </Text>
            {(locationStatus === 'required' ||
              locationStatus === 'denied' ||
              locationStatus === 'error') && (
              <Button
                mode="contained"
                onPress={() =>
                  canAskAgain
                    ? void requestLocationPermission()
                    : void Linking.openSettings().catch(() =>
                        setLocationStatus('error'),
                      )
                }
              >
                {canAskAgain
                  ? t('directory.allowLocation')
                  : t('directory.openLocationSettings')}
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.areaPicker}>
            <TextInput
              label={t('directory.customAreaLabel')}
              value={areaInput}
              onChangeText={setAreaInput}
              onSubmitEditing={() => {
                setSelectedLocality(areaInput.trim());
              }}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Button
              mode="outlined"
              disabled={!areaInput.trim()}
              onPress={() => setSelectedLocality(areaInput.trim())}
            >
              {t('directory.customAreaButton')}
            </Button>
            {selectedLocality ? (
              <Button
                mode="text"
                onPress={() => {
                  setSelectedLocality('');
                  setAreaInput('');
                }}
              >
                {t('directory.useLiveArea')}
              </Button>
            ) : null}
          </View>
        )}
        <View style={styles.searchRow}>
          <TextInput
            label={t('directory.searchLabel')}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearch(searchInput.trim())}
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel={t('directory.searchLabel')}
          />
          <Button
            mode="contained"
            onPress={() => setSearch(searchInput.trim())}
            style={styles.searchButton}
          >
            {t('directory.searchButton')}
          </Button>
        </View>

        {categories.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('directory.categoriesError')}
            </Text>
            <Button mode="outlined" onPress={() => void categories.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {categories.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <Chip
                selected={!category}
                onPress={() => setCategory('')}
                accessibilityLabel={t('directory.allCategories')}
              >
                {t('directory.allCategories')}
              </Chip>
              {categories.data.map((item) => (
                <Chip
                  key={item.id}
                  selected={category === item.slug}
                  onPress={() =>
                    setCategory((current) =>
                      current === item.slug ? '' : item.slug,
                    )
                  }
                >
                  {i18n.resolvedLanguage === 'te'
                    ? item.nameTelugu
                    : item.nameEnglish}
                </Chip>
              ))}
            </View>
          </ScrollView>
        )}

        {locationStatus === 'ready' && businesses.isPending && (
          <Text accessibilityRole="progressbar">{t('directory.loading')}</Text>
        )}
        {locationStatus === 'ready' && businesses.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(businesses.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void businesses.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {locationStatus === 'ready' &&
          businesses.isSuccess &&
          items.length === 0 && (
            <Text style={styles.state}>
              {selectedLocality
                ? t('directory.emptyArea', { area: selectedLocality })
                : t('directory.empty')}
            </Text>
          )}
        {locationStatus === 'ready' && (
          <View style={styles.listings}>
            {items.map((business) => (
              <Card
                key={business.id}
                mode="elevated"
                style={[styles.listingCard, isWide && styles.wideListingCard]}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.businessIntro}>
                    <View style={styles.businessImage}>
                      <MaterialCommunityIcons
                        name="storefront"
                        size={30}
                        color="#087C5D"
                      />
                    </View>
                    <View style={styles.businessName}>
                      <Text variant="titleLarge" style={styles.businessTitle}>
                        {business.name}
                      </Text>
                      <Text variant="labelMedium" style={styles.categoryText}>
                        {business.categories
                          .map((item) =>
                            i18n.resolvedLanguage === 'te'
                              ? item.nameTelugu
                              : item.nameEnglish,
                          )
                          .join(' · ')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={20}
                      color="#16845F"
                    />
                  </View>
                  <Text variant="bodyMedium" numberOfLines={3}>
                    {business.description}
                  </Text>
                  {business.images[0] && (
                    <Image
                      source={{ uri: business.images[0].imageUrl }}
                      style={styles.listingPhoto}
                      resizeMode="cover"
                      accessibilityLabel={business.images[0].altText}
                    />
                  )}
                  <View style={styles.location}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={16}
                      color="#6B8379"
                    />
                    <Text variant="bodySmall" style={styles.locationText}>
                      {business.address}, {business.locality}
                    </Text>
                  </View>
                  {business.hours.length > 0 && (
                    <View style={styles.location}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={16}
                        color="#6B8379"
                      />
                      <Text variant="bodySmall" style={styles.locationText}>
                        {business.hours
                          .map((hour) =>
                            hour.closed
                              ? `${t(`directory.weekday.${hour.weekday}`)}: ${t('directory.closed')}`
                              : `${t(`directory.weekday.${hour.weekday}`)}: ${hour.opensAt ?? ''}–${hour.closesAt ?? ''}`,
                          )
                          .join(' · ')}
                      </Text>
                    </View>
                  )}
                </Card.Content>
                <Card.Actions>
                  {business.phone && (
                    <Button
                      icon="phone-outline"
                      onPress={() =>
                        void Linking.openURL(`tel:${business.phone}`)
                      }
                    >
                      {t('business.call')}
                    </Button>
                  )}
                  {business.whatsapp && (
                    <Button
                      icon="whatsapp"
                      onPress={() =>
                        void Linking.openURL(
                          `https://wa.me/${business.whatsapp?.replace(/\D/g, '')}`,
                        )
                      }
                    >
                      {t('business.whatsapp')}
                    </Button>
                  )}
                  <Link href={`/businesses/${business.id}`} asChild>
                    <Button mode="contained">{t('directory.details')}</Button>
                  </Link>
                </Card.Actions>
              </Card>
            ))}
          </View>
        )}
        {locationStatus === 'ready' && businesses.hasNextPage && (
          <Button
            mode="outlined"
            loading={businesses.isFetchingNextPage}
            disabled={businesses.isFetchingNextPage}
            onPress={() => void businesses.fetchNextPage()}
          >
            {t('directory.loadMore')}
          </Button>
        )}
      </View>
      <AppFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    flexGrow: 1,
    backgroundColor: 'transparent',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    gap: 16,
  },
  heading: {
    color: '#173F34',
    fontWeight: '700',
  },
  pageHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#E6F3EA',
    padding: 16,
  },
  headingIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
  },
  headingCopy: {
    flex: 1,
    gap: 3,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flexShrink: 1,
    color: '#6B8379',
  },
  locationDetails: {
    flex: 1,
    gap: 2,
  },
  attribution: {
    color: '#6B8379',
  },
  locationError: {
    color: '#B42318',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    alignSelf: 'center',
  },
  permissionCard: {
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDEAE3',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  permissionTitle: {
    color: '#193F34',
    fontWeight: '800',
  },
  permissionDescription: {
    color: '#70847B',
    lineHeight: 21,
  },
  areaPicker: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  listings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  listingCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  wideListingCard: {
    width: '48%',
    flexGrow: 1,
  },
  cardContent: {
    gap: 8,
  },
  businessIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  businessImage: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#DDF5E9',
  },
  listingPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#E6EFE8',
  },
  businessName: {
    flex: 1,
    gap: 3,
  },
  businessTitle: {
    color: '#23473B',
    fontWeight: '700',
  },
  categoryText: {
    color: '#568276',
  },
  state: {
    paddingVertical: 18,
    gap: 12,
  },
  error: {
    color: '#B42318',
  },
});
