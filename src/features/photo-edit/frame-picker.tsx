import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MOTIF_COUNT, PaperMotif } from '@/features/cats/cat-tile';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoDecoration } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

import { FramePapers, PLAIN_MOTIF } from './decoration';

/** Choosing the paper and its pattern. "Auto" keeps the cat's own, like a photo that was never edited. */
export function FramePicker({
  decoration,
  color,
  onChange,
}: {
  decoration: PhotoDecoration;
  /** The paper as it stands, to show each pattern on. */
  color: string;
  onChange: (patch: Partial<PhotoDecoration>) => void;
}) {
  const t = useT();
  return (
    <View style={styles.picker}>
      <ThemedText type="smallBold">{t.capture.framePaper}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Choice label={t.capture.frameAuto} selected={decoration.paper === undefined} onPress={() => onChange({ paper: undefined })}>
          <ThemedText type="small">{t.capture.frameAuto}</ThemedText>
        </Choice>
        {FramePapers.map((paper, i) => (
          <Choice
            key={paper}
            label={t.capture.framePaperOption(i + 1)}
            selected={decoration.paper === i}
            color={paper}
            onPress={() => onChange({ paper: i })}
          />
        ))}
      </ScrollView>

      <ThemedText type="smallBold">{t.capture.frameMotif}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Choice label={t.capture.frameAuto} selected={decoration.motif === undefined} onPress={() => onChange({ motif: undefined })}>
          <ThemedText type="small">{t.capture.frameAuto}</ThemedText>
        </Choice>
        <Choice
          label={t.capture.framePlain}
          selected={decoration.motif === PLAIN_MOTIF}
          color={color}
          onPress={() => onChange({ motif: PLAIN_MOTIF })}
        />
        {Array.from({ length: MOTIF_COUNT }, (_, i) => (
          <Choice
            key={i}
            label={t.capture.frameMotifOption(i + 1)}
            selected={decoration.motif === i}
            color={color}
            onPress={() => onChange({ motif: i })}>
            <PaperMotif id={i} />
          </Choice>
        ))}
      </ScrollView>
    </View>
  );
}

function Choice({
  label,
  selected,
  color,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        { backgroundColor: color ?? theme.backgroundElement, borderColor: selected ? theme.tint : 'transparent' },
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: { gap: Spacing.two },
  row: { gap: Spacing.two, paddingVertical: Spacing.half },
  choice: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
