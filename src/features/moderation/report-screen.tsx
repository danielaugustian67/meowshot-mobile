import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Alert } from '@/lib/alert';
import { report } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { ReportTarget } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

import { useModeration } from './actions';

// What the moderators read, in one language whatever the reporter's app is set to.
const REASONS = {
  spam: 'Spam or ads',
  cruelty: 'Animal cruelty',
  inappropriate: 'Inappropriate content',
  harassment: 'Harassment or hate',
  other: 'Other',
} as const;
type ReasonKey = keyof typeof REASONS;

// The server allows 1000 characters in all; this leaves room for the reason in front.
const DETAIL_MAX = 900;

/** A sheet to report a post, comment or account: pick a reason, optionally explain, send. */
export default function ReportScreen() {
  const theme = useTheme();
  const t = useT();
  const { confirmBlock } = useModeration();
  const params = useLocalSearchParams<{ type: ReportTarget; id: string; userId: string; username: string }>();
  const [reason, setReason] = useState<ReasonKey | null>(null);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = { POST: t.moderation.reportPost, COMMENT: t.moderation.reportComment, USER: t.moderation.reportUser }[
    params.type
  ];

  async function send() {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      const extra = detail.trim();
      await report(params.type, Number(params.id), extra ? `${REASONS[reason]}: ${extra}` : REASONS[reason]);
    } catch (e) {
      setError(errorMessage(e));
      setSending(false);
      return;
    }
    router.back();
    const author = { id: Number(params.userId), username: params.username };
    Alert.alert(t.moderation.thanksTitle, t.moderation.thanksBody, [
      { text: t.common.ok, style: 'cancel' },
      { text: t.moderation.block(author.username), style: 'destructive', onPress: () => confirmBlock(author) },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.heading}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t.moderation.reportIntro(params.username)}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {(Object.keys(REASONS) as ReasonKey[]).map((key, i) => {
          const selected = reason === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setReason(key)}
              style={({ pressed }) => [
                styles.reason,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText style={styles.reasonLabel}>{t.moderation.reasons[key]}</ThemedText>
              <SymbolView
                name={
                  selected
                    ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                    : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
                }
                size={22}
                tintColor={selected ? theme.tint : theme.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>

      <TextField
        label={t.moderation.detail}
        placeholder={t.moderation.detailPlaceholder}
        value={detail}
        onChangeText={setDetail}
        multiline
        maxLength={DETAIL_MAX}
        style={styles.detail}
      />

      <FormError message={error} />
      <Button title={t.moderation.send} onPress={send} disabled={!reason} loading={sending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  heading: { gap: Spacing.one },
  card: { borderRadius: 14, overflow: 'hidden' },
  reason: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  reasonLabel: { flex: 1 },
  detail: { minHeight: 88, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
});
