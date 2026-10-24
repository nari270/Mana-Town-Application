import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '../src/AppFooter';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import type { IssueStatus } from '@mana-town/shared-types';
import {
  approveBusiness,
  approveEntrepreneur,
  getAdminBusinesses,
  getAdminDashboard,
  getAdminEntrepreneurRequests,
  getAdminIssues,
  rejectBusiness,
  rejectEntrepreneur,
  updateIssueStatus,
} from '../src/api';
import { NatureBackdrop } from '../src/NatureBackdrop';

const nextIssueStatuses: Record<IssueStatus, IssueStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['IN_PROGRESS', 'REJECTED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

export default function AdminScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [businessReasons, setBusinessReasons] = useState<
    Record<string, string>
  >({});
  const [entrepreneurReasons, setEntrepreneurReasons] = useState<
    Record<string, string>
  >({});
  const [issueFields, setIssueFields] = useState<
    Record<string, { resolution: string; internalNote: string }>
  >({});

  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getAdminDashboard,
  });
  const businesses = useQuery({
    queryKey: ['admin', 'businesses', 'pending'],
    queryFn: () => getAdminBusinesses('PENDING'),
  });
  const entrepreneurs = useQuery({
    queryKey: ['admin', 'entrepreneurs', 'pending'],
    queryFn: () => getAdminEntrepreneurRequests(),
  });
  const issues = useQuery({
    queryKey: ['admin', 'issues'],
    queryFn: getAdminIssues,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['businesses', 'mine'] }),
    ]);
  };
  const businessReview = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'approve' | 'reject';
      reason?: string;
    }) =>
      action === 'approve'
        ? approveBusiness(id)
        : rejectBusiness(id, reason ?? ''),
    onSuccess: refresh,
  });
  const entrepreneurReview = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'approve' | 'reject';
      reason?: string;
    }) =>
      action === 'approve'
        ? approveEntrepreneur(id)
        : rejectEntrepreneur(id, reason ?? ''),
    onSuccess: refresh,
  });
  const issueUpdate = useMutation({
    mutationFn: ({
      id,
      status,
      resolution,
      internalNote,
    }: {
      id: string;
      status: IssueStatus;
      resolution: string;
      internalNote: string;
    }) =>
      updateIssueStatus(id, {
        status,
        ...(status === 'RESOLVED' ? { resolution } : {}),
        ...(internalNote.trim() ? { internalNote } : {}),
      }),
    onSuccess: refresh,
  });

  const setIssueField = (
    id: string,
    field: 'resolution' | 'internalNote',
    value: string,
  ) => {
    setIssueFields((current) => ({
      ...current,
      [id]: {
        resolution: current[id]?.resolution ?? '',
        internalNote: current[id]?.internalNote ?? '',
        [field]: value,
      },
    }));
  };

  const actionFailed =
    businessReview.isError || entrepreneurReview.isError || issueUpdate.isError;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <NatureBackdrop />
      <View style={styles.content}>
        <Link href="/" asChild>
          <Button mode="text" icon="arrow-left">
            {t('nav.home')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('admin.title')}
        </Text>
        <View style={styles.actions}>
          <Link href="/admin/users" asChild>
            <Button mode="outlined">{t('admin.users')}</Button>
          </Link>
          <Link href="/admin/categories" asChild>
            <Button mode="outlined">{t('admin.categories')}</Button>
          </Link>
          <Link href="/admin/advertisements" asChild>
            <Button mode="outlined">{t('admin.advertisements')}</Button>
          </Link>
          <Link href="/admin/access" asChild>
            <Button mode="outlined">{t('admin.accessLog')}</Button>
          </Link>
        </View>
        <Text variant="titleLarge">{t('admin.overview')}</Text>
        {dashboard.isPending && (
          <Text accessibilityRole="progressbar">{t('common.loading')}</Text>
        )}
        {dashboard.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button mode="outlined" onPress={() => void dashboard.refetch()}>
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {dashboard.data && (
          <View style={styles.stats}>
            {[
              ['admin.pendingBusinesses', dashboard.data.businesses.PENDING],
              ['admin.approvedBusinesses', dashboard.data.businesses.APPROVED],
              ['admin.rejectedBusinesses', dashboard.data.businesses.REJECTED],
              [
                'admin.suspendedBusinesses',
                dashboard.data.businesses.SUSPENDED,
              ],
              [
                'admin.pendingEntrepreneurs',
                dashboard.data.pendingEntrepreneurClassifications,
              ],
              ['admin.activeAds', dashboard.data.activeAdvertisements],
              ['admin.users', dashboard.data.totalUsers],
            ].map(([label, value]) => (
              <Card key={label} mode="elevated" style={styles.statCard}>
                <Card.Content>
                  <Text variant="labelLarge">{t(String(label))}</Text>
                  <Text variant="headlineMedium">{value ?? 0}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <Text variant="titleLarge">{t('admin.businessReviews')}</Text>
        {businesses.isPending && (
          <Text accessibilityRole="progressbar">{t('common.loading')}</Text>
        )}
        {businesses.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button mode="outlined" onPress={() => void businesses.refetch()}>
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {businesses.data?.items.length === 0 && <Text>{t('admin.empty')}</Text>}
        {businesses.data?.items.map((business) => {
          const reason = businessReasons[business.id] ?? '';
          return (
            <Card key={business.id} mode="elevated">
              <Card.Content style={styles.card}>
                <Text variant="titleMedium">{business.name}</Text>
                <Text>{business.description}</Text>
                <Text>
                  {business.address}, {business.locality}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  loading={businessReview.isPending}
                  disabled={businessReview.isPending}
                  onPress={() =>
                    businessReview.mutate({
                      id: business.id,
                      action: 'approve',
                    })
                  }
                >
                  {t('admin.approve')}
                </Button>
                <Button
                  onPress={() =>
                    setBusinessReasons((current) => ({
                      ...current,
                      [business.id]: current[business.id] ?? '',
                    }))
                  }
                >
                  {t('admin.reject')}
                </Button>
              </Card.Actions>
              {businessReasons[business.id] !== undefined && (
                <Card.Content style={styles.card}>
                  <TextInput
                    label={t('admin.rejectionReason')}
                    value={reason}
                    onChangeText={(value) =>
                      setBusinessReasons((current) => ({
                        ...current,
                        [business.id]: value,
                      }))
                    }
                  />
                  <Button
                    disabled={
                      businessReview.isPending || reason.trim().length < 5
                    }
                    onPress={() =>
                      businessReview.mutate({
                        id: business.id,
                        action: 'reject',
                        reason,
                      })
                    }
                  >
                    {t('admin.reject')}
                  </Button>
                </Card.Content>
              )}
            </Card>
          );
        })}

        <Text variant="titleLarge">{t('admin.entrepreneurReviews')}</Text>
        {entrepreneurs.isError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t('common.error')}
          </Text>
        )}
        {entrepreneurs.data?.items.length === 0 && (
          <Text>{t('admin.empty')}</Text>
        )}
        {entrepreneurs.data?.items.map((request) => {
          const reason = entrepreneurReasons[request.id] ?? '';
          return (
            <Card key={request.id} mode="elevated">
              <Card.Content style={styles.card}>
                <Text variant="titleMedium">{request.business.name}</Text>
                <Text>
                  {request.business.locality} · {t('admin.requestedBy')}{' '}
                  {request.requester.displayName}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  loading={entrepreneurReview.isPending}
                  disabled={entrepreneurReview.isPending}
                  onPress={() =>
                    entrepreneurReview.mutate({
                      id: request.id,
                      action: 'approve',
                    })
                  }
                >
                  {t('admin.approve')}
                </Button>
                <Button
                  onPress={() =>
                    setEntrepreneurReasons((current) => ({
                      ...current,
                      [request.id]: current[request.id] ?? '',
                    }))
                  }
                >
                  {t('admin.reject')}
                </Button>
              </Card.Actions>
              {entrepreneurReasons[request.id] !== undefined && (
                <Card.Content style={styles.card}>
                  <TextInput
                    label={t('admin.rejectionReason')}
                    value={reason}
                    onChangeText={(value) =>
                      setEntrepreneurReasons((current) => ({
                        ...current,
                        [request.id]: value,
                      }))
                    }
                  />
                  <Button
                    disabled={
                      entrepreneurReview.isPending || reason.trim().length < 5
                    }
                    onPress={() =>
                      entrepreneurReview.mutate({
                        id: request.id,
                        action: 'reject',
                        reason,
                      })
                    }
                  >
                    {t('admin.reject')}
                  </Button>
                </Card.Content>
              )}
            </Card>
          );
        })}

        <Text variant="titleLarge">{t('admin.issues')}</Text>
        {issues.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button mode="outlined" onPress={() => void issues.refetch()}>
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {issues.data?.items.map((issue) => {
          const fields = issueFields[issue.id] ?? {
            resolution: '',
            internalNote: '',
          };
          return (
            <Card key={issue.id} mode="elevated">
              <Card.Content style={styles.card}>
                <Text variant="titleMedium">{issue.title}</Text>
                <Text>
                  {issue.reference} · {t(`issue.status.${issue.status}`)}
                </Text>
                <Text>{issue.description}</Text>
                <Text>
                  {issue.locality} · {t('admin.reporter')}{' '}
                  {issue.reporter.displayName}
                </Text>
                <TextInput
                  label={t('admin.resolution')}
                  value={fields.resolution}
                  onChangeText={(value) =>
                    setIssueField(issue.id, 'resolution', value)
                  }
                />
                <TextInput
                  label={t('admin.internalNote')}
                  value={fields.internalNote}
                  onChangeText={(value) =>
                    setIssueField(issue.id, 'internalNote', value)
                  }
                />
              </Card.Content>
              <Card.Actions>
                {nextIssueStatuses[issue.status].map((status) => (
                  <Button
                    key={status}
                    loading={issueUpdate.isPending}
                    disabled={
                      issueUpdate.isPending ||
                      (status === 'RESOLVED' &&
                        fields.resolution.trim().length < 5)
                    }
                    onPress={() =>
                      issueUpdate.mutate({
                        id: issue.id,
                        status,
                        resolution: fields.resolution,
                        internalNote: fields.internalNote,
                      })
                    }
                  >
                    {t('admin.updateStatus')} · {t(`issue.status.${status}`)}
                  </Button>
                ))}
              </Card.Actions>
            </Card>
          );
        })}
        {actionFailed && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t('admin.reviewError')}
          </Text>
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
    maxWidth: 1100,
    alignSelf: 'center',
    gap: 16,
  },
  heading: {
    color: '#0B6B4F',
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    minWidth: 145,
    flexGrow: 1,
  },
  card: {
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  state: {
    gap: 8,
  },
  error: {
    color: '#B42318',
  },
});
