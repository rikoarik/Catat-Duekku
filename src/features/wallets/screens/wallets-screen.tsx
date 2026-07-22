import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import {
  Bank,
  Wallet2,
  MoneyArchive,
  Add,
  Eye,
  EyeSlash,
  More2,
  ArrowRight2,
  Setting4,
  Chart,
} from 'iconsax-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash';
  accountNumber?: string;
  balance: number;
  color: string;
  bgColor: string;
}

const ACCOUNTS: Account[] = [
  {
    id: '1',
    name: 'BCA Utama',
    type: 'bank',
    accountNumber: '**** 8921',
    balance: 8500000,
    color: '#0C3B3A',
    bgColor: '#DCFCE7',
  },
  {
    id: '2',
    name: 'Mandiri Payroll',
    type: 'bank',
    accountNumber: '**** 3302',
    balance: 3200000,
    color: '#1E40AF',
    bgColor: '#DBEAFE',
  },
  {
    id: '3',
    name: 'GoPay Daily',
    type: 'ewallet',
    accountNumber: '0812****9012',
    balance: 1850000,
    color: '#0369A1',
    bgColor: '#E0F2FE',
  },
  {
    id: '4',
    name: 'Uang Fisik',
    type: 'cash',
    balance: 1150000,
    color: '#92400E',
    bgColor: '#FEF3C7',
  },
];

const TYPE_LABEL: Record<Account['type'], string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
};

const TYPE_ICON = {
  bank: Bank,
  ewallet: Wallet2,
  cash: MoneyArchive,
};

// Category budget interface
interface CategoryBudget {
  name: string;
  budgetAmount: number;
  spentAmount: number;
  icon: string;
  color: string;
}

