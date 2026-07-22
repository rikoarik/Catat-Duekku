import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { ArrowLeft2, ArrowRight2, Calendar, CloseCircle, ArrowDown2 } from 'iconsax-react-native';
import { Text } from '@/components/ui/text';
import { getTheme } from '@/core/theme/colors';
import { parseIsoDate, toIsoDate, todayIso, formatLongDate } from '@/core/lib/dates';

interface CustomDatePickerModalProps {
  visible: boolean;
  title?: string;
  value?: string | Date;
  onConfirm: (dateIso: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function CustomDatePickerModal({
  visible,
  title = 'Pilih Tanggal',
  value,
  onConfirm,
  onClose,
}: CustomDatePickerModalProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Mode: 'day' (default grid), 'month' (month selector), 'year' (year selector)
  const [pickerMode, setPickerMode] = useState<'day' | 'month' | 'year'>('day');

  // Active view date (month/year navigation) and selected date
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedIso, setSelectedIso] = useState<string>(todayIso());

  useEffect(() => {
    if (visible) {
      const parsed = typeof value === 'string' ? parseIsoDate(value) : value;
      const initial = parsed ?? new Date();
      setViewDate(new Date(initial.getFullYear(), initial.getMonth(), 1));
      setSelectedIso(toIsoDate(initial));
      setPickerMode('day');
    }
  }, [visible, value]);

  if (!visible) return null;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Calendar calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    setSelectedIso(toIsoDate(d));
  };

