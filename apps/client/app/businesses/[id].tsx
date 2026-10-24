import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Text } from 'react-native-paper';
import { getApiErrorMessage, getBusiness } from '../../src/api';
import { useTranslation } from 'react-i18next';

export default function BusinessDetailsScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const business = useQuery({
    queryKey: ['business', id],
    queryFn: () => getBusiness(id),
    enabled: Boolean(id),
  });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Button mode="text" icon="arrow-left" onPress={() => router.back()}>
          {t('directory.back')}
        </Button>
        {business.isPending && (
          <Text accessibilityRole="progressbar">Loading business…</Text>
        )}
        {business.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(business.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void business.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {business.data && (
          <Card mode="elevated">
            <Card.Content style={styles.card}>
              <Text variant="headlineMedium" style={styles.heading}>
                {business.data.name}
              </Text>
              <Text variant="titleMedium">
                {business.data.categories
                  .map((item) =>
                    i18n.resolvedLanguage === 'te'
                      ? item.nameTelugu
                      : item.nameEnglish,
                  )
                  .join(' · ')}
              </Text>
              <Text variant="bodyLarge">{business.data.description}</Text>
              <Text>
                {business.data.address}, {business.data.locality}
              </Text>
              {business.data.hours.map((hour) => (
                <Text key={hour.weekday}>
                  {t(`directory.weekday.${hour.weekday}`)}:{' '}
                  {hour.closed
                    ? t('directory.closed')
                    : `${hour.opensAt ?? ''}–${hour.closesAt ?? ''}`}
                </Text>
              ))}
            </Card.Content>
            <Card.Actions>
              {business.data.phone && (
                <Button
                  onPress={() =>
                    void Linking.openURL(`tel:${business.data.phone}`)
                  }
                >
                  {t('business.call')}
                </Button>
              )}
              {business.data.whatsapp && (
                <Button
                  onPress={() =>
                    void Linking.openURL(
                      `https://wa.me/${business.data.whatsapp?.replace(/\D/g, '')}`,
                    )
                  }
                >
                  {t('business.whatsapp')}
                </Button>
              )}
            </Card.Actions>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    gap: 16,
  },
  heading: {
    color: '#0B6B4F',
  },
  card: {
    gap: 12,
  },
  state: {
    paddingVertical: 18,
    gap: 12,
  },
  error: {
    color: '#B42318',
  },
});
