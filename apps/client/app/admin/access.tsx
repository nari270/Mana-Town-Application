import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Text } from 'react-native-paper';
import { getAccessLogs, getAccessSummary } from '../../src/api';

export default function AdminAccessScreen() {
  const { t } = useTranslation();
  const summary = useQuery({
    queryKey: ['admin', 'access', 'summary'],
    queryFn: getAccessSummary,
  });
  const logs = useQuery({
    queryKey: ['admin', 'access', 'logs'],
    queryFn: () => getAccessLogs(50),
  });
  const formatTime = (value: string | null) =>
    value ? new Date(value).toLocaleString() : t('accessLog.never');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Link href="/admin" asChild>
          <Button mode="text" icon="arrow-left">
            {t('admin.title')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('accessLog.title')}
        </Text>
        {(summary.isError || logs.isError) && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                void summary.refetch();
                void logs.refetch();
              }}
            >
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {summary.data && (
          <>
            <Text>
              {t('accessLog.failedLogins')}: {summary.data.failedLogins}
            </Text>
            {summary.data.users.map((user) => (
              <Card key={user.id} mode="elevated">
                <Card.Content style={styles.card}>
                  <Text variant="titleMedium">{user.displayName}</Text>
                  <Text>
                    {user.username} · {user.roles.join(', ')}
                  </Text>
                  <Text>
                    {t('accessLog.logins')}: {user.loginCount} ·{' '}
                    {t('accessLog.requests')}: {user.requestCount}
                  </Text>
                  <Text>
                    {t('accessLog.lastLogin')}: {formatTime(user.lastLoginAt)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </>
        )}
        <Text variant="titleLarge">{t('accessLog.recent')}</Text>
        {logs.data?.items.length === 0 && <Text>{t('accessLog.empty')}</Text>}
        {logs.data?.items.map((entry) => (
          <Card key={entry.id} mode="outlined">
            <Card.Content style={styles.card}>
              <Text variant="titleSmall">
                {entry.user?.displayName ?? entry.username ?? '—'} ·{' '}
                {t(`accessLog.${entry.event}`)}
              </Text>
              {entry.event === 'REQUEST' && (
                <Text>
                  {entry.method} {entry.path} ({entry.statusCode})
                </Text>
              )}
              <Text style={styles.muted}>
                {formatTime(entry.createdAt)}
                {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#F8F9FA', padding: 20 },
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 12 },
  heading: { color: '#0B6B4F', fontWeight: '700' },
  card: { gap: 4 },
  state: { gap: 8 },
  error: { color: '#B42318' },
  muted: { color: '#5C6F68' },
});
