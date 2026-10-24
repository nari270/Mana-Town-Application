import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import {
  createAdminCampaign,
  getApiErrorMessage,
  getAdminCampaigns,
  updateAdminCampaign,
} from '../../src/api';

export default function AdminAdvertisementsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [placement, setPlacement] = useState('home-banner');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED');
  const campaigns = useQuery({
    queryKey: ['admin', 'advertisements'],
    queryFn: getAdminCampaigns,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'advertisements'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
    ]);
  };
  const create = useMutation({
    mutationFn: () =>
      createAdminCampaign({
        name: name.trim(),
        placement,
        startsAt,
        endsAt,
        status,
        ...(businessId.trim() ? { businessId: businessId.trim() } : {}),
      }),
    onSuccess: async () => {
      setName('');
      setBusinessId('');
      setStartsAt('');
      setEndsAt('');
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      status: nextStatus,
    }: {
      id: string;
      status: 'ACTIVE' | 'PAUSED';
    }) => updateAdminCampaign(id, { status: nextStatus }),
    onSuccess: refresh,
  });
  const validDateRange =
    Number.isFinite(Date.parse(startsAt)) &&
    Number.isFinite(Date.parse(endsAt)) &&
    Date.parse(endsAt) > Date.parse(startsAt);
  const mutationError = create.error ?? update.error;
  const error = mutationError ? getApiErrorMessage(mutationError, t) : '';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Link href="/admin" asChild>
          <Button mode="text" icon="arrow-left">
            {t('admin.title')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('adminAds.title')}
        </Text>
        <TextInput
          label={t('adminAds.name')}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          label={t('adminAds.businessId')}
          value={businessId}
          onChangeText={setBusinessId}
          autoCapitalize="none"
        />
        <TextInput
          label={t('adminAds.placement')}
          value={placement}
          onChangeText={setPlacement}
          autoCapitalize="none"
        />
        <TextInput
          label={t('adminAds.startsAt')}
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder="2026-10-24T09:00:00+05:30"
          autoCapitalize="none"
        />
        <TextInput
          label={t('adminAds.endsAt')}
          value={endsAt}
          onChangeText={setEndsAt}
          placeholder="2026-10-30T18:00:00+05:30"
          autoCapitalize="none"
        />
        <SegmentedButtons
          value={status}
          onValueChange={(value) => {
            if (value === 'ACTIVE' || value === 'PAUSED') setStatus(value);
          }}
          buttons={[
            { value: 'ACTIVE', label: t('adminAds.ACTIVE') },
            { value: 'PAUSED', label: t('adminAds.PAUSED') },
          ]}
        />
        <Text>{t('adminAds.bannerNotice')}</Text>
        <Button
          mode="contained"
          loading={create.isPending}
          disabled={
            name.trim().length < 2 ||
            placement.trim().length < 2 ||
            !validDateRange ||
            create.isPending
          }
          onPress={() => create.mutate()}
        >
          {t('adminAds.create')}
        </Button>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {campaigns.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button mode="outlined" onPress={() => void campaigns.refetch()}>
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {campaigns.data?.map((campaign) => (
          <Card key={campaign.id} mode="elevated">
            <Card.Content style={styles.card}>
              <Text variant="titleMedium">{campaign.name}</Text>
              <Text>{campaign.placement}</Text>
              <Text>
                {t(`adminAds.${campaign.status}`)} ·{' '}
                {new Date(campaign.startsAt).toLocaleString()} –{' '}
                {new Date(campaign.endsAt).toLocaleString()}
              </Text>
              <Text>
                {t('adminAds.impressions')}: {campaign.impressions} ·{' '}
                {t('adminAds.clicks')}: {campaign.clicks}
              </Text>
            </Card.Content>
            {campaign.status !== 'EXPIRED' && (
              <Card.Actions>
                <Button
                  loading={update.isPending}
                  disabled={update.isPending}
                  onPress={() =>
                    update.mutate({
                      id: campaign.id,
                      status:
                        campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                    })
                  }
                >
                  {campaign.status === 'ACTIVE'
                    ? t('adminAds.PAUSED')
                    : t('adminAds.ACTIVE')}
                </Button>
              </Card.Actions>
            )}
          </Card>
        ))}
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
    gap: 14,
  },
  heading: {
    color: '#0B6B4F',
    fontWeight: '700',
  },
  card: {
    gap: 8,
  },
  state: {
    gap: 8,
  },
  error: {
    color: '#B42318',
  },
});
