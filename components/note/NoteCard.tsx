import React, { FC, useMemo } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Card, Text, Chip, Divider } from "react-native-paper";
import { Note } from "../../configs/Types";
import { moodMetaByCode, normalizeMood } from "../../configs/Moods";

type Props = { note: Note, navigation: any };

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

  const moodCode = normalizeMood((note as any).moodLevel);
  const moodMeta = moodCode ? moodMetaByCode[moodCode] : null;
  const otherTopics = note.otherTopics ?? [];

  return (
    <TouchableWithoutFeedback
      onPress={() => navigation.navigate("noteDetails", {
        id: note.id
      })}
    >
      <Card style={[
        styles.card,
        note.isCrisis && {
          backgroundColor: "#fff0f0",   // nền đỏ rất nhạt
          borderColor: "#fbcaca",       // viền đỏ nhạt
          shadowColor: "#e02424",       // bóng đỏ nhẹ
        },
      ]}
        mode="elevated">
        <Card.Content style={styles.content}>
          {/* Header line: date + mood badge */}
          <View style={styles.headRow}>
            <Text style={styles.dateText}>{createdAtStr}</Text>
            <Chip
              mode="outlined"
              compact
              style={[
                styles.moodChip,
                {
                  borderColor: moodMeta?.color ?? "rgba(0,0,0,0.2)",
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  minHeight: 30,
                },
              ]}
              textStyle={{
                color: moodMeta?.color ?? "#7f8c8d",
                fontSize: 13,
                lineHeight: 18,
                includeFontPadding: false,
              }}
            >
              {moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : "—"}
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
    backgroundColor: "#f7faff",     // nền xanh dương rất nhạt
    borderWidth: 1,
    borderColor: "#dbeafe",         // viền xanh nhạt
    // optional: nhẹ nhàng hơn chút về đổ bóng
    shadowColor: "#1c85fc",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
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
