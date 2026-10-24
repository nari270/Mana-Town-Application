import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Text } from 'react-native-paper';
import {
  getAdminUsers,
  getDevelopmentIdentity,
  updateAdminUserRoles,
  type AdminUser,
} from '../../src/api';

type Role = AdminUser['roles'][number]['role'];

const roles: Role[] = [
  'RESIDENT',
  'BUSINESS_OWNER',
  'WOMEN_ENTREPRENEUR',
  'ADMIN',
];

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentIdentity = getDevelopmentIdentity();
  const [roleChanges, setRoleChanges] = useState<Record<string, Role[]>>({});
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
  });
  const update = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: Role[] }) =>
      updateAdminUserRoles(id, roles),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Link href="/admin" asChild>
          <Button mode="text" icon="arrow-left">
            {t('admin.title')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('adminUsers.title')}
        </Text>
        {users.isPending && (
          <Text accessibilityRole="progressbar">{t('common.loading')}</Text>
        )}
        {users.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button mode="outlined" onPress={() => void users.refetch()}>
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {users.data?.items.map((user) => {
          const selected =
            roleChanges[user.id] ?? user.roles.map(({ role }) => role);
          const isCurrentUser = currentIdentity === user.id;
          return (
            <Card key={user.id} mode="elevated">
              <Card.Content style={styles.card}>
                <Text variant="titleMedium">{user.displayName}</Text>
                {user.email && <Text>{user.email}</Text>}
                <View style={styles.chips}>
                  {roles.map((role) => (
                    <Chip
                      key={role}
                      selected={selected.includes(role)}
                      disabled={isCurrentUser || update.isPending}
                      onPress={() =>
                        setRoleChanges((current) => ({
                          ...current,
                          [user.id]: selected.includes(role)
                            ? selected.filter((item) => item !== role)
                            : [...selected, role],
                        }))
                      }
                    >
                      {t(`adminUsers.${role}`)}
                    </Chip>
                  ))}
                </View>
                {isCurrentUser && (
                  <Text>{t('adminUsers.selfEditBlocked')}</Text>
                )}
              </Card.Content>
              {!isCurrentUser && (
                <Card.Actions>
                  <Button
                    mode="contained"
                    loading={update.isPending}
                    disabled={
                      update.isPending ||
                      selected.length === 0 ||
                      roleChanges[user.id] === undefined
                    }
                    onPress={() =>
                      update.mutate({ id: user.id, roles: selected })
                    }
                  >
                    {t('adminUsers.saveRoles')}
                  </Button>
                </Card.Actions>
              )}
            </Card>
          );
        })}
        {update.isError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t('admin.reviewError')}
          </Text>
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
    maxWidth: 1000,
    alignSelf: 'center',
    gap: 16,
  },
  heading: {
    color: '#0B6B4F',
    fontWeight: '700',
  },
  card: {
    gap: 12,
  },
  chips: {
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
