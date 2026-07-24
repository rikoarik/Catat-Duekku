import { Text } from '@/components/ui/text';
import { getTheme } from '@/core/theme/colors';
import * as Haptics from 'expo-haptics';
import {
  ArrowUp,
  CardReceive,
  Chart,
  Eye,
  EyeSlash,
  MoneyChange,
  MoneyRecive,
  WalletAdd,
} from 'iconsax-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
;

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

const BASE_ITEMS_CONFIG = [
  {
    id: '1',
    title: 'Pemasukan',
    type: 'income' as const,
    color: '#0A3331',
    bgColor: '#A3E635',
    icon: 'income' as const,
  },
  {
    id: '2',
    title: 'Pengeluaran',
    type: 'expense' as const,
    color: '#EA580C',
    bgColor: '#F1B8A3',
    icon: 'expense' as const,
  },
  {
    id: '3',
    title: 'Surplus',
    type: 'savings' as const,
    color: '#854D0E',
    bgColor: '#FACC15',
    icon: 'savings' as const,
  },
  {
    id: '4',
    title: 'Sisa Utang',
    type: 'debt' as const,
    color: '#D906AB',
    bgColor: '#FE9CCD',
    icon: 'debt' as const,
  },
  {
    id: '5',
    title: 'Sisa Budget',
    type: 'budget' as const,
    color: '#0369A1',
    bgColor: '#38BDF8',
    icon: 'budget' as const,
  },
];

