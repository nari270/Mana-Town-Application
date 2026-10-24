import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getBusinessCategories,
  getBusinesses,
  getApiErrorMessage,
} from '../src/api';
import { useTranslation } from 'react-i18next';

export default function BusinessesScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const categories = useQuery({
    queryKey: ['business-categories'],
    queryFn: getBusinessCategories,
  });
  const businesses = useInfiniteQuery({
    queryKey: ['businesses', search, category],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getBusinesses({
        page: pageParam,
        search,
        category,
        locality: 'Kadiri',
        pageSize: 20,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total
        ? lastPage.page + 1
        : undefined,
  });
  const items = businesses.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <ScrollView contentContainerStyle={styles.page}>
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
              {t('directory.title')}
            </Text>
            <View style={styles.location}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#6B8379"
              />
              <Text variant="bodyMedium" style={styles.locationText}>
                Kadiri, Andhra Pradesh
              </Text>
            </View>
          </View>
        </View>
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

        {businesses.isPending && (
          <Text accessibilityRole="progressbar">{t('directory.loading')}</Text>
        )}
        {businesses.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(businesses.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void businesses.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {businesses.isSuccess && items.length === 0 && (
          <Text style={styles.state}>{t('directory.empty')}</Text>
        )}
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
        {businesses.hasNextPage && (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: '#F5F9F7',
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
