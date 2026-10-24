import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Divider, Menu, SegmentedButtons, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { clearSession, useSession } from './session';

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

export function ProfileMenu() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const [open, setOpen] = useState(false);
  if (!session) return null;

  const { displayName, roles } = session.user;
  const signOut = () => {
    setOpen(false);
    clearSession();
    queryClient.clear();
    router.replace('/login');
  };

  return (
    <View style={styles.anchor} pointerEvents="box-none">
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchorPosition="bottom"
        contentStyle={styles.menu}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={displayName}
            onPress={() => setOpen(true)}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </Pressable>
        }
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.name}>
            {displayName}
          </Text>
          <Text variant="labelMedium" style={styles.roles}>
            {roles.map((role) => t(`adminUsers.${role}`)).join(' · ')}
          </Text>
        </View>
        <Divider />
        <View style={styles.language}>
          <Text variant="labelMedium" style={styles.roles}>
            {t('auth.language')}
          </Text>
          <SegmentedButtons
            density="small"
            value={i18n.resolvedLanguage === 'te' ? 'te' : 'en'}
            onValueChange={(value) => void i18n.changeLanguage(value)}
            buttons={[
              { value: 'te', label: 'తెలుగు' },
              { value: 'en', label: 'English' },
            ]}
          />
        </View>
        <Divider />
        <Menu.Item
          leadingIcon="logout"
          title={t('auth.signOut')}
          onPress={signOut}
        />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 50,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#087C5D',
    elevation: 3,
    shadowColor: '#0B3B2C',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  menu: { minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 16 },
  header: { gap: 2, paddingHorizontal: 16, paddingVertical: 12 },
  name: { color: '#134B3D', fontWeight: '700' },
  roles: { color: '#5C6F68' },
  language: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
});
