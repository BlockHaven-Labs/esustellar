import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export function LoadingSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const SkeletonItem = () => (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.header}>
        <View style={styles.titlePlaceholder} />
        <View style={styles.badgePlaceholder} />
      </View>
      <View style={styles.row}>
        <View>
          <View style={styles.amountPlaceholder} />
          <View style={styles.metaPlaceholder} />
        </View>
        <View style={[styles.metaPlaceholder, { width: 80 }]} />
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    height: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titlePlaceholder: {
    height: 20,
    width: '60%',
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
  },
  badgePlaceholder: {
    height: 24,
    width: 60,
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  amountPlaceholder: {
    height: 24,
    width: 100,
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
    marginBottom: 8,
  },
  metaPlaceholder: {
    height: 14,
    width: 60,
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
  },
});