  const handleSelectMonth = (monthIdx: number) => {
    setViewDate(new Date(currentYear, monthIdx, 1));
    setPickerMode('day');
  };

  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, currentMonth, 1));
    setPickerMode('day');
  };

  const handleConfirm = () => {
    onConfirm(selectedIso);
  };

  // Build grid items (prev month overflow, current month, next month overflow)
  const gridCells: { type: 'prev' | 'current' | 'next'; day: number; iso?: string }[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    gridCells.push({ type: 'prev', day: daysInPrevMonth - i });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toIsoDate(new Date(currentYear, currentMonth, d));
    gridCells.push({ type: 'current', day: d, iso });
  }

  const totalSlots = gridCells.length > 35 ? 42 : 35;
  const remaining = totalSlots - gridCells.length;
  for (let d = 1; d <= remaining; d++) {
    gridCells.push({ type: 'next', day: d });
  }

  const todayStr = todayIso();

  // Generate range of years (e.g., 2020..2035)
  const baseYear = new Date().getFullYear();
  const yearList = Array.from({ length: 16 }, (_, i) => baseYear - 5 + i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Calendar color={theme.accent} size={22} variant="Bold" />
              <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">
                {title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseCircle color={theme.textMuted} size={24} variant="Outline" />
            </TouchableOpacity>
          </View>

          {/* Month / Year Interactive Navigator */}
          <View style={[styles.navRow, { backgroundColor: theme.surfaceElement }]}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navBtn, { backgroundColor: theme.surface }]}
              activeOpacity={0.7}
            >
              <ArrowLeft2 color={theme.textPrimary} size={16} variant="Bold" />
            </TouchableOpacity>

            <View style={styles.monthYearSelectorRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.selectorBtn,
                  pickerMode === 'month' && { backgroundColor: theme.accent },
                ]}
                onPress={() => setPickerMode(pickerMode === 'month' ? 'day' : 'month')}
              >
                <Text style={[styles.monthYearText, { color: theme.textPrimary }]} weight="bold">
                  {MONTH_NAMES[currentMonth]}
                </Text>
                <ArrowDown2 color={theme.textPrimary} size={14} variant="Bold" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.selectorBtn,
                  pickerMode === 'year' && { backgroundColor: theme.accent },
                ]}
                onPress={() => setPickerMode(pickerMode === 'year' ? 'day' : 'year')}
              >
                <Text style={[styles.monthYearText, { color: theme.textPrimary }]} weight="bold">
                  {currentYear}
                </Text>
                <ArrowDown2 color={theme.textPrimary} size={14} variant="Bold" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navBtn, { backgroundColor: theme.surface }]}
              activeOpacity={0.7}
            >
              <ArrowRight2 color={theme.textPrimary} size={16} variant="Bold" />
            </TouchableOpacity>
          </View>

          {/* MODE 1: DAY CALENDAR GRID */}
          {pickerMode === 'day' && (
            <>
              {/* Day of Week Labels */}
              <View style={styles.daysHeaderRow}>
                {DAY_NAMES.map((name, idx) => (
                  <View key={name} style={styles.dayLabelCell}>
                    <Text
                      style={[
                        styles.dayLabelText,
                        { color: idx === 0 || idx === 6 ? theme.expense : theme.textMuted },
                      ]}
                      weight="semibold"
                    >
                      {name}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.gridContainer}>
                {gridCells.map((cell, index) => {
                  const isSelected = cell.type === 'current' && cell.iso === selectedIso;
                  const isToday = cell.type === 'current' && cell.iso === todayStr;
                  const isDisabled = cell.type !== 'current';

                  return (
                    <TouchableOpacity
                      key={index}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                      onPress={() => cell.type === 'current' && handleSelectDay(cell.day)}
                      style={styles.gridCell}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          isSelected && { backgroundColor: theme.accent, borderRadius: 18 },
                          isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.accent, borderRadius: 18 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isDisabled && { color: theme.textMuted, opacity: 0.3 },
                            !isDisabled && !isSelected && { color: theme.textPrimary },
                            isSelected && { color: theme.accentText },
                          ]}
                          weight={isSelected || isToday ? 'bold' : 'regular'}
                        >
                          {cell.day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* MODE 2: MONTH SELECTOR GRID */}
          {pickerMode === 'month' && (
            <View style={styles.pickerGridContainer}>
              {MONTH_NAMES.map((mName, idx) => {
                const isCurrentMonth = idx === currentMonth;
                return (
                  <TouchableOpacity
                    key={mName}
                    activeOpacity={0.75}
                    style={[
                      styles.pickerGridCell,
                      { backgroundColor: isCurrentMonth ? theme.accent : theme.surfaceElement },
                    ]}
                    onPress={() => handleSelectMonth(idx)}
                  >
                    <Text
                      style={[
                        styles.pickerGridText,
                        { color: isCurrentMonth ? theme.accentText : theme.textPrimary },
                      ]}
                      weight={isCurrentMonth ? 'bold' : 'semibold'}
                    >
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* MODE 3: YEAR SELECTOR GRID */}
          {pickerMode === 'year' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerGridContainer}
              style={{ maxHeight: 220 }}
            >
              {yearList.map((y) => {
                const isCurrentYear = y === currentYear;
                return (
                  <TouchableOpacity
                    key={y}
                    activeOpacity={0.75}
                    style={[
                      styles.pickerGridCell,
                      { backgroundColor: isCurrentYear ? theme.accent : theme.surfaceElement },
                    ]}
                    onPress={() => handleSelectYear(y)}
                  >
                    <Text
                      style={[
                        styles.pickerGridText,
                        { color: isCurrentYear ? theme.accentText : theme.textPrimary },
                      ]}
                      weight={isCurrentYear ? 'bold' : 'semibold'}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Selected Value Preview Banner */}
          <View style={[styles.selectedBanner, { backgroundColor: theme.surfaceElement }]}>
            <Text style={[styles.selectedBannerLabel, { color: theme.textMuted }]}>Terpilih:</Text>
            <Text style={[styles.selectedBannerValue, { color: theme.textPrimary }]} weight="bold">
              {formatLongDate(selectedIso)}
            </Text>
          </View>

          {/* Footer Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.actionBtn, styles.cancelBtn, { backgroundColor: theme.surfaceElement }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: theme.textPrimary }]} weight="bold">
                Batal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.actionBtn, { backgroundColor: theme.deepTeal }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: theme.onPrimary }]} weight="bold">
                Simpan Tanggal
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 32, 31, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  monthYearSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    fontSize: 14,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
  },
  pickerGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  pickerGridCell: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  pickerGridText: {
    fontSize: 13,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  selectedBannerLabel: {
    fontSize: 12,
  },
  selectedBannerValue: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {},
  btnText: {
    fontSize: 14,
  },
});
