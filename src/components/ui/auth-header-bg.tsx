import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

export function AuthHeaderDecorativeBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0F3D3E" stopOpacity="0.05" />
          </LinearGradient>
          <LinearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#B7E36D" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#0F3D3E" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        
        {/* Large abstract glowing circles */}
        <Circle cx="15%" cy="-5%" r="180" fill="url(#grad1)" />
        <Circle cx="90%" cy="10%" r="220" fill="url(#grad2)" />
        <Circle cx="80%" cy="65%" r="100" fill="#22C55E" opacity="0.15" />
        <Circle cx="20%" cy="75%" r="70" fill="#B7E36D" opacity="0.12" />
        
        {/* Modern abstract swooshes / waves */}
        <Path 
          d={`M -50 80 Q ${width/3} 180 ${width/1.5} 60 T ${width + 50} 140`}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2.5"
          fill="none"
        />
        <Path 
          d={`M -20 130 Q ${width/2.5} 240 ${width/1.2} 100 T ${width + 50} 200`}
          stroke="rgba(183, 227, 109, 0.12)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 4"
        />
      </Svg>

      {/* Floating Card Asset 1 (Left Tilt) */}
      <View style={styles.floatingCardLeft}>
        <View style={styles.cardInternalLine} />
        <View style={styles.cardInternalDot} />
      </View>

      {/* Floating Card Asset 2 (Center Behind) */}
      <View style={styles.floatingCardCenter}>
        <View style={styles.cardInternalLineWide} />
      </View>

      {/* Floating Card Asset 3 (Right Tilt) */}
      <View style={styles.floatingCardRight}>
        <View style={styles.cardInternalChip} />
      </View>

      {/* Floating Coins */}
      <View style={styles.floatingCoin1} />
      <View style={styles.floatingCoin2} />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingCardLeft: {
    position: 'absolute',
    top: 25,
    left: -20,
    width: 140,
    height: 90,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ rotate: '-22deg' }, { scale: 0.9 }],
    padding: 14,
    justifyContent: 'space-between',
  },
  floatingCardCenter: {
    position: 'absolute',
    top: 15,
    alignSelf: 'center',
    width: 180,
    height: 110,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(183, 227, 109, 0.3)', // Soft Lime border glow
    transform: [{ translateY: -15 }],
    padding: 16,
  },
  floatingCardRight: {
    position: 'absolute',
    top: 35,
    right: -30,
    width: 150,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    transform: [{ rotate: '24deg' }, { scale: 0.85 }],
    padding: 14,
  },
  cardInternalLine: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cardInternalLineWide: {
    width: 85,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B7E36D',
    opacity: 0.5,
  },
  cardInternalDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B7E36D',
    opacity: 0.4,
  },
  cardInternalChip: {
    width: 24,
    height: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingCoin1: {
    position: 'absolute',
    top: 120,
    left: 40,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B7E36D',
    opacity: 0.3,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#B7E36D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  floatingCoin2: {
    position: 'absolute',
    top: 110,
    right: 55,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#22C55E', // Income green
    opacity: 0.4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
});
