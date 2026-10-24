import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

type AppFooterProps = {
  compact?: boolean;
};

export function AppFooter({ compact = false }: AppFooterProps) {
  return (
    <View style={[styles.footer, compact && styles.compactFooter]}>
      <View style={styles.rule} />
      <View style={styles.content}>
        <Text style={styles.text}>Version 1.1.0</Text>
        <MaterialCommunityIcons
          name="leaf"
          size={14}
          color="#4F8160"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.text}>
          By Naresh Bokula · BNY Solutions Limited
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  compactFooter: {
    maxWidth: 940,
    gap: 6,
    marginTop: 8,
    paddingBottom: 0,
  },
  rule: {
    width: 54,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(61, 113, 75, 0.45)',
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 4,
  },
  text: {
    color: '#496653',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
