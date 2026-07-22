import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { getTheme } from '@/core/theme/colors';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  destructive = false,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const theme = getTheme(useColorScheme());

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <Card variant="default" style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">
            {title}
          </Text>
          <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
          {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              variant="outline"
              disabled={busy}
              onPress={onCancel}
              style={styles.button}
            />
            <Button
              title={confirmLabel}
              variant="primary"
              disabled={busy}
              icon={busy ? <ActivityIndicator color={theme.onPrimary} size="small" /> : undefined}
              onPress={onConfirm}
              style={[styles.button, destructive && { backgroundColor: theme.expense }]}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(7, 32, 31, 0.45)',
  },
  card: {
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontSize: 21,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});
