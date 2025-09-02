import React, { FC, useMemo } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Card, Text, Chip, Divider } from "react-native-paper";
import { Note } from "../../configs/Types";

type Props = { note: Note, navigation: any };

export const MOOD_LABELS: Record<string, string> = {
  NEGATIVE: "Tiêu cực",
  SLIGHTLY_NEGATIVE: "Hơi tiêu cực",
  NEUTRAL: "Ổn",
  SLIGHTLY_POSITIVE: "Hơi tích cực",
  POSITIVE: "Tích cực",
};

export const MOOD_COLOR: Record<string, string> = {
  NEGATIVE: "#e74c3c",
  SLIGHTLY_NEGATIVE: "#e67e22",
  NEUTRAL: "#7f8c8d",
  SLIGHTLY_POSITIVE: "#27ae60",
  POSITIVE: "#16a085",
};

const NoteCard: FC<Props> = ({ note, navigation }) => {
  const createdAtStr = useMemo(() => {
    const raw = (note as any).createdAt;
    if (!raw) return "—";
    try {
      const d = new Date(raw);
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "—";
    }
  }, [note]);

  const moodLabel = MOOD_LABELS[note.moodLevel] ?? note.moodLevel;
  const moodColor = MOOD_COLOR[note.moodLevel] ?? "#7f8c8d";
  const otherTopics = note.otherTopics ?? [];

  return (
    <TouchableWithoutFeedback
      onPress={() => navigation.navigate("noteDetails", {
        id: note.id,
        navigation: navigation
      })}
    >
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          {/* Header line: date + mood badge */}
          <View style={styles.headRow}>
            <Text style={styles.dateText}>{createdAtStr}</Text>
            <Chip
              mode="outlined"
              compact
              style={[
                styles.moodChip,
                { borderColor: moodColor, paddingHorizontal: 10, paddingVertical: 2, minHeight: 30 }
              ]}
              textStyle={{ color: moodColor, fontSize: 13, lineHeight: 18, includeFontPadding: false }}
            >
              {moodLabel}
            </Chip>
          </View>

          {/* Short content */}
          <Text style={styles.short} numberOfLines={2} ellipsizeMode="tail">
            {note.shortContent || "—"}
          </Text>

          <Divider style={styles.line} />

          {/* Info rows */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Chủ đề chính</Text>
            <Text style={styles.value}>{note.mainTopic || "Chưa phân loại"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Các chủ đề phụ</Text>
            {otherTopics.length > 0 ? (
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
                {otherTopics.join(", ")}
              </Text>
            ) : (
              <Text style={styles.value}>—</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Điểm cảm xúc</Text>
            <Text style={styles.value}>{note.sentimentScore ?? "Chưa tính"}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    width: "100%",
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 200,
    justifyContent: "space-between",
  },

  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 12,
    color: "#6b7a90",
  }, moodChip: {
    backgroundColor: "transparent",
    borderWidth: 1,
    alignSelf: "flex-start",
  },

  short: {
    fontSize: 15,
    lineHeight: 20,
    color: "#0b203a",
    fontWeight: "600",
    marginTop: 6,
  },
  line: { marginVertical: 8, opacity: 0.15 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: "#6b7a90",
    textTransform: "uppercase",
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: "#1c2a3a",
    flex: 2,
    textAlign: "right",
  },
});

export default React.memo(NoteCard);