export function SavingsBalanceSection({
  totalBalance = 0,
  protectedBalance = 0,
  freeBalance = 0,
  monthlyIncomeChange = 0,
  monthlyExpense = 0,
  remainingDebt = 0,
  safeToSpend = 0,
  budgetTarget = 0,
  percentChange = 0,
  valuesVisible = false,
  onToggleValues,
}: any) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const netSavings = Math.max(0, monthlyIncomeChange - Math.abs(monthlyExpense));
  const remainingBudget = Math.max(0, safeToSpend);

  const ITEMS: TargetOrDebtItem[] = BASE_ITEMS_CONFIG.map((item) => {
    let currentAmount = 0;
    let targetAmount = 0;

    switch (item.type) {
      case 'income':
        currentAmount = monthlyIncomeChange;
        targetAmount = monthlyIncomeChange;
        break;
      case 'expense':
        currentAmount = Math.abs(monthlyExpense);
        targetAmount = monthlyIncomeChange > 0 ? monthlyIncomeChange : Math.abs(monthlyExpense);
        break;
      case 'savings':
        currentAmount = netSavings;
        targetAmount = totalBalance > 0 ? totalBalance : netSavings;
        break;
      case 'debt':
        currentAmount = remainingDebt;
        targetAmount = remainingDebt;
        break;
      case 'budget':
        currentAmount = remainingBudget;
        targetAmount = budgetTarget > 0 ? budgetTarget : remainingBudget;
        break;
    }

    return {
      ...item,
      currentAmount,
      targetAmount,
    };
  });

  const [selectedItemId, setSelectedItemId] = useState<string>('2');

  const lastTickIndexRef = useRef(-1);
  const STRIPE_STEP = 6;
  const ITEM_WIDTHS: { [key: string]: number } = {
    '1': 140,
    '2': 210,
    '3': 115,
    '4': 175,
    '5': 90,
  };

  const getItemWidth = (id: string) => ITEM_WIDTHS[id] ?? 120;
  const singleSetWidth = ITEMS.reduce((acc, item) => acc + getItemWidth(item.id), 0);

  const itemOffsets = ITEMS.map((item, index) => {
    const start = ITEMS.slice(0, index).reduce((total, entry) => total + getItemWidth(entry.id), 0);
    const width = getItemWidth(item.id);
    return { ...item, width, start, end: start + width };
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const LOOPED_ITEMS = [...ITEMS, ...ITEMS, ...ITEMS];

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: singleSetWidth, animated: false });
    }, 50);
  }, [singleSetWidth]);

  const handleScroll = (event: any) => {
    const currentX = event.nativeEvent.contentOffset.x;

    const stripeIndex = Math.round(currentX / STRIPE_STEP);
    if (stripeIndex !== lastTickIndexRef.current) {
      lastTickIndexRef.current = stripeIndex;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const modX = (currentX + 160) % singleSetWidth;
    const currentActiveItem = itemOffsets.find((item: { start: number; end: number; id: string }) => modX >= item.start && modX < item.end);

    if (currentActiveItem && currentActiveItem.id !== selectedItemId) {
      setSelectedItemId(currentActiveItem.id);
      void Haptics.selectionAsync();
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    const currentX = event.nativeEvent.contentOffset.x;
    if (currentX < singleSetWidth * 0.3) {
      scrollViewRef.current?.scrollTo({ x: currentX + singleSetWidth, animated: false });
    } else if (currentX > singleSetWidth * 2.3) {
      scrollViewRef.current?.scrollTo({ x: currentX - singleSetWidth, animated: false });
    }
  };

  const toggleEye = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleValues?.();
  };

  const formatCurrency = (amount: number) => {
    if (!valuesVisible) return '••••••••';
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
            accessibilityRole="button"
            accessibilityLabel={valuesVisible ? 'Sembunyikan semua angka' : 'Tampilkan semua angka'}
            accessibilityState={{ expanded: valuesVisible }}
            onPress={toggleEye}>
            {valuesVisible ? (
              <Eye color={theme.textMuted} size={18} variant="Linear" />
            ) : (
              <EyeSlash color={theme.textMuted} size={18} variant="Linear" />
            )}
          </TouchableOpacity>
        </View>


      </View>

      {/* Amount Text */}
      <Text style={[styles.amountText, { color: theme.textPrimary }]} accessibilityLabel={`Saldo kotor ${formatCurrency(totalBalance)}`}>
        {formatCurrency(totalBalance)}
      </Text>

      <Text style={{ color: theme.textMuted }}>Terlindungi {formatCurrency(protectedBalance)} · Bebas {formatCurrency(freeBalance)}</Text>

      <View style={styles.changeRow}>
        <ArrowUp color="#10B981" size={14} variant="Bold" />
        <Text style={styles.changeAmountText}>
          {formatCurrency(monthlyIncomeChange)}
        </Text>
        <Text style={styles.percentText}>{valuesVisible ? `(${percentChange}%)` : '(••%)'}</Text>
      </View>

      {/* Meter Bar Spectrum */}
      <View style={styles.spectrumCardWrapper}>
        <View style={styles.rulerContainer}>
          {/* Fixed Center Indicator Pin & Icon (Pill Indicator) */}
          <View style={styles.fixedCenterPointer}>
            <View style={[styles.centerIconBadge, { backgroundColor: selectedItem.bgColor }]}>
              {renderIcon(selectedItem.icon, selectedItem.color)}
            </View>
            <View style={[styles.centerPointerPin, { backgroundColor: selectedItem.color }]} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            horizontal
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={8}
            decelerationRate={0.988}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollableSpectrumContent}>
            <View style={styles.meterStripesContainer}>
              {LOOPED_ITEMS.map((item, itemIdx) => {
                const isSelected = item.id === selectedItemId;
                const segmentWidth = getItemWidth(item.id);
                const ticksCount = Math.floor(segmentWidth / STRIPE_STEP);

                return (
                  <View key={`${item.id}-${itemIdx}`} style={[styles.rulerSegment, { width: segmentWidth }]}>
                    <View style={styles.segmentStripesRow}>
                      {Array.from({ length: ticksCount }).map((_, i) => {
                        const isCenterTick = i === Math.floor(ticksCount / 2);
                        const isMajorTick = i % 5 === 0;

                        const randomPattern = [26, 38, 20, 42, 24, 46, 28, 36, 22, 34];
                        const stripeHeight = isCenterTick ? 46 : isMajorTick ? 36 : randomPattern[i % randomPattern.length];

                        return (
                          <View key={i} style={[styles.stripeTickCell, { width: STRIPE_STEP }]}>
                            <View
                              style={[
                                styles.fineStripe,
                                {
                                  backgroundColor: item.color,
                                  height: stripeHeight,
                                  opacity: isSelected ? 1 : 0.8,
                                },
                              ]}
                            />
                          </View>
                        );
                      })}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.rulerSegmentLabel, { color: isSelected ? item.color : theme.textMuted }]}
                    >
                      {item.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Card Detail dengan Pattern Sejajar & Tanpa Kedip */}
        <AnimatedDetailCard
          formatCurrency={formatCurrency}
          valuesVisible={valuesVisible}
          isDark={isDark}
          selectedItem={selectedItem}
          theme={theme}
        />
      </View>
    </View>
  );
}

function AnimatedDetailCard({ selectedItem, valuesVisible, isDark, theme, formatCurrency }: any) {
  const progressWidth = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const percent = selectedItem.targetAmount > 0
    ? Math.min(Math.round((selectedItem.currentAmount / selectedItem.targetAmount) * 100), 100)
    : 100;

  useEffect(() => {
    cardScale.value = withSequence(
      withSpring(1.02, { damping: 12, stiffness: 250 }),
      withSpring(1, { damping: 16, stiffness: 200 })
    );

    progressWidth.value = 0;
    progressWidth.value = withTiming(percent, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [cardScale, percent, progressWidth, selectedItem.id]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` }));

  const isDebt = selectedItem.type === 'debt';
  const isIncome = selectedItem.type === 'income';

  const badgeBg = selectedItem.bgColor;
  const accentColor = selectedItem.color;

  const leftLabel = isDebt
    ? 'Telah Terbayar'
    : isIncome
      ? 'Pemasukan Bulan Ini'
      : selectedItem.type === 'expense'
        ? 'Total Pengeluaran'
        : selectedItem.type === 'savings'
          ? 'Estimasi Tabungan'
          : 'Sisa Anggaran';

  const rightLabel = isDebt
    ? 'Total Utang'
    : selectedItem.type === 'expense'
      ? 'Batas Pemasukan'
      : selectedItem.type === 'savings'
        ? 'Total Saldo Utama'
        : 'Total Pemasukan';

  const showProgress = selectedItem.targetAmount > 0 && selectedItem.currentAmount !== selectedItem.targetAmount;

  return (
    <Animated.View
      style={[
        styles.detailCard,
        {
          backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF',
          borderColor: isDark ? theme.border : '#E2E8F0',
        },
        cardAnimStyle,
      ]}>
      {/* Header Info */}
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleRow}>
          <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.typeBadgeText, { color: accentColor }]}>
              {selectedItem.title}
            </Text>
          </View>
        </View>
        {showProgress ? (
          <View style={[styles.percentPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Text style={[styles.detailPercent, { color: accentColor }]}>
              {valuesVisible ? `${percent}%` : '••%'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Amounts Grid */}
      <View style={styles.amountGridRow}>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabelText, { color: theme.textMuted }]}>{leftLabel}</Text>
          <Text style={[styles.amountValueText, { color: theme.textPrimary }]}>
            {formatCurrency(selectedItem.currentAmount)}
          </Text>
        </View>
        {showProgress ? (
          <View style={[styles.amountCol, styles.amountColRight]}>
            <Text style={[styles.amountLabelText, { color: theme.textMuted }]}>{rightLabel}</Text>
            <Text style={[styles.amountValueText, { color: theme.textPrimary }]}>
              {formatCurrency(selectedItem.targetAmount)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Progress Bar Track */}
      {showProgress ? (
        <View style={[styles.detailProgressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
          <Animated.View
            style={[
              styles.detailProgressBarFill,
              { backgroundColor: accentColor },
              progressAnimStyle,
            ]}
          />
        </View>
      ) : null}
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
    gap: 14,
  },
  rulerContainer: {
    position: 'relative',
    height: 150,
    justifyContent: 'center',
  },
  fixedCenterPointer: {
    position: 'absolute',
    left: '50%',
    top: 0,
    marginTop: -15,
    marginLeft: -16,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  centerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPointerPin: {
    width: 3,
    height: 18,
    borderRadius: 1.5,
    marginTop: 3,
  },
  scrollableSpectrumContent: {
    paddingHorizontal: 80,
    paddingTop: 50,
    paddingBottom: 8,
  },
  meterStripesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rulerSegment: {
    alignItems: 'center',
    gap: 4,
  },
  segmentStripesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  stripeTickCell: {
    alignItems: 'center',
  },
  rulerSegmentLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  fineStripe: {
    width: 2,
    borderRadius: 1,
  },
  detailCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  percentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailPercent: {
    fontSize: 13,
    fontWeight: '900',
  },
  amountGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amountCol: {
    gap: 2,
  },
  amountColRight: {
    alignItems: 'flex-end',
  },
  amountLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountValueText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
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
});