import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

interface PinDotsProps {
  length: number;      // total number of dots (usually 6)
  filled: number;      // how many are filled
  primaryColor: string;
  emptyColor?: string;
}

export function PinDots({ length, filled, primaryColor, emptyColor = '#E5E7EB' }: PinDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <React.Fragment key={i}>
          <PinDot filled={i < filled} primaryColor={primaryColor} emptyColor={emptyColor} />
        </React.Fragment>
      ))}
    </View>
  );
}

function PinDot({
  filled,
  primaryColor,
  emptyColor,
}: {
  filled: boolean;
  primaryColor: string;
  emptyColor: string;
}) {
  const scale = useSharedValue(filled ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(filled ? 1 : 0.6, { damping: 10, stiffness: 180 });
  }, [filled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: filled ? primaryColor : emptyColor,
  }));

  return (
    <View style={styles.dotOuter}>
      <Animated.View style={[styles.dotInner, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOuter: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