export function WalletsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';
  const [showBalance, setShowBalance] = useState(true);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  const totalBalance = ACCOUNTS.reduce((sum, a) => sum + a.balance, 0);

  // Balance tracking (Saldo Awal vs Saldo Berjalan)
  const startingBalance = 15000000; // Saldo Awal bulan ini
  const runningBalance = totalBalance; // Saldo Berjalan (real-time)
  const balanceChange = runningBalance - startingBalance;
  const balanceChangePercent = Math.round((balanceChange / startingBalance) * 100);

  // Mock budget data
  const hasBudget = true; // Set to false to show "Atur Budget" CTA
  const monthlyBudget = 5000000;
  const budgetUsed = 3450000; // Mock spending this month
  const budgetRemaining = monthlyBudget - budgetUsed;
  const budgetPercent = Math.round((budgetUsed / monthlyBudget) * 100);

  // Category budget breakdown
  const categoryBudgets: CategoryBudget[] = [
    { name: 'Transportasi', budgetAmount: 800000, spentAmount: 520000, icon: '🚗', color: '#3B82F6' },
    { name: 'Makan & Minum', budgetAmount: 1500000, spentAmount: 1230000, icon: '🍜', color: '#F59E0B' },
    { name: 'Belanja', budgetAmount: 1200000, spentAmount: 890000, icon: '🛒', color: '#8B5CF6' },
    { name: 'Hiburan', budgetAmount: 600000, spentAmount: 410000, icon: '🎬', color: '#EC4899' },
    { name: 'Lain-lain', budgetAmount: 900000, spentAmount: 400000, icon: '📦', color: '#6B7280' },
  ];

  const maskedAmount = (amount: number) =>
    showBalance ? formatCurrency(amount) : '••••••••';

  return (
    <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Akun</Text>
            <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
              {ACCOUNTS.length} akun tersimpan
            </Text>
          </View>
          <Button
            title="Tambah"
            variant="primary"
            size="small"
            icon={<Add color="#fff" size={15} />}
            onPress={() => {}}
          />
        </Animated.View>

        {/* ── Budget Management Card ── */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          {hasBudget ? (
            // Budget Progress
            <View style={[styles.budgetCard, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetTitleRow}>
                  <View style={[styles.budgetIconWrap, { backgroundColor: theme.accent + '18' }]}>
                    <Chart color={theme.accentText} size={18} variant="Bold" />
                  </View>
                  <View style={styles.budgetTitleBlock}>
                    <Text style={[styles.budgetTitle, { color: theme.textPrimary }]}>Budget Bulan Ini</Text>
                    <Text style={[styles.budgetSubtitle, { color: theme.textMuted }]}>Juli 2026</Text>
                  </View>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
                  <Setting4 color={theme.textMuted} size={20} variant="Linear" />
                </TouchableOpacity>
              </View>

              {/* Budget Progress Bar */}
              <View style={styles.budgetProgressWrap}>
                <View style={[styles.budgetProgressTrack, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Animated.View 
                    style={[
                      styles.budgetProgressFill, 
                      { 
                        width: `${budgetPercent}%`,
                        backgroundColor: budgetPercent > 90 ? '#EF4444' : budgetPercent > 70 ? '#F59E0B' : theme.accent
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.budgetProgressText, { color: theme.textMuted }]}>
                  {budgetPercent}% terpakai
                </Text>
              </View>

              {/* Budget Breakdown */}
              <View style={styles.budgetBreakdown}>
                <View style={styles.budgetBreakdownItem}>
                  <Text style={[styles.budgetBreakdownLabel, { color: theme.textMuted }]}>Terpakai</Text>
                  <Text style={[styles.budgetBreakdownValue, { color: theme.textPrimary }]}>
                    {maskedAmount(budgetUsed)}
                  </Text>
                </View>
                <View style={[styles.budgetDivider, { backgroundColor: isDark ? theme.border : '#E2E8F0' }]} />
                <View style={styles.budgetBreakdownItem}>
                  <Text style={[styles.budgetBreakdownLabel, { color: theme.textMuted }]}>Sisa</Text>
                  <Text style={[styles.budgetBreakdownValue, { color: budgetRemaining > 0 ? theme.income : theme.expense }]}>
                    {maskedAmount(budgetRemaining)}
                  </Text>
                </View>
                <View style={[styles.budgetDivider, { backgroundColor: isDark ? theme.border : '#E2E8F0' }]} />
                <View style={styles.budgetBreakdownItem}>
                  <Text style={[styles.budgetBreakdownLabel, { color: theme.textMuted }]}>Total</Text>
                  <Text style={[styles.budgetBreakdownValue, { color: theme.textPrimary }]}>
                    {maskedAmount(monthlyBudget)}
                  </Text>
                </View>
              </View>

              {/* Category Breakdown Toggle */}
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
                style={styles.categoryToggle}
              >
                <Text style={[styles.categoryToggleText, { color: theme.textSecondary }]}>
                  {showCategoryBreakdown ? 'Sembunyikan' : 'Lihat'} Breakdown Kategori
                </Text>
                <ArrowRight2 
                  color={theme.textMuted} 
                  size={16} 
                  style={{ transform: [{ rotate: showCategoryBreakdown ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {/* Category Budget List */}
              {showCategoryBreakdown && (
                <View style={styles.categoryList}>
                  {categoryBudgets.map((cat, i) => {
                    const remaining = cat.budgetAmount - cat.spentAmount;
                    const percent = Math.round((cat.spentAmount / cat.budgetAmount) * 100);
                    return (
                      <Animated.View 
                        key={cat.name} 
                        entering={FadeInDown.delay(i * 50).duration(300)}
                        style={[styles.categoryItem, { backgroundColor: isDark ? '#0A2E2D' : '#F8FAFC', borderColor: isDark ? theme.border : '#E2E8F0' }]}
                      >
                        <View style={styles.categoryHeader}>
                          <View style={styles.categoryNameRow}>
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                            <Text style={[styles.categoryName, { color: theme.textPrimary }]}>{cat.name}</Text>
                          </View>
                          <Text style={[styles.categoryPercent, { color: percent > 90 ? '#EF4444' : percent > 70 ? '#F59E0B' : theme.textMuted }]}>
                            {percent}%
                          </Text>
                        </View>
                        <View style={styles.categoryAmounts}>
                          <Text style={[styles.categorySpent, { color: theme.textMuted }]}>
                            {maskedAmount(cat.spentAmount)} dari {maskedAmount(cat.budgetAmount)}
                          </Text>
                          <Text style={[styles.categoryRemaining, { color: remaining > 0 ? theme.income : theme.expense }]}>
                            Sisa: {maskedAmount(remaining)}
                          </Text>
                        </View>
                        <View style={[styles.categoryProgressTrack, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                          <View 
                            style={[
                              styles.categoryProgressFill, 
                              { 
                                width: `${percent}%`,
                                backgroundColor: percent > 90 ? '#EF4444' : percent > 70 ? '#F59E0B' : cat.color
                              }
                            ]} 
                          />
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            // Budget Setup CTA
            <TouchableOpacity activeOpacity={0.8} onPress={() => {}}>
              <View style={[styles.budgetCTACard, { backgroundColor: isDark ? theme.surfaceMuted : theme.accentSoft, borderColor: isDark ? theme.border : theme.accent + '40' }]}>
                <View style={[styles.budgetCTAIcon, { backgroundColor: theme.accent }]}>
                  <Chart color={theme.accentText} size={22} variant="Bold" />
                </View>
                <View style={styles.budgetCTAContent}>
                  <Text style={[styles.budgetCTATitle, { color: theme.textPrimary }]}>Atur Budget Bulanan</Text>
                  <Text style={[styles.budgetCTADesc, { color: theme.textMuted }]}>
                    Kontrol pengeluaran dengan budget otomatis
                  </Text>
                </View>
                <ArrowRight2 color={theme.textMuted} size={20} />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Daftar Akun ── */}
        <Animated.View entering={FadeInUp.delay(140).duration(350)}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Daftar Akun</Text>
        </Animated.View>

        {ACCOUNTS.map((acc, i) => (
          <AccountCard
            key={acc.id}
            acc={acc}
            index={i}
            isDark={isDark}
            theme={theme}
            maskedAmount={maskedAmount}
            totalBalance={totalBalance}
          />
        ))}
      </ScrollView>
  );
}

// ── Account card ─────────────────────────────────────────────────────────────
function AccountCard({
  acc,
  index,
  isDark,
  theme,
  maskedAmount,
  totalBalance,
}: {
  acc: Account;
  index: number;
  isDark: boolean;
  theme: ReturnType<typeof getTheme>;
  maskedAmount: (n: number) => string;
  totalBalance: number;
}) {
  const Icon = TYPE_ICON[acc.type];
  const scale = useSharedValue(1);
  const percent = totalBalance > 0 ? acc.balance / totalBalance : 0;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Progress bar animated width via reanimated
  const barWidth = useSharedValue(0);
  React.useEffect(() => {
    barWidth.value = withSpring(percent, { damping: 20, stiffness: 80 });
  }, [percent]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(180 + index * 70).duration(350).springify().damping(18)}
      style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.975, { damping: 18, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 200 }); }}
        onPress={() => {}}>
        <Card
          variant={isDark ? 'surface' : 'default'}
          padding={0}
          borderRadius={20}
          style={[styles.card, { borderColor: isDark ? theme.border : '#EEF2F6' }]}>

          {/* ── Top row: icon + name + badge + more ── */}
          <View style={styles.cardTopRow}>
            <View style={[
              styles.iconBox,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : acc.bgColor },
            ]}>
              <Icon color={isDark ? '#fff' : acc.color} size={22} variant="Bold" />
            </View>

            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.textPrimary }]} numberOfLines={1}>
                {acc.name}
              </Text>
              <View style={styles.cardMetaRow}>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: isDark ? theme.surfaceMuted : acc.bgColor },
                ]}>
                  <Text style={[styles.typeBadgeText, { color: isDark ? theme.textSecondary : acc.color }]}>
                    {TYPE_LABEL[acc.type]}
                  </Text>
                </View>
                {acc.accountNumber && (
                  <Text style={[styles.accountNum, { color: theme.textMuted }]}>
                    {acc.accountNumber}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {}}
              style={styles.moreBtn}>
              <More2 color={theme.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={[styles.cardDivider, { backgroundColor: isDark ? theme.border : '#F1F5F9' }]} />

          {/* ── Bottom row: balance + percent ── */}
          <View style={styles.cardBottomRow}>
            <View>
              <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Saldo</Text>
              <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>
                {maskedAmount(acc.balance)}
              </Text>
            </View>
            <View style={styles.percentBlock}>
              <Text style={[styles.percentText, { color: isDark ? theme.textSecondary : acc.color }]}>
                {(percent * 100).toFixed(0)}%
              </Text>
              <Text style={[styles.percentSub, { color: theme.textMuted }]}>dari total</Text>
            </View>
          </View>

          {/* ── Progress bar ── */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? theme.border : '#F1F5F9' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                barStyle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : acc.color },
              ]}
            />
          </View>

        </Card>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 12,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Budget Card
  budgetCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTitleBlock: {
    gap: 2,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  budgetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  budgetProgressWrap: {
    gap: 8,
  },
  budgetProgressTrack: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: 8,
    borderRadius: 8,
  },
  budgetProgressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetBreakdownItem: {
    flex: 1,
    gap: 4,
  },
  budgetBreakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  budgetBreakdownValue: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  budgetDivider: {
    width: 1,
    height: 32,
  },

  // Budget CTA Card
  budgetCTACard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  budgetCTAIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetCTAContent: {
    flex: 1,
    gap: 2,
  },
  budgetCTATitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  budgetCTADesc: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Category Breakdown
  categoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  categoryToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryList: {
    gap: 10,
    marginTop: 4,
  },
  categoryItem: {
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryPercent: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryAmounts: {
    gap: 2,
  },
  categorySpent: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryRemaining: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryProgressTrack: {
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: 4,
    borderRadius: 4,
  },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 0,
  },

  // Account card
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  cardDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accountNum: {
    fontSize: 12,
  },
  moreBtn: {
    padding: 2,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  percentBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  percentText: {
    fontSize: 18,
    fontWeight: '900',
  },
  percentSub: {
    fontSize: 11,
  },
  progressTrack: {
    height: 4,
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  progressFill: {
    height: 4,
    borderBottomLeftRadius: 20,
    opacity: 0.7,
  },
});
