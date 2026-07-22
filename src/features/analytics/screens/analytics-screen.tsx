import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/text';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  FadeOutLeft,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue, 
  withTiming, 
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { ArrowUp, ArrowDown, TrendUp, CpuCharge, ArrowDown2, TickCircle } from 'iconsax-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import { edgeApi, type AnalyticsOverview } from '@/core/lib/edge-api';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_PAD = 20;
const CHART_WIDTH = SCREEN_WIDTH - CONTENT_PAD * 2 - 32; // card padding 16 each side
const CHART_HEIGHT = 150;

// ─── Real Data Helpers ────────────────────────────────────────────────────────
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WEEKDAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const CATEGORY_COLORS = ['#D65B5B', '#23835B', '#B87912', '#3B82F6', '#8B5CF6', '#F97316'];

type CategorySlice = { label: string; amount: number; pct: number; color: string };
type StatItem = { label: string; value: string; sub: string; color: string };

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

function buildMonthBuckets(anchor = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - 6 + index, 1);
    return {
      key: monthKey(date),
      label: MONTHS_SHORT[date.getMonth()],
      income: 0,
      expense: 0,
    };
  });
}

function getDeltaLabel(current: number, previous: number) {
  if (previous === 0) return current === 0 ? '0%' : 'Baru';
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`;
}

// ─── SVG Arc Helpers ──────────────────────────────────────────────────────────
const DONUT_SIZE = 160;
const DONUT_STROKE = 28;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  'worklet';
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  'worklet';
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// ─── Chart Helpers ────────────────────────────────────────────────────────────
function normalizeData(data: number[], height: number) {
  'worklet';
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05;
  const range = max - min;
  return range === 0 ? data.map(() => height / 2) : data.map((val) => height - ((val - min) / range) * height);
}

function buildSmoothPath(data: number[], width: number, height: number): string {
  const normalized = normalizeData(data, height);
  const xStep = width / (data.length - 1);
  
  if (normalized.length === 0) return '';
  
  let path = `M ${0} ${normalized[0]}`;
  
  for (let i = 0; i < normalized.length - 1; i++) {
    const x1 = i * xStep;
    const y1 = normalized[i];
    const x2 = (i + 1) * xStep;
    const y2 = normalized[i + 1];
    
    // Control points for smooth Bezier curve
    const cpx1 = x1 + (x2 - x1) / 3;
    const cpy1 = y1;
    const cpx2 = x1 + (2 * (x2 - x1)) / 3;
    const cpy2 = y2;
    
    path += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  
  return path;
}

function buildSmoothAreaPath(data: number[], width: number, height: number): string {
  const line = buildSmoothPath(data, width, height);
  return `${line} L ${width.toFixed(1)} ${height} L 0 ${height} Z`;
}

function getDataPoints(data: number[], width: number, height: number) {
  const normalized = normalizeData(data, height);
  const xStep = width / (data.length - 1);
  return normalized.map((y, i) => ({ x: i * xStep, y }));
}

// ─── Animated Chart Components ────────────────────────────────────────────────
function AnimatedDonutArc({ arc, delay }: { arc: any; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const sweep = (arc.endAngle - arc.startAngle) * progress.value;
    const path = describeArc(DONUT_SIZE / 2, DONUT_SIZE / 2, DONUT_RADIUS, arc.startAngle, arc.startAngle + sweep);
    return { d: path };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={arc.color}
      strokeWidth={DONUT_STROKE}
      fill="none"
      strokeLinecap="round"
    />
  );
}

function AnimatedLine({ path, color, delay }: { path: string; color: string; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) })
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: interpolate(progress.value, [0, 1], [1000, 0], Extrapolate.CLAMP),
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={path}
      stroke={color}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1000"
    />
  );
}

function AnimatedDataDot({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.3, { duration: 250, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(1, { duration: 150 })
      )
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    return {
      r: scale.value * 4,
    };
  });

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={x}
      cy={y}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth="2"
    />
  );
}

function AnimatedBarColumn({ val, index, maxVal, isLast, theme, isDark, month }: any) {
  const heightProgress = useSharedValue(0);

  useEffect(() => {
    heightProgress.value = withDelay(
      index * 80,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const pctHeight = (val / maxVal) * 100;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      height: `${pctHeight * heightProgress.value}%`,
    };
  });

  return (
    <Animated.View 
      style={styles.barCol}
      entering={FadeInDown.delay(index * 60).duration(300)}
    >
      <Text style={[styles.barValue, { color: isLast ? theme.accent : theme.textMuted }]}>
        {val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${(val / 1000).toFixed(0)}rb`}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
        <Animated.View
          style={[
            styles.barFill,
            animatedStyle,
            {
              backgroundColor: isLast ? theme.accent : '#10B981',
              opacity: isLast ? 1 : 0.5,
            },
          ]}
        />
      </View>
      <Text style={[styles.barLabel, { color: theme.textMuted }]}>{month}</Text>
    </Animated.View>
  );
}

