import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Text } from '@/components/ui/text';
import {
  CpuCharge,
  Home2,
  BagHappy,
  MoneyChange,
  AddCircle,
  ArrowDown2,
  TrendUp,
  Warning2,
  Lamp,
} from 'iconsax-react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { getTheme } from '@/core/theme/colors';

interface BudgetEnvelope {
  id: string;
  name: string;
  icon: 'home' | 'shopping' | 'savings';
  usedAmount: number;
  totalAmount: number;
  accentColor: string;
  accentBg: string;
  categories: string[];
  status: 'safe' | 'warning' | 'low';
}

const MONTHLY_INCOME = 8000000;

const ENVELOPES: BudgetEnvelope[] = [
  {
    id: '1',
    name: 'Kebutuhan Wajib',
    icon: 'home',
    usedAmount: 2450000,
    totalAmount: 4000000,
    accentColor: '#EA580C',
    accentBg: '#FFF7ED',
    categories: ['Makan & Harian', 'Kos', 'Transportasi'],
    status: 'safe',
  },
  {
    id: '2',
    name: 'Belanja & Lifestyle',
    icon: 'shopping',
    usedAmount: 1440000,
    totalAmount: 1600000,
    accentColor: '#D97706',
    accentBg: '#FFFBEB',
    categories: ['Belanja', 'Hiburan', 'Ngopi'],
    status: 'warning',
  },
  {
    id: '3',
    name: 'Tabungan & Masa Depan',
    icon: 'savings',
    usedAmount: 800000,
    totalAmount: 2400000,
    accentColor: '#0369A1',
    accentBg: '#F0F9FF',
    categories: ['Dana Darurat', 'Target Tabungan'],
    status: 'low',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function BudgetScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';
  const [activeMonth, setActiveMonth] = useState(6); // Juli (0-indexed)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);

  const renderEnvelopeIcon = (icon: BudgetEnvelope['icon'], color: string) => {
    switch (icon) {
      case 'home': return <Home2 color={color} size={22} variant="Bold" />;
      case 'shopping': return <BagHappy color={color} size={22} variant="Bold" />;
      case 'savings': return <MoneyChange color={color} size={22} variant="Bold" />;
    }
  };

  const getStatusChip = (status: BudgetEnvelope['status'], usedAmount: number, totalAmount: number) => {
    const pct = Math.round((usedAmount / totalAmount) * 100);
    switch (status) {
      case 'safe':
        return { icon: <TrendUp color="#059669" size={12} variant="Bold" />, label: 'Aman', bg: '#D1FAE5', color: '#059669' };
      case 'warning':
        return { icon: <Warning2 color="#D97706" size={12} variant="Bold" />, label: `${pct}% • Hampir Penuh`, bg: '#FEF3C7', color: '#D97706' };
      case 'low':
        return { icon: <Lamp color="#0369A1" size={12} variant="Bold" />, label: 'Perlu Ditingkatkan', bg: '#DBEAFE', color: '#0369A1' };
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>

      {/* 1. Header */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Alokasi Budget</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>Smart Budget Envelopes</Text>
        </View>
        <View style={[styles.aiBadge, { backgroundColor: isDark ? '#134E4A' : '#E6F4F1' }]}>
          <CpuCharge color={theme.primary} size={13} variant="Bold" />
          <Text style={[styles.aiBadgeText, { color: theme.primary }]}>AI Rekomendasi</Text>
        </View>
      </Animated.View>

      {/* 2. Month Selector */}
      <Animated.View entering={FadeInDown.delay(50).duration(350)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScrollContent}>
          {MONTHS.map((month, index) => (
            <TouchableOpacity
              key={month}
              activeOpacity={0.8}
              style={[
                styles.monthPill,
                index === activeMonth
                  ? { backgroundColor: theme.deepTeal }
                  : { backgroundColor: isDark ? theme.surfaceMuted : '#F1F5F9' },
              ]}
              onPress={() => setActiveMonth(index)}>
              <Text
                style={[
                  styles.monthText,
                  { color: index === activeMonth ? theme.onPrimary : theme.textMuted },
                ]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* 3. Income Summary Card */}
      <Animated.View entering={FadeInDown.delay(100).duration(350)}>
        <View style={[styles.incomeSummaryCard, { backgroundColor: theme.deepTeal }]}>
          <Text style={styles.incomeLabel}>PENDAPATAN {MONTHS[activeMonth].toUpperCase()} 2026</Text>
          <Text style={styles.incomeAmount}>{formatCurrency(MONTHLY_INCOME)}</Text>

          <View style={styles.incomeRemainingBadge}>
            <Text style={styles.incomeRemainingText}>✅ Tersisa untuk Dialokasikan: Rp 0</Text>
          </View>

          {/* 50/30/20 Rule Breakdown */}
          <View style={styles.ruleRow}>
            {[
              { pct: '50%', label: 'Kebutuhan', color: '#FF6B35' },
              { pct: '30%', label: 'Tabungan', color: '#38BDF8' },
              { pct: '20%', label: 'Keinginan', color: '#A3E635' },
            ].map((rule) => (
              <View key={rule.label} style={styles.ruleItem}>
                <Text style={[styles.rulePct, { color: rule.color }]}>{rule.pct}</Text>
                <Text style={styles.ruleLabel}>{rule.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* 4. AI Alert Banner */}
      <Animated.View entering={FadeInDown.delay(150).duration(350)}>
        <View style={[styles.aiAlertCard, { backgroundColor: isDark ? '#1A2E1A' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBFFA3' }]}>
          <View style={styles.aiAlertHeader}>
            <View style={styles.aiAlertIconRow}>
              <CpuCharge color="#16A34A" size={18} variant="Bold" />
              <Text style={styles.aiAlertBadgeText}>AI ALERT</Text>
            </View>
          </View>
          <Text style={[styles.aiAlertText, { color: theme.textPrimary }]}>
            Pos <Text style={{ fontWeight: '800', color: '#D97706' }}>Belanja & Lifestyle</Text> sudah{' '}
            <Text style={{ fontWeight: '800', color: '#D97706' }}>90% terpakai</Text> padahal baru pertengahan bulan. Disarankan mengerem pengeluaran hiburan 7 hari ke depan!
          </Text>
        </View>
      </Animated.View>

      {/* 5. Budget Envelope Cards */}
      <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.envelopesSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pos Anggaran</Text>
          <Text style={[styles.sectionSubtext, { color: theme.textMuted }]}>3 pos aktif</Text>
        </View>

        {ENVELOPES.map((env, index) => {
          const percent = Math.min(Math.round((env.usedAmount / env.totalAmount) * 100), 100);
          const chip = getStatusChip(env.status, env.usedAmount, env.totalAmount);

          return (
            <AnimatedEnvelopeCard
              key={env.id}
              env={env}
              percent={percent}
              chip={chip}
              index={index}
              isDark={isDark}
              theme={theme}
              formatCurrency={formatCurrency}
              renderIcon={renderEnvelopeIcon}
            />
          );
        })}
      </Animated.View>

      {/* 6. Add Envelope Button */}
      <Animated.View entering={FadeInDown.delay(350).duration(350)}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.addEnvelopeBtn, { backgroundColor: theme.deepTeal }]}>
          <AddCircle color={theme.softLime} size={20} variant="Bold" />
          <Text style={[styles.addEnvelopeBtnText, { color: theme.onPrimary }]}>
            Tambah Pos Anggaran
          </Text>
        </TouchableOpacity>
      </Animated.View>

    </ScrollView>
  );
}

function AnimatedEnvelopeCard({
  env,
  percent,
  chip,
  index,
  isDark,
  theme,
  formatCurrency,
  renderIcon,
}: {
  env: BudgetEnvelope;
  percent: number;
  chip: any;
  index: number;
  isDark: boolean;
  theme: any;
  formatCurrency: (n: number) => string;
  renderIcon: (icon: BudgetEnvelope['icon'], color: string) => React.ReactNode;
}) {
  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    progressWidth.value = withTiming(percent, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent]);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const progressBarColor =
    env.status === 'safe' ? '#10B981'
    : env.status === 'warning' ? '#F59E0B'
    : '#38BDF8';

  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 80).duration(350)}
      style={[
        styles.envelopeCard,
        {
          backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF',
          borderColor: isDark ? theme.border : '#E2E8F0',
          borderLeftColor: env.accentColor,
        },
      ]}>
      {/* Card Header */}
      <View style={styles.envelopeCardHeader}>
        <View style={styles.envelopeTitleGroup}>
          <View style={[styles.envelopeIconBox, { backgroundColor: env.accentBg }]}>
            {renderIcon(env.icon, env.accentColor)}
          </View>
          <Text style={[styles.envelopeName, { color: theme.textPrimary }]}>{env.name}</Text>
        </View>
        {/* Status chip */}
        <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
          {chip.icon}
          <Text style={[styles.statusChipText, { color: chip.color }]}>{chip.label}</Text>
        </View>
      </View>

      {/* Amount & Percentage Row */}
      <View style={styles.amountRow}>
        <Text style={[styles.usedAmount, { color: theme.textPrimary }]}>
          {formatCurrency(env.usedAmount)}{' '}
          <Text style={[styles.totalAmountText, { color: theme.textMuted }]}>/ {formatCurrency(env.totalAmount)}</Text>
        </Text>
        <Text style={[styles.percentLabel, { color: env.accentColor }]}>{percent}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: progressBarColor },
            progressAnimStyle,
          ]}
        />
      </View>

      {/* Category Tags */}
      <View style={styles.categoryTagsRow}>
        {env.categories.map((cat) => (
          <View key={cat} style={[styles.categoryTag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Text style={[styles.categoryTagText, { color: theme.textMuted }]}>{cat}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  monthScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  incomeSummaryCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  incomeLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  incomeAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  incomeRemainingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(163, 230, 53, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  incomeRemainingText: {
    color: '#A3E635',
    fontSize: 11,
    fontWeight: '700',
  },
  ruleRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 0,
  },
  ruleItem: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
  },
  rulePct: {
    fontSize: 18,
    fontWeight: '900',
  },
  ruleLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 1,
  },
  aiAlertCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  aiAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiAlertIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAlertBadgeText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiAlertText: {
    fontSize: 13,
    lineHeight: 20,
  },
  envelopesSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  sectionSubtext: {
    fontSize: 12,
  },
  envelopeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  envelopeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  envelopeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  envelopeName: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  usedAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmountText: {
    fontSize: 12,
    fontWeight: '400',
  },
  percentLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addEnvelopeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
    marginTop: 4,
  },
  addEnvelopeBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
