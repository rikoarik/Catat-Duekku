import { Text } from '@/components/ui/text';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
;
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ArrowUp,
  MoneyRecive,
  MoneyChange,
  WalletAdd,
  CardReceive,
  Chart,
  Eye,
  EyeSlash,
} from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';
import { t } from '@/core/i18n/strings';

export interface TargetOrDebtItem {
  id: string;
  title: string;
  type: 'income' | 'expense' | 'savings' | 'debt' | 'budget';
  currentAmount: number;
  targetAmount: number;
  dueDate?: string;
  color: string;
  bgColor: string;
  icon: 'income' | 'expense' | 'savings' | 'debt' | 'budget';
}

const ITEMS: TargetOrDebtItem[] = [
  {
    id: '1',
    title: 'Pemasukan',
    type: 'income',
    currentAmount: 7500000,
    targetAmount: 10000000,
    dueDate: 'Juli 2026',
    color: '#0A3331',
    bgColor: '#A3E635',
    icon: 'income',
  },
  {
    id: '2',
    title: 'Pengeluaran',
    type: 'expense',
    currentAmount: 2430000,
    targetAmount: 5000000,
    dueDate: 'Juli 2026',
    color: '#EA580C',
    bgColor: '#FF6B35',
    icon: 'expense',
  },
  {
    id: '3',
    title: 'Tabungan',
    type: 'savings',
    currentAmount: 2500000,
    targetAmount: 10000000,
    dueDate: '2026',
    color: '#854D0E',
    bgColor: '#FACC15',
    icon: 'savings',
  },
  {
    id: '4',
    title: 'Sisa utang',
    type: 'debt',
    currentAmount: 450000,
    targetAmount: 1000000,
    dueDate: '30 Jul 2026',
    color: '#D97706',
    bgColor: '#FB923C',
    icon: 'debt',
  },
  {
    id: '5',
    title: 'Sisa budget',
    type: 'budget',
    currentAmount: 2570000,
    targetAmount: 5000000,
    dueDate: 'Juli 2026',
    color: '#0369A1',
    bgColor: '#38BDF8',
    icon: 'budget',
  },
];