export function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'arus-kas' | 'tabungan' | 'kategori'>('kategori');
  const [server, setServer] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState<'7m' | '3m' | '1m'>('7m');
  const [periodModalOpen, setPeriodModalOpen] = useState(false);

  const PERIOD_OPTIONS: { key: '7m' | '3m' | '1m'; label: string; monthsCount: number }[] = [
    { key: '7m', label: '7 bulan', monthsCount: 7 },
    { key: '3m', label: '3 bulan', monthsCount: 3 },
    { key: '1m', label: '1 bulan', monthsCount: 1 },
  ];

  const currentPeriodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? '7 bulan';
  const filterMonthsCount = PERIOD_OPTIONS.find((p) => p.key === period)?.monthsCount ?? 7;

  useEffect(() => {
    setLoading(true);
    setError('');
    edgeApi.analytics(period).then(({ data }) => setServer(data)).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat analitik.');
    }).finally(() => setLoading(false));
  }, [period]);

  const fullMonthBuckets = server?.monthly_buckets.map((bucket) => ({ key: bucket.month, label: bucket.label, income: bucket.income, expense: bucket.expense })) ?? [];
  const monthBuckets = fullMonthBuckets.slice(-filterMonthsCount);

  const currentBucket = monthBuckets[monthBuckets.length - 1];
  const previousBucket = monthBuckets[monthBuckets.length - 2];

  const incomeSeries = monthBuckets.map((b) => b.income);
  const expenseSeries = monthBuckets.map((b) => b.expense);
  const netSavingsSeries = monthBuckets.map((b) => b.income - b.expense);

  const incomeDeltaLabel = getDeltaLabel(currentBucket?.income ?? 0, previousBucket?.income ?? 0);
  const expenseDeltaLabel = getDeltaLabel(currentBucket?.expense ?? 0, previousBucket?.expense ?? 0);
  const netSavings = (currentBucket?.income ?? 0) - (currentBucket?.expense ?? 0);
  const monthLabel = server?.month_label ?? '';
  const categorySlices = server?.category_slices.map((slice) => ({ label: slice.label, amount: slice.amount, pct: slice.percentage, color: slice.color })) ?? [];
  const hasTransactions = server?.monthly_buckets.some((bucket) => bucket.income !== 0 || bucket.expense !== 0) ?? false;

  const incomePath = buildSmoothPath(incomeSeries, CHART_WIDTH, CHART_HEIGHT);
  const expensePath = buildSmoothPath(expenseSeries, CHART_WIDTH, CHART_HEIGHT);
  const incomeArea = buildSmoothAreaPath(incomeSeries, CHART_WIDTH, CHART_HEIGHT);
  const expenseArea = buildSmoothAreaPath(expenseSeries, CHART_WIDTH, CHART_HEIGHT);

  const incomePoints = getDataPoints(incomeSeries, CHART_WIDTH, CHART_HEIGHT);
  const expensePoints = getDataPoints(expenseSeries, CHART_WIDTH, CHART_HEIGHT);

  const GAP_DEG = 3;
  const arcs = (() => {
    const total = categorySlices.reduce((sum, c) => sum + c.pct, 0) || 1;
    return categorySlices.map((cat, index) => {
      const start = categorySlices.slice(0, index).reduce((sum, item) => sum + item.pct / total * 360, 0);
      return { ...cat, startAngle: start, endAngle: start + cat.pct / total * 360 - GAP_DEG };
    });
  })();

  const quickStats: StatItem[] = server ? [
    server.quick_stats.busiest_weekday && { label: 'Hari Tersibuk', value: server.quick_stats.busiest_weekday, sub: '', color: '#D65B5B' },
    server.quick_stats.largest_category && { label: 'Kategori Terbesar', value: server.quick_stats.largest_category, sub: '', color: CATEGORY_COLORS[0] },
    server.quick_stats.quietest_week && { label: 'Minggu Paling Hemat', value: `Minggu ${server.quick_stats.quietest_week}`, sub: '', color: '#23835B' },
    { label: 'Transaksi Tercatat', value: String(server.quick_stats.expense_transaction_count), sub: 'pengeluaran bulan ini', color: '#0F3D3E' },
  ].filter(Boolean) as StatItem[] : [];
  const insightMessage = server?.insight ?? '';

  const renderPeriodModal = () => (
    <Modal transparent visible={periodModalOpen} animationType="fade" onRequestClose={() => setPeriodModalOpen(false)}>
      <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={() => setPeriodModalOpen(false)}>
        <View style={[styles.periodModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.periodModalTitle, { color: theme.textPrimary }]} weight="bold">
            Pilih Rentang Waktu
          </Text>
          <View style={styles.periodOptionsList}>
            {PERIOD_OPTIONS.map((item) => {
              const isSelected = period === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  style={[
                    styles.periodOptionItem,
                    {
                      backgroundColor: isSelected ? theme.surfaceElement : theme.backgroundSecondary,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    setPeriod(item.key);
                    setPeriodModalOpen(false);
                  }}
                >
                  <Text style={[styles.periodOptionText, { color: theme.textPrimary }]} weight={isSelected ? 'bold' : 'medium'}>
                    {item.label}
                  </Text>
                  {isSelected && <TickCircle color={theme.primary} size={20} variant="Bold" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
      <View>
        <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Analitik</Text>
        <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>{monthLabel}</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setPeriodModalOpen(true)}
        style={[styles.periodBadge, { backgroundColor: isDark ? theme.surfaceMuted : '#F1F5F9' }]}
      >
        <Text style={[styles.periodText, { color: theme.primary }]}>{currentPeriodLabel}</Text>
        <ArrowDown2 color={theme.primary} size={14} variant="Bold" />
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <KeyboardAwareScrollView
        enableOnAndroid
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, styles.emptyContent]}
      >
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
        {renderPeriodModal()}
      </KeyboardAwareScrollView>
    );
  }
  if (error && !server) {
    return (
      <KeyboardAwareScrollView
        enableOnAndroid
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, styles.emptyContent]}
      >
        {renderHeader()}
        <View style={styles.emptyState}>
          <Text style={{ color: theme.expense }}>{error}</Text>
        </View>
        {renderPeriodModal()}
      </KeyboardAwareScrollView>
    );
  }
  if (!hasTransactions) {
    return (
      <>
        <KeyboardAwareScrollView
          enableOnAndroid
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, styles.emptyContent]}
        >
          {renderHeader()}

          <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
              <TrendUp color={theme.accentText} size={26} variant="Bold" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Belum ada analitik</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Catat beberapa transaksi terlebih dahulu. Ringkasan pemasukan, pengeluaran, dan kategori akan muncul di sini.</Text>
          </Animated.View>
        </KeyboardAwareScrollView>
        {renderPeriodModal()}
      </>
    );
  }

  return (
    <>
      <KeyboardAwareScrollView
        enableOnAndroid
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        {renderHeader()}

      {/* ── Summary KPI Cards ── */}
      <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          <View style={styles.kpiIconWrap}>
            <ArrowUp color="#23835B" size={14} variant="Bold" />
          </View>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Pemasukan</Text>
          <Text style={[styles.kpiAmount, { color: theme.textPrimary }]}>{formatCurrency(currentBucket.income)}</Text>
          <View style={[styles.kpiBadge, { backgroundColor: '#E6F6EE' }]}>
            <Text style={[styles.kpiBadgeText, { color: '#23835B' }]}>{incomeDeltaLabel}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          <View style={styles.kpiIconWrap}>
            <ArrowDown color="#D65B5B" size={14} variant="Bold" />
          </View>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Pengeluaran</Text>
          <Text style={[styles.kpiAmount, { color: theme.textPrimary }]}>{formatCurrency(currentBucket.expense)}</Text>
          <View style={[styles.kpiBadge, { backgroundColor: '#FDECEC' }]}>
            <Text style={[styles.kpiBadgeText, { color: '#D65B5B' }]}>{expenseDeltaLabel}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          <View style={styles.kpiIconWrap}>
            <TrendUp color={theme.accent} size={14} variant="Bold" />
          </View>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Nabung</Text>
          <Text style={[styles.kpiAmount, { color: theme.textPrimary }]}>{formatCurrency(netSavings)}</Text>
          <View style={[styles.kpiBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.kpiBadgeText, { color: theme.accentText }]}>{monthLabel}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Chart Type Selector ── */}
      <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[styles.tabRow, { backgroundColor: isDark ? theme.surfaceMuted : '#F1F5F9' }]}>
        {[
          { id: 'kategori', label: 'Kategori' },
          { id: 'arus-kas', label: 'Arus Kas' },
          { id: 'tabungan', label: 'Tabungan' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.8}
            style={[styles.tabPill, activeTab === tab.id && { backgroundColor: theme.deepTeal }]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? theme.onPrimary : theme.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* ── Category Donut Chart ── */}
      {activeTab === 'kategori' && (
        <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)}>
          <View style={[styles.chartCard, styles.glassCard, { backgroundColor: isDark ? 'rgba(12,59,58,0.6)' : 'rgba(255,255,255,0.6)', borderColor: isDark ? 'rgba(30,82,80,0.3)' : 'rgba(212,227,215,0.3)', borderWidth: 1 }]}>
            <View style={styles.chartHeaderRow}>
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Pengeluaran per Kategori</Text>
              <Text style={[styles.chartSubtitle, { color: theme.textMuted }]}>{monthLabel}</Text>
            </View>

            {categorySlices.length === 0 ? (
              <Text style={[styles.emptyHint, { color: theme.textMuted }]}>Belum ada pengeluaran bulan ini.</Text>
            ) : (
              <View style={styles.donutRow}>
                <View style={styles.donutWrap}>
                  <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
                    {arcs.map((arc, i) => (
                      <AnimatedDonutArc key={arc.label} arc={arc} delay={i * 100} />
                    ))}
                  </Svg>
                  <View style={styles.donutCenter}>
                    <Text style={[styles.donutTotalLabel, { color: theme.textMuted }]}>Total</Text>
                    <Text style={[styles.donutTotalValue, { color: theme.textPrimary }]}>
                      {formatCurrency(categorySlices.reduce((s, c) => s + c.amount, 0))}
                    </Text>
                  </View>
                </View>

                <View style={styles.donutLegend}>
                  {categorySlices.map((cat, i) => (
                    <Animated.View
                      key={cat.label}
                      style={styles.legendItem}
                      entering={FadeInRight.delay(i * 80 + 400).duration(300)}
                    >
                      <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                      <View style={styles.legendTextWrap}>
                        <Text style={[styles.legendLabel, { color: theme.textPrimary }]} numberOfLines={1}>{cat.label}</Text>
                        <Text style={[styles.legendPct, { color: cat.color }]}>{cat.pct}%</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Income vs Expense Line Chart ── */}
      {activeTab === 'arus-kas' && (
        <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)}>
          <View style={[styles.chartCard, styles.glassCard, { backgroundColor: isDark ? 'rgba(12,59,58,0.6)' : 'rgba(255,255,255,0.6)', borderColor: isDark ? 'rgba(30,82,80,0.3)' : 'rgba(212,227,215,0.3)', borderWidth: 1 }]}>
            <View style={styles.chartHeaderRow}>
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Pemasukan vs Pengeluaran</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.inlineLegend}><View style={[styles.legendDot, { backgroundColor: '#23835B' }]} /><Text style={[styles.legendSmallText, { color: theme.textMuted }]}>Pemasukan</Text></View>
              <View style={styles.inlineLegend}><View style={[styles.legendDot, { backgroundColor: '#D65B5B' }]} /><Text style={[styles.legendSmallText, { color: theme.textMuted }]}>Pengeluaran</Text></View>
            </View>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 24} style={{ marginTop: 12 }}>
              <Defs>
                <LinearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#23835B" stopOpacity="0.28" />
                  <Stop offset="0.5" stopColor="#23835B" stopOpacity="0.12" />
                  <Stop offset="1" stopColor="#23835B" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#D65B5B" stopOpacity="0.20" />
                  <Stop offset="0.5" stopColor="#D65B5B" stopOpacity="0.08" />
                  <Stop offset="1" stopColor="#D65B5B" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <Line
                  key={t}
                  x1="0"
                  y1={t * CHART_HEIGHT}
                  x2={CHART_WIDTH}
                  y2={t * CHART_HEIGHT}
                  stroke={isDark ? '#1E3A3A' : '#F1F5F9'}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}
              <Path d={incomeArea} fill="url(#incGrad)" />
              <Path d={expenseArea} fill="url(#expGrad)" />
              <AnimatedLine path={incomePath} color="#23835B" delay={0} />
              <AnimatedLine path={expensePath} color="#D65B5B" delay={200} />
              {incomePoints.map((pt, i) => (
                <AnimatedDataDot key={`inc-${i}`} x={pt.x} y={pt.y} color="#23835B" delay={1200 + i * 60} />
              ))}
              {expensePoints.map((pt, i) => (
                <AnimatedDataDot key={`exp-${i}`} x={pt.x} y={pt.y} color="#D65B5B" delay={1400 + i * 60} />
              ))}
              {monthBuckets.map((bucket, i) => (
                <SvgText
                  key={bucket.key}
                  x={(i * CHART_WIDTH) / (monthBuckets.length - 1)}
                  y={CHART_HEIGHT + 16}
                  fontSize="10"
                  fontWeight="600"
                  fill={isDark ? '#64748B' : '#94A3B8'}
                  textAnchor="middle"
                >
                  {bucket.label}
                </SvgText>
              ))}
            </Svg>
          </View>
        </Animated.View>
      )}

      {/* ── Savings Bar Chart ── */}
      {activeTab === 'tabungan' && (
        <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)}>
          <View style={[styles.chartCard, styles.glassCard, { backgroundColor: isDark ? 'rgba(12,59,58,0.6)' : 'rgba(255,255,255,0.6)', borderColor: isDark ? 'rgba(30,82,80,0.3)' : 'rgba(212,227,215,0.3)', borderWidth: 1 }]}>
            <View style={styles.chartHeaderRow}>
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Tabungan Bersih Bulanan</Text>
            </View>
            <View style={styles.barRow}>
              {netSavingsSeries.map((val, i) => {
                const maxVal = Math.max(...netSavingsSeries, 0);
                const isLast = i === netSavingsSeries.length - 1;
                return (
                  <AnimatedBarColumn
                    key={i}
                    val={val}
                    index={i}
                    maxVal={maxVal}
                    isLast={isLast}
                    theme={theme}
                    isDark={isDark}
                    month={monthBuckets[i].label}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── AI Insight Card ── */}
      {categorySlices.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <View style={[styles.insightCard, styles.glassCard, { backgroundColor: isDark ? 'rgba(13,43,31,0.7)' : 'rgba(240,253,244,0.7)', borderColor: isDark ? 'rgba(22,101,52,0.4)' : 'rgba(187,247,208,0.4)' }]}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconWrap}>
                <CpuCharge color="#23835B" size={15} variant="Bold" />
              </View>
              <Text style={styles.insightBadge}>INSIGHT BULAN INI</Text>
            </View>
            <Text style={[styles.insightText, { color: theme.textPrimary }]}>
              {insightMessage}
            </Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.insightBtn}>
              <Text style={styles.insightBtnText}>Tanya AI</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : null}

      {/* ── Quick Stats ── */}
      {quickStats.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(260).duration(350)}>
          <View style={[styles.statsCard, styles.glassCard, { backgroundColor: isDark ? 'rgba(12,59,58,0.6)' : 'rgba(255,255,255,0.6)', borderColor: isDark ? 'rgba(30,82,80,0.3)' : 'rgba(212,227,215,0.3)' }]}>
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Statistik Bulan Ini</Text>
            <View style={styles.statsGrid}>
              {quickStats.map((item) => (
                <View key={item.label} style={[styles.statItem, { backgroundColor: isDark ? 'rgba(10,46,45,0.5)' : 'rgba(248,250,252,0.5)' }]}>
                  <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.statSub, { color: theme.textMuted }]}>{item.sub}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

    </KeyboardAwareScrollView>
      {renderPeriodModal()}
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyHint: {
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 16,
    textAlign: 'center',
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
    fontWeight: '500',
    marginTop: 2,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 32, 31, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  periodModalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    gap: 16,
  },
  periodModalTitle: {
    fontSize: 18,
  },
  periodOptionsList: {
    gap: 10,
  },
  periodOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  periodOptionText: {
    fontSize: 14,
  },

  // ── KPI Cards ──
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  kpiAmount: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  kpiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // ── Tab Selector ──
  tabRow: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Chart Card ──
  glassCard: {
    overflow: 'hidden',
  },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Donut Chart ──
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutWrap: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  donutTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  donutLegend: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },

  // ── Line Chart Legend ──
  legendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inlineLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSmallText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Bar Chart ──
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
  },
  barTrack: {
    width: 24,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ── AI Insight ──
  insightCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(22,163,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBadge: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 20,
  },
  insightBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  insightBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Quick Stats ──
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statSub: {
    fontSize: 11,
    fontWeight: '500',
  },
});
