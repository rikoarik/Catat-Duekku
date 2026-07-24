import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { ArrowLeft, CpuCharge, Send2 } from 'iconsax-react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { edgeApi } from '@/core/lib/edge-api';
import { getTheme } from '@/core/theme/colors';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const suggestions = ['Pengeluaran terbesar saya apa?', 'Apakah arus kas saya sehat?', 'Berapa sisa hutang saya?'];

export default function AnalyticsChatPage() {
  const theme = getTheme(useColorScheme());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'assistant', text: 'Tanyakan kondisi keuanganmu. Aku menjawab berdasarkan ringkasan dan analitik yang tercatat di aplikasi.' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async (value = input) => {
    const question = value.trim();
    if (!question || loading) return;
    const requestId = `${messages.length}-${question}`;
    const userMessage = { id: `${requestId}-user`, role: 'user' as const, text: question };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const { data } = await edgeApi.analyticsChat(question);
      setMessages((current) => [...current, { id: `${requestId}-assistant`, role: 'assistant', text: data.answer }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI belum dapat menjawab. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Kembali" style={[styles.back, { borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Tanya AI</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Berdasarkan data di aplikasi</Text>
        </View>
        <View style={[styles.aiIcon, { backgroundColor: theme.accentSoft }]}><CpuCharge color={theme.income} size={22} variant="Bold" /></View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chat}>
        <KeyboardAwareScrollView enableOnAndroid enableAutomaticScroll={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.messages}>
            {messages.map((message) => (
              <Card key={message.id} variant={message.role === 'user' ? 'teal' : 'surface'} padding={14} borderRadius={20} style={[styles.message, message.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
                <Text style={{ color: message.role === 'user' ? theme.onSurfaceStrong : theme.textPrimary, lineHeight: 21 }}>{message.text}</Text>
              </Card>
            ))}
            {loading ? <Card variant="surface" padding={14} borderRadius={20} style={styles.assistantMessage}><ActivityIndicator color={theme.income} /></Card> : null}
          </View>
          {messages.length === 1 ? <View style={styles.suggestions}>{suggestions.map((item) => <Button key={item} title={item} variant="outline" size="small" onPress={() => send(item)} />)}</View> : null}
        </KeyboardAwareScrollView>
        <View style={[styles.composerWrap, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
          {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}
          <View style={styles.composer}>
            <View style={styles.input}><Input value={input} onChangeText={setInput} placeholder="Tanya soal keuanganmu..." maxLength={300} returnKeyType="send" onSubmitEditing={() => send()} editable={!loading} /></View>
            <Button accessibilityLabel="Kirim pertanyaan" title="" variant="lime" icon={<Send2 color={theme.deepTeal} size={20} />} disabled={!input.trim() || loading} onPress={() => send()} style={styles.send} />
          </View>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>Jawaban AI dapat keliru dan bukan nasihat keuangan profesional.</Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  title: { fontSize: 22 },
  subtitle: { fontSize: 12, marginTop: 2 },
  aiIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chat: { flex: 1 },
  content: { flexGrow: 1, padding: 20, gap: 14, justifyContent: 'flex-end' },
  messages: { gap: 10 },
  message: { maxWidth: '86%' },
  userMessage: { alignSelf: 'flex-end' },
  assistantMessage: { alignSelf: 'flex-start' },
  suggestions: { alignItems: 'flex-start', gap: 8 },
  error: { fontSize: 13 },
  composerWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, gap: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1 },
  send: { width: 52, height: 52, paddingHorizontal: 0, paddingVertical: 0 },
  disclaimer: { fontSize: 11, textAlign: 'center' },
});
