import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '../src/AppFooter';
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getBusinessCategories,
  getEntrepreneurs,
  getApiErrorMessage,
} from '../src/api';
import { NatureBackdrop } from '../src/NatureBackdrop';
import { useLocationContext } from '../src/LocationContext';

export default function EntrepreneursScreen() {
  const { t, i18n } = useTranslation();
  const { locality } = useLocationContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const categories = useQuery({
    queryKey: ['business-categories'],
    queryFn: getBusinessCategories,
  });
  const profiles = useInfiniteQuery({
    queryKey: ['entrepreneurs', search, category, locality],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getEntrepreneurs({
        page: pageParam,
        pageSize: 20,
        search,
        category,
        ...(locality ? { locality } : {}),
      }),
    getNextPageParam: (page) =>
      page.page * page.pageSize < page.total ? page.page + 1 : undefined,
  });
  const items = profiles.data?.pages.flatMap((page) => page.items) ?? [];
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
              name="account-heart-outline"
              size={25}
              color="#C53E75"
            />
          </View>
          <View style={styles.headingCopy}>
            <Text variant="headlineMedium" style={styles.heading}>
              {t('entrepreneur.title')}
            </Text>
            <View style={styles.location}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#6B8379"
              />
              <Text variant="bodyMedium" style={styles.locationText}>
                {locality || t('town')}, Andhra Pradesh
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            label={t('entrepreneur.searchLabel')}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearch(searchInput.trim())}
            returnKeyType="search"
            style={styles.search}
          />
          <Button
            mode="contained"
            onPress={() => setSearch(searchInput.trim())}
          >
            {t('directory.searchButton')}
          </Button>
        </View>
        {categories.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(categories.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void categories.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {categories.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <Chip selected={!category} onPress={() => setCategory('')}>
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
        {profiles.isPending && (
          <Text accessibilityRole="progressbar">
            {t('entrepreneur.loading')}
          </Text>
        )}
        {profiles.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(profiles.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void profiles.refetch()}>
              {t('entrepreneur.retry')}
            </Button>
          </View>
        )}
        {profiles.isSuccess && items.length === 0 && (
          <Text style={styles.state}>{t('entrepreneur.empty')}</Text>
        )}
        <View style={styles.listings}>
          {items.map((profile) => (
            <Card
              key={profile.id}
              mode="elevated"
              style={[styles.listingCard, isWide && styles.wideListingCard]}
            >
              <Card.Content style={styles.card}>
                <View style={styles.profileIntro}>
                  <View style={styles.profileImage}>
                    <MaterialCommunityIcons
                      name="account-heart"
                      size={29}
                      color="#C53E75"
                    />
                  </View>
                  <View style={styles.profileName}>
                    <Text variant="titleLarge" style={styles.profileTitle}>
                      {profile.name}
                    </Text>
                    <Text variant="labelMedium" style={styles.categoryText}>
                      {profile.categories
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
                <Text numberOfLines={3}>{profile.description}</Text>
                <View style={styles.location}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={16}
                    color="#6B8379"
                  />
                  <Text style={styles.locationText}>
                    {profile.address}, {profile.locality}
                  </Text>
                </View>
              </Card.Content>
              <Card.Actions>
                <Link href={`/businesses/${profile.id}`} asChild>
                  <Button mode="contained" icon="arrow-right">
                    {t('directory.details')}
                  </Button>
                </Link>
              </Card.Actions>
            </Card>
          ))}
        </View>
        {profiles.hasNextPage && (
          <Button
            mode="outlined"
            loading={profiles.isFetchingNextPage}
            disabled={profiles.isFetchingNextPage}
            onPress={() => void profiles.fetchNextPage()}
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
    backgroundColor: '#FBE9F0',
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
  search: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  card: {
    gap: 8,
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
  profileIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  profileImage: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FCE5EF',
  },
  profileName: {
    flex: 1,
    gap: 3,
  },
  profileTitle: {
    color: '#49364A',
    fontWeight: '700',
  },
  categoryText: {
    color: '#A25F7B',
  },
  state: {
    paddingVertical: 18,
    gap: 12,
  },
  error: {
    color: '#B42318',
  },
});