export function SavingsBalanceSection({
  totalBalance = 13509570,
  monthlyIncomeChange = 3004300,
  percentChange = 12.3,
  onFilterChange,
}: any) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const [activeRange, setActiveRange] = useState<'24h' | '7d' | '30d'>('30d');
  const [selectedItemId, setSelectedItemId] = useState<string>('2');
  
  // State toggle mata
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(true);

  // Ref throttling haptic scroll
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);

  const handleScroll = (event: any) => {
    const currentX = event.nativeEvent.contentOffset.x;
    const now = Date.now();

    if (Math.abs(currentX - lastXRef.current) > 14 && now - lastTimeRef.current > 35) {
      lastXRef.current = currentX;
      lastTimeRef.current = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRangePress = (range: '24h' | '7d' | '30d') => {
    setActiveRange(range);
    onFilterChange?.(range);
  };

  const toggleEye = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBalanceVisible((prev) => !prev);
  };

  const formatCurrency = (amount: number) => {
    if (!isBalanceVisible) return '••••••••';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderIcon = (icon: TargetOrDebtItem['icon'], color: string) => {
    switch (icon) {
      case 'income': return <MoneyRecive color={color} size={18} variant="Bold" />;
      case 'expense': return <MoneyChange color={color} size={18} variant="Bold" />;
      case 'savings': return <WalletAdd color={color} size={18} variant="Bold" />;
      case 'debt': return <CardReceive color={color} size={18} variant="Bold" />;
      case 'budget': return <Chart color={color} size={18} variant="Bold" />;
      default: return <Chart color={color} size={18} variant="Bold" />;
    }
  };

  const selectedItem = ITEMS.find((i) => i.id === selectedItemId) || ITEMS[1];

  return (
    <View style={styles.container}>
      {/* Header Saldo & Eye Toggle */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleWithEyeContainer}>
          <Text style={[styles.titleLabel, { color: theme.textPrimary }]}>Saldo</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.eyeButton}
            onPress={toggleEye}>
            {isBalanceVisible ? (
              <Eye color={theme.textMuted} size={18} variant="Linear" />
            ) : (
              <EyeSlash color={theme.textMuted} size={18} variant="Linear" />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.filterPillsContainer, { backgroundColor: isDark ? theme.surfaceMuted : '#F1F5F9' }]}>
          {(['24h', '7d', '30d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              activeOpacity={0.8}
              style={[styles.rangePill, activeRange === range && styles.activeRangePill]}
              onPress={() => handleRangePress(range)}>
              <Text style={[styles.rangeText, activeRange === range ? styles.activeRangeText : { color: theme.textMuted }]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount Text */}
      <Text style={[styles.amountText, { color: theme.textPrimary }]}>
        {formatCurrency(totalBalance)}
      </Text>

      <View style={styles.changeRow}>
        <ArrowUp color="#10B981" size={14} variant="Bold" />
        <Text style={styles.changeAmountText}>
          {isBalanceVisible ? formatCurrency(monthlyIncomeChange) : '••••••'}
        </Text>
        <Text style={styles.percentText}>({percentChange}%)</Text>
      </View>

      {/* Meter Bar Spectrum */}
      <View style={styles.spectrumCardWrapper}>
        <ScrollView
          horizontal
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollableSpectrumContent}>
          
          <View style={styles.meterContainer}>
            {/* Row Item Badges */}
            <View style={styles.iconBadgesRow}>
              {ITEMS.map((item, index) => {
                const isSelected = item.id === selectedItemId;
                const leftPosition = 20 + index * 105;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.9}
                    style={[styles.itemColumn, { left: leftPosition }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedItemId(item.id);
                    }}>
                    <AnimatedItemBadge
                      bgColor={item.bgColor}
                      color={item.color}
                      icon={item.icon}
                      isSelected={isSelected}
                      renderIcon={renderIcon}
                    />
                    <AnimatedPointerPin color={item.color} isSelected={isSelected} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Gerigi Sisir */}
            <View style={styles.stripesMeterWrapper}>
              {Array.from({ length: 90 }).map((_, i) => {
                let stripeColor = '#A3E635';
                if (i > 18 && i <= 36) stripeColor = '#FF6B35';
                else if (i > 36 && i <= 54) stripeColor = '#FACC15';
                else if (i > 54 && i <= 72) stripeColor = '#FB923C';
                else if (i > 72) stripeColor = '#38BDF8';

                return (
                  <View
                    key={i}
                    style={[styles.fineStripe, { backgroundColor: stripeColor }]}
                  />
                );
              })}
            </View>

          </View>
        </ScrollView>

        {/* Card Detail dengan Pattern Sejajar & Tanpa Kedip */}
        <AnimatedDetailCard
          formatCurrency={formatCurrency}
          isDark={isDark}
          selectedItem={selectedItem}
          theme={theme}
        />
      </View>
    </View>
  );
}

function AnimatedItemBadge({ isSelected, bgColor, color, icon, renderIcon }: any) {
  const scale = useSharedValue(isSelected ? 1.15 : 1);

  useEffect(() => {
    scale.value = withTiming(isSelected ? 1.15 : 1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconBox, { backgroundColor: bgColor }, animStyle]}>
      {renderIcon(icon, color)}
    </Animated.View>
  );
}

function AnimatedPointerPin({ isSelected, color }: any) {
  const pinHeight = useSharedValue(isSelected ? 16 : 10);

  useEffect(() => {
    pinHeight.value = withTiming(isSelected ? 16 : 10, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({ height: pinHeight.value }));

  return (
    <Animated.View
      style={[
        styles.pointerPin,
        { backgroundColor: isSelected ? color : 'rgba(0,0,0,0.2)' },
        animStyle,
      ]}
    />
  );
}

function AnimatedDetailCard({ selectedItem, isDark, theme, formatCurrency }: any) {
  const progressWidth = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.04);

  const percent = Math.min(
    Math.round((selectedItem.currentAmount / selectedItem.targetAmount) * 100),
    100
  );

  useEffect(() => {
    // Animasi bounce & shadow glow mulus saat berpindah item
    cardScale.value = withSequence(
      withSpring(1.02, { damping: 12, stiffness: 250 }),
      withSpring(1, { damping: 16, stiffness: 200 })
    );

    shadowOpacity.value = withSequence(
      withTiming(0.18, { duration: 150 }),
      withTiming(0.06, { duration: 350 })
    );

    progressWidth.value = 0;
    progressWidth.value = withTiming(percent, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [selectedItem.id, percent]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` }));

  const isDebt = selectedItem.type === 'debt';
  const isIncome = selectedItem.type === 'income';
  const badgeBg = isDebt ? '#FDECEC' : isIncome ? '#E6F6EE' : '#E8F5E9';
  const accentColor = isDebt
    ? theme.expense
    : isIncome
    ? theme.income
    : '#2E7D32';

  const badgeLabel = isDebt
    ? 'Sisa Utang'
    : isIncome
    ? 'Pemasukan'
    : selectedItem.type === 'expense'
    ? 'Pengeluaran'
    : selectedItem.type === 'savings'
    ? 'Tabungan'
    : 'Budget';

  const footerLeftLabel = isDebt
    ? 'Sisa'
    : selectedItem.type === 'expense'
    ? 'Terpakai'
    : 'Tercatat';

  const footerRightLabel = isDebt
    ? 'Total'
    : selectedItem.type === 'expense'
    ? 'Budget'
    : 'Target';

  return (
    <Animated.View
      style={[
        styles.detailCard,
        {
          backgroundColor: isDark ? theme.surfaceMuted : '#F4F7F2',
          borderColor: isDark ? theme.border : '#E2E9DE',
        },
        cardAnimStyle,
      ]}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleRow}>
          <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.typeBadgeText, { color: accentColor }]}>
              {badgeLabel}
            </Text>
          </View>
          <Text style={[styles.detailTitle, { color: theme.textPrimary }]}>{selectedItem.title}</Text>
        </View>
        <Text style={[styles.detailPercent, { color: accentColor }]}>
          {percent}%
        </Text>
      </View>

      {/* Progress Bar Track & Fill */}
      <View style={[styles.detailProgressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E9DE' }]}>
        <Animated.View
          style={[
            styles.detailProgressBarFill,
            { backgroundColor: accentColor },
            progressAnimStyle,
          ]}
        />
      </View>

      <View style={styles.detailFooter}>
        <Text style={[styles.detailFooterText, { color: theme.textMuted }]}>
          {footerLeftLabel}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{formatCurrency(selectedItem.currentAmount)}</Text>
        </Text>
        <Text style={[styles.detailFooterText, { color: theme.textMuted }]}>
          {footerRightLabel}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{formatCurrency(selectedItem.targetAmount)}</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWithEyeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleLabel: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  eyeButton: {
    padding: 2,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  rangePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  activeRangePill: {
    backgroundColor: '#FF6B35',
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeRangeText: {
    color: '#FFFFFF',
  },
  amountText: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 16,
  },
  changeAmountText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  percentText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  spectrumCardWrapper: {
    marginHorizontal: -20,
    gap: 14,
  },
  scrollableSpectrumContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  meterContainer: {
    width: 520,
  },
  iconBadgesRow: {
    height: 52,
    position: 'relative',
    marginBottom: 4,
  },
  itemColumn: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 0,
    zIndex: 2,
    marginLeft: -19,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pointerPin: {
    width: 2,
    marginTop: 3,
    borderRadius: 1,
  },
  stripesMeterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 31,
    width: '100%',
  },
  fineStripe: {
    width: 2,
    height: 44,
    borderRadius: 1,
  },
  detailCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  detailPercent: {
    fontSize: 14,
    fontWeight: '900',
  },
  detailProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailFooterText: {
    fontSize: 12,
  },
});