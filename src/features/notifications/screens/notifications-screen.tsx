import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ArrowLeft, Calendar, Chart, Notification, Receipt, TickCircle } from 'iconsax-react-native';
import { router } from 'expo-router';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { edgeApi, type ApiNotification } from '@/core/lib/edge-api';
import { getTheme, type ThemeColors } from '@/core/theme/colors';

type NotificationFilter = 'Semua' | 'Penting' | 'Keuangan' | 'Sistem';
type NotificationKind = Exclude<NotificationFilter, 'Semua'>;

type NotificationItem = ApiNotification & { kind: NotificationKind };

const FILTERS: NotificationFilter[] = ['Semua', 'Penting', 'Keuangan', 'Sistem'];

function iconFor(item: NotificationItem, theme: ThemeColors) {
  const props = { size: 21, variant: 'Outline' as const };
  if (item.id === 'budget') return <Chart {...props} color={theme.warning} />;
  if (item.id === 'debt') return <Calendar {...props} color={theme.expense} />;
  if (item.id === 'transaction') return <Receipt {...props} color={theme.income} />;
  if (item.id === 'sync') return <TickCircle {...props} color={theme.income} />;
  return <Notification {...props} color={theme.primary} />;
}

export function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [filter, setFilter] = useState<NotificationFilter>('Semua');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingPush, setTestingPush] = useState(false);
  const visibleItems = useMemo(() => filter === 'Semua' ? items : items.filter((item) => item.kind === filter), [filter, items]);
  useEffect(() => {
    edgeApi.notifications().then(({ data }) => {
      setItems(data.items);
      setUnreadCount(data.unread_count);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat notifikasi.')).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await edgeApi.markNotificationRead(id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  };
  const markAllRead = async () => {
    await edgeApi.markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  };
  const testPush = async () => {
    setTestingPush(true);
    try {
      await edgeApi.sendTestPush();
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Kembali" activeOpacity={0.7} style={[styles.backButton, { borderColor: theme.border }]} onPress={() => router.back()}>
            <ArrowLeft color={theme.textPrimary} size={22} variant="Outline" />
          </TouchableOpacity>
          {unreadCount > 0 ? (
            <TouchableOpacity accessibilityRole="button" onPress={markAllRead}>
              <Text style={[styles.markAll, { color: theme.primary }]}>Tandai semua dibaca</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Notifikasi</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{unreadCount ? `${unreadCount} informasi baru menunggu kamu` : 'Semua informasi sudah dibaca'}</Text>
          <Button title={testingPush ? 'Mengirim…' : 'Kirim notifikasi uji'} variant="secondary" size="small" disabled={testingPush} onPress={testPush} style={styles.testButton} />
        </View>

        <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: active }} activeOpacity={0.75} style={[styles.filter, { backgroundColor: active ? theme.primary : theme.cardBackground, borderColor: active ? theme.primary : theme.border }]} onPress={() => setFilter(item)}>
                <Text style={[styles.filterText, { color: active ? theme.onPrimary : theme.textSecondary }]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {loading ? <Text style={{ color: theme.textMuted }}>Memuat notifikasi...</Text> : null}
          {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}
          {visibleItems.map((item) => (
            <TouchableOpacity key={item.id} accessibilityRole="button" activeOpacity={0.78} onPress={() => markRead(item.id)}>
              <Card variant={item.read ? 'default' : 'surface'} padding={16} style={[styles.card, { borderColor: item.read ? theme.border : theme.accent, borderWidth: 1 }]}>
                <View style={[styles.icon, { backgroundColor: item.read ? theme.surfaceButton : theme.cardBackground }]}>{iconFor(item, theme)}</View>
                <View style={styles.copy}>
                  <View style={styles.itemHeader}>
                    <Text numberOfLines={2} style={[styles.itemTitle, { color: theme.textPrimary }]} weight="bold">{item.title}</Text>
                    {!item.read ? <View style={[styles.unreadDot, { backgroundColor: theme.expense }]} /> : null}
                  </View>
                  <Text style={[styles.message, { color: theme.textSecondary }]}>{item.message}</Text>
                  <View style={styles.meta}>
                    <Text style={[styles.action, { color: theme.primary }]} weight="bold">{item.action ?? ''}</Text>
                    <Text style={[styles.time, { color: theme.textMuted }]}>{new Date(item.created_at).toLocaleString('id-ID')}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {!visibleItems.length ? (
            <Card variant="default" style={styles.empty}>
              <Notification color={theme.textMuted} size={30} variant="Outline" />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]} weight="bold">Belum ada notifikasi</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Informasi untuk kategori ini akan muncul di sini.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  markAll: { fontSize: 12, fontWeight: '800' },
  titleSection: { marginTop: 24, marginBottom: 22 },
  title: { fontSize: 28, lineHeight: 36 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  testButton: { alignSelf: 'flex-start', marginTop: 14 },
  filters: { gap: 8, paddingBottom: 22 },
  filter: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 16, height: 38, justifyContent: 'center' },
  filterText: { fontSize: 12, fontWeight: '800' },
  list: { gap: 12 },
  card: { flexDirection: 'row', gap: 13, boxShadow: 'none' },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 19 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  message: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  action: { fontSize: 11 },
  time: { fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 34 },
  emptyTitle: { fontSize: 15, marginTop: 12 },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
