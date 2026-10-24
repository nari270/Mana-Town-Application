import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export function NatureBackdrop() {
  return (
    <View style={styles.backdrop} pointerEvents="none">
      <View style={styles.sunGlow} />
      <View style={styles.farHill} />
      <View style={styles.nearHill} />
      <MaterialCommunityIcons
        name="leaf"
        size={54}
        color="#78A987"
        style={styles.leafTopLeft}
      />
      <MaterialCommunityIcons
        name="leaf"
        size={34}
        color="#A4C6A1"
        style={styles.leafTopRight}
      />
      <MaterialCommunityIcons
        name="sprout"
        size={72}
        color="#6E9C78"
        style={styles.sproutLeft}
      />
      <MaterialCommunityIcons
        name="leaf"
        size={62}
        color="#5F936E"
        style={styles.leafRight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sunGlow: {
    position: 'absolute',
    top: -180,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(250, 223, 151, 0.30)',
  },
  farHill: {
    position: 'absolute',
    bottom: -260,
    left: -100,
    width: '125%',
    height: 440,
    borderRadius: 300,
    backgroundColor: 'rgba(183, 212, 175, 0.38)',
    transform: [{ rotate: '-7deg' }],
  },
  nearHill: {
    position: 'absolute',
    bottom: -330,
    right: -120,
    width: '115%',
    height: 440,
    borderRadius: 300,
    backgroundColor: 'rgba(143, 186, 146, 0.22)',
    transform: [{ rotate: '8deg' }],
  },
  leafTopLeft: {
    position: 'absolute',
    top: '12%',
    left: '8%',
    opacity: 0.42,
    transform: [{ rotate: '-35deg' }],
  },
  leafTopRight: {
    position: 'absolute',
    top: '20%',
    right: '9%',
    opacity: 0.45,
    transform: [{ rotate: '35deg' }],
  },
  sproutLeft: {
    position: 'absolute',
    bottom: '8%',
    left: '12%',
    opacity: 0.48,
    transform: [{ rotate: '-18deg' }],
  },
  leafRight: {
    position: 'absolute',
    right: '10%',
    bottom: '13%',
    opacity: 0.42,
    transform: [{ rotate: '28deg' }],
  },
});
