import { Text } from '@/components/ui/text';
import { useMemo, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import {
  Add,
  ArrowDown2,
  Bank,
  CardReceive,
  Category2,
  Chart,
  CloseCircle,
  WalletAdd,
} from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';
import { financeStore } from '@/core/lib/finance-store';

type FormKind = 'account' | 'budget' | 'savings' | 'debt' | 'category';
export type ManageSection = 'accounts' | 'budget' | 'savings' | 'debts' | 'categories';

interface ManageScreenProps {
  onOpen?: (section: ManageSection) => void;
}

interface AccountItem {
  name: string;
  balance: string;
}

interface SavingsItem {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
}

const INITIAL_ACCOUNTS: AccountItem[] = [
  { name: 'Cash', balance: 'Rp1.150.000' },
  { name: 'Bank', balance: 'Rp11.700.000' },
  { name: 'E-Wallet', balance: 'Rp1.850.000' },
];

const INITIAL_CATEGORIES = ['Makan', 'Transport', 'Belanja', 'Tagihan'];

const FORM_COPY: Record<FormKind, { title: string; placeholder: string }> = {
  
  account: { title: 'Tambah akun', placeholder: 'Contoh: BCA utama' },
  budget: { title: 'Atur budget', placeholder: 'Contoh: 5000000' },
  savings: { title: 'Buat target tabungan', placeholder: 'Contoh: Motor 15000000' },
  debt: { title: 'Tambah utang', placeholder: 'Contoh: Kredivo 1000000' },
  category: { title: 'Tambah kategori', placeholder: 'Contoh: Kesehatan' },
};

const SAVINGS_CARD_WIDTH = 148;
const SAVINGS_CARD_GAP = 10;

export function ManageScreen({ onOpen: _onOpen }: ManageScreenProps) {
  const theme = getTheme(useColorScheme());
  const [form, setForm] = useState<FormKind | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [savingsIndex, setSavingsIndex] = useState(0);
  const [value, setValue] = useState('');
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [budgetLimit, setBudgetLimit] = useState(5_000_000);
  const [budgetUsed] = useState(3_450_000);
  const [debt, setDebt] = useState('Tidak ada');
  const [goalsVersion, setGoalsVersion] = useState(0);

  const goals = useMemo(() => financeStore.getGoals(), [goalsVersion]);
  const savingsItems: SavingsItem[] = goals.length
    ? goals
    : [{ id: 'empty', name: 'Tambah target', targetAmount: 0, savedAmount: 0 }];
  const budgetRemaining = Math.max(budgetLimit - budgetUsed, 0);
  const budgetPercent = budgetLimit > 0 ? Math.min(Math.round((budgetUsed / budgetLimit) * 100), 100) : 0;

  const openForm = (kind: FormKind) => {
    setValue('');
    setForm(kind);
  };

  const closeForm = () => setForm(null);

  const saveForm = () => {
    const next = value.trim();
    if (!next || !form) return;

    if (form === 'account') {
      setAccounts((items) => [...items, { name: next, balance: 'Rp0' }]);
    }

    if (form === 'budget') {
      setBudgetLimit(Number(next.replace(/\D/g, '') || 0));
    }

    if (form === 'savings') {
      const match = next.match(/^(.+?)\s+(\d[\d.]*)$/);
      if (match) {
        financeStore.createGoal({
          name: match[1].trim(),
          targetAmount: Number(match[2].replace(/\./g, '')),
        });
        setSavingsIndex(0);
        setGoalsVersion((current) => current + 1);
      }
    }

    if (form === 'debt') {
      const match = next.match(/^(.+?)\s+(\d[\d.]*)$/);
      if (match) {
        financeStore.createDebt({
          name: match[1].trim(),
          totalAmount: Number(match[2].replace(/\./g, '')),
        });
        setDebt(match[1].trim());
      }
    }

    if (form === 'category') {
      setCategories((items) => [...items, next]);
    }

    closeForm();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} layout={LinearTransition.springify()} style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Kelola</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Widget finansialmu.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(320)} layout={LinearTransition.springify()}>
          <View style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              icon={Bank}
              title="Akun"
              subtitle={`${accounts.length} akun aktif`}
              theme={theme}
              onAdd={() => openForm('account')}
            />
            <View style={styles.widgetBody}>
              {accounts.map((item) => (
                <InlineRow key={item.name} label={item.name} value={item.balance} theme={theme} />
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(110).duration(320)} layout={LinearTransition.springify()}>
          <View style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              icon={Chart}
              title="Budget bulan ini"
              subtitle={`${budgetPercent}% terpakai`}
              theme={theme}
              onAdd={() => openForm('budget')}
            />
            <View style={styles.widgetBody}>
              <View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}>
                <View style={[styles.fill, { width: `${budgetPercent}%`, backgroundColor: theme.accent }]} />
              </View>
              <InlineRow label="Terpakai" value={`Rp${budgetUsed.toLocaleString('id-ID')}`} theme={theme} />
              <InlineRow label="Sisa" value={`Rp${budgetRemaining.toLocaleString('id-ID')}`} theme={theme} />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(320)} layout={LinearTransition.springify()} style={styles.duoRow}>
          <View style={[styles.duoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              compact
              hideIcon
              icon={WalletAdd}
              title="Tabungan"
              subtitle={goals.length === 0 ? 'Belum ada' : `${savingsIndex + 1}/${savingsItems.length} target`}
              theme={theme}
              onAdd={() => openForm('savings')}
            />
            <SavingsDeck
              activeIndex={savingsIndex}
              items={savingsItems}
              onIndexChange={setSavingsIndex}
              onEmptyPress={() => openForm('savings')}
              theme={theme}
            />
          </View>

          <View style={[styles.duoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              compact
              hideIcon
              icon={CardReceive}
              title="Utang"
              subtitle={debt === 'Tidak ada' ? 'Opsional' : debt}
              theme={theme}
              onAdd={() => openForm('debt')}
            />
            <View style={styles.debtContentWrap}>
              <Text style={[styles.debtText, { color: theme.textMuted }]} numberOfLines={2}>
                {debt === 'Tidak ada' ? 'Belum ada utang aktif.' : 'Utang aktif siap dikelola.'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(320)}>
          <View style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setCategoriesOpen((current) => !current)}
              style={styles.categoryHeaderClickable}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.surfaceElement }]}>
                <Category2 color={theme.deepTeal} size={21} variant="Bold" />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.widgetTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  Kategori
                </Text>
                <Text style={[styles.widgetSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                  {`${categories.length} kategori transaksi`}
                </Text>
              </View>
              <ArrowDown2
                color={theme.textMuted}
                size={17}
                style={{ transform: [{ rotate: categoriesOpen ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {categoriesOpen && (
              <Animated.View 
                entering={FadeInDown.duration(180)} 
                exiting={FadeOutUp.duration(100)}
                style={styles.categoryBody}
              >
                <View style={styles.categoryRowContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScrollContent}
                    style={styles.categoryScrollView}
                  >
                    {categories.map((category) => (
                      <View key={category} style={[styles.chip, { backgroundColor: theme.surfaceElement }]}>
                        <Text style={[styles.chipText, { color: theme.textPrimary }]}>{category}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity 
                    onPress={() => openForm('category')} 
                    style={[styles.addChipBtn, { borderColor: theme.deepTeal }]}
                  >
                    <Add color={theme.deepTeal} size={15} variant="Bold" />
                    <Text style={[styles.addChipText, { color: theme.deepTeal }]}>Tambah</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <Modal visible={!!form} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{form ? FORM_COPY[form].title : ''}</Text>
              <TouchableOpacity onPress={closeForm} accessibilityLabel="Tutup">
                <CloseCircle color={theme.textMuted} size={24} />
              </TouchableOpacity>
            </View>
            <TextInput
              autoFocus
              value={value}
              onChangeText={setValue}
              placeholder={form ? FORM_COPY[form].placeholder : ''}
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceElement,
                },
              ]}
            />
            <TouchableOpacity
              onPress={saveForm}
              disabled={!value.trim()}
              style={[styles.save, { backgroundColor: value.trim() ? theme.deepTeal : theme.surfaceMuted }]}
            >
              <Text style={{ color: value.trim() ? theme.onPrimary : theme.textMuted, fontWeight: '800' }}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SectionHeader({
  compact = false,
  hideIcon = false,
  icon: Icon,
  onAdd,
  subtitle,
  theme,
  title,
  trailing,
}: {
  compact?: boolean;
  hideIcon?: boolean;
  icon: React.ComponentType<any>;
  onAdd: () => void;
  subtitle: string;
  theme: ReturnType<typeof getTheme>;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.widgetHeader}>
      {!hideIcon && (
        <View style={[styles.iconBox, compact && styles.compactIconBox, { backgroundColor: theme.surfaceElement }]}>
          <Icon color={theme.deepTeal} size={compact ? 18 : 21} variant="Bold" />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={[styles.widgetTitle, compact && styles.compactWidgetTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.widgetSubtitle, compact && styles.compactWidgetSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          onPress={onAdd}
          style={[styles.inlineAdd, compact && styles.compactInlineAdd, { backgroundColor: theme.surfaceElement }]}
          accessibilityLabel={`Tambah ${title}`}
        >
          <Add color={theme.deepTeal} size={compact ? 14 : 16} variant="Bold" />
        </TouchableOpacity>
        {trailing}
      </View>
    </View>
  );
}

function SavingsDeck({
  activeIndex,
  items,
  onEmptyPress,
  onIndexChange,
  theme,
}: {
  activeIndex: number;
  items: SavingsItem[];
  onEmptyPress: () => void;
  onIndexChange: (index: number) => void;
  theme: ReturnType<typeof getTheme>;
}) {
  const handleNext = () => {
    onIndexChange((activeIndex + 1) % items.length);
  };

  return (
    <View style={styles.deckWrap}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={items.length > 1 ? handleNext : (items[0]?.id === 'empty' ? onEmptyPress : undefined)}
        style={styles.stackedCarouselContainer}
      >
        {items.map((item, index) => {
          // Hitung relative offset terhadap activeIndex
          const position = (index - activeIndex + items.length) % items.length;
          // Tampilkan 3 kartu teratas
          if (position > 2) return null;

          const itemProgress = item.targetAmount > 0 ? Math.min(item.savedAmount / item.targetAmount, 1) : 0;

          // ReactBits 3D Depth transform values (Scale, translateY, opacity, zIndex)
          const scale = 1 - position * 0.08;
          const translateY = position * 12;
          const opacity = 1 - position * 0.22;
          const zIndex = items.length - position;

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.reactBitsCard,
                {
                  backgroundColor: position === 0 ? theme.deepTeal : theme.surfaceElement,
                  borderColor: theme.border,
                  borderWidth: position === 0 ? 0 : 1,
                  zIndex,
                  opacity,
                  transform: [
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.deckTitle,
                  { color: position === 0 ? theme.onPrimary : theme.textPrimary },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.deckValue,
                  { color: position === 0 ? theme.accent : theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {item.targetAmount > 0 ? `Rp${item.targetAmount.toLocaleString('id-ID')}` : 'Buat target'}
              </Text>
              <View
                style={[
                  styles.deckTrack,
                  { backgroundColor: position === 0 ? 'rgba(255,255,255,0.18)' : theme.surfaceMuted },
                ]}
              >
                <View
                  style={[
                    styles.deckFill,
                    {
                      width: `${itemProgress * 100}%`,
                      backgroundColor: position === 0 ? theme.accent : theme.deepTeal,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          );
        })}
      </TouchableOpacity>

      {items.length > 1 && (
        <View style={styles.dots}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onIndexChange(index)}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? theme.deepTeal : theme.border,
                  width: index === activeIndex ? 14 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function InlineRow({
  label,
  theme,
  value,
}: {
  label: string;
  theme: ReturnType<typeof getTheme>;
  value: string;
}) {
  return (
    <View style={styles.inlineRow}>
      <Text style={[styles.inlineLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.inlineValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110, gap: 12 },
  header: { gap: 6, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  widget: { borderWidth: 1, borderRadius: 28, padding: 16, gap: 8 },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  widgetBody: { gap: 10, paddingTop: 2 },
  iconBox: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  widgetTitle: { fontSize: 17, fontWeight: '800' },
  compactWidgetTitle: { fontSize: 14, fontWeight: '800' },
  widgetSubtitle: { fontSize: 12 },
  compactWidgetSubtitle: { fontSize: 11 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineAdd: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compactInlineAdd: { width: 28, height: 28, borderRadius: 14 },
  compactIconBox: { width: 34, height: 34, borderRadius: 12 },
  duoRow: { flexDirection: 'row', gap: 12 },
  duoCard: { flex: 1, aspectRatio: 1, borderWidth: 1, borderRadius: 26, padding: 14, justifyContent: 'space-between' },
  debtContentWrap: { flex: 1, justifyContent: 'center' },
  stackedCarouselContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    marginTop: 6,
  },
  reactBitsCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between'
  },
  deckWrap: { flex: 1, justifyContent: 'space-between' },
  deckTitle: { fontSize: 14, fontWeight: '800' },
  deckValue: { fontSize: 11, fontWeight: '700' },
  deckTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  deckFill: { height: '100%', borderRadius: 999 },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  dot: { height: 5, borderRadius: 3 },
  debtText: { fontSize: 12, lineHeight: 17 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineLabel: { fontSize: 13, fontWeight: '600' },
  inlineValue: { fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700' },
  categoryScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryScrollView: {
    flex: 1,
  },
  categoryHeaderClickable: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryBody: { paddingTop: 6, overflow: 'hidden' },
  addChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  addChipText: { fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7, 32, 31, 0.46)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 15 },
  save: { height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
