import { FC, memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, LayoutAnimation, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Chip, Divider, Text as PText } from "react-native-paper";

import { ProfileParamList } from "../../App";
import { NoteDetail } from "../../configs/Types";
import { api, endpoints } from "../../configs/Apis";
import { MOOD_COLOR, MOOD_LABELS } from "./NoteCard";
import MyLoadingIndicator from "../MyLoadingIndicator";
import TopBar from "../TopBar";

type NoteDetailsRoute = RouteProp<ProfileParamList, "noteDetails">;

const MAX_LINES = 6;

const NoteDetails: FC = () => {
  const { params: { id } } = useRoute<NoteDetailsRoute>();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NoteDetail | null>(null);

  // Thu gọn / mở rộng
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [measuredLines, setMeasuredLines] = useState<number | null>(null);

  const createdAtStr = useMemo(() => {
    const raw = data?.createdAt;
    if (!raw) return "—";
    try {
      const d = new Date(raw);
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "—";
    }
  }, [data?.createdAt]);

  const moodLabel = useMemo(
    () => (data?.moodLevel ? (MOOD_LABELS as any)[data.moodLevel] ?? data.moodLevel : "—"),
    [data?.moodLevel]
  );
  const moodColor = useMemo(
    () => (data?.moodLevel ? (MOOD_COLOR as any)[data.moodLevel] ?? "#7f8c8d" : "#7f8c8d"),
    [data?.moodLevel]
  );

  const otherTopics = data?.otherTopics ?? [];
  const content = (data?.content ?? "").trim();
  const hasContent = content.length > 0;

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoints.moodEntryDetail(id));
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Khi vào screen mới
  useEffect(() => {
    setExpanded(false);
    setCanExpand(false);
    setMeasuredLines(null);
    loadData();
  }, [id]);

  // Reset logic đo khi content đổi
  useEffect(() => {
    setExpanded(false);
    setCanExpand(false);
    setMeasuredLines(null);
  }, [content]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header row */}
        <View style={styles.headRow}>
          <PText style={styles.dateText}>{createdAtStr}</PText>

          <Chip
            mode="outlined"
            compact
            style={[styles.moodChip, { borderColor: moodColor }]}
            textStyle={styles.moodText(moodColor)}
          >
            {moodLabel}
          </Chip>
        </View>

        {/* Nội dung (thu gọn / mở rộng) */}
        <PText style={styles.contentTitle}>Nội dung</PText>

        <View style={styles.contentWrap}>
          {/* 1) TEXT ẨN để ĐO DÒNG: full content, KHÔNG numberOfLines */}
          {hasContent && measuredLines === null && (
            <PText
              style={[styles.contentBody, styles.hiddenMeasure]}
              // Không đặt numberOfLines ở đây để nhận đủ dòng thật
              onTextLayout={(e) => {
                const lines = e?.nativeEvent?.lines?.length ?? 0;
                setMeasuredLines(lines);
                setCanExpand(lines > MAX_LINES);
              }}
            >
              {content}
            </PText>
          )}

          {/* 2) TEXT HIỂN THỊ CHÍNH: dùng numberOfLines để thu gọn/mở rộng */}
          <PText
            style={styles.contentBody}
            numberOfLines={expanded ? undefined : MAX_LINES}
            ellipsizeMode="tail"
          >
            {hasContent ? content : "—"}
          </PText>

          {/* Nút Xem thêm / Thu gọn */}
          {canExpand && (
            <Pressable onPress={toggleExpand} style={styles.moreBtn} hitSlop={8}>
              <PText style={styles.moreText}>{expanded ? "Thu gọn" : "Xem thêm"}</PText>
            </Pressable>
          )}
        </View>

        <Divider style={styles.line} />

        {/* Main topic */}
        <View style={styles.block}>
          <PText style={styles.label}>Chủ đề chính</PText>
          <PText style={styles.value}>{data?.mainTopic || "Chưa phân loại"}</PText>
        </View>

        {/* Other topics */}
        <View style={styles.block}>
          <PText style={styles.label}>Các chủ đề phụ</PText>
          {otherTopics.length > 0 ? (
            <View style={styles.chipsWrap}>
              {otherTopics.map((t, idx) => (
                <Chip key={`${t}-${idx}`} compact style={styles.topicChip} mode="outlined">
                  {t}
                </Chip>
              ))}
            </View>
          ) : (
            <PText style={styles.value}>—</PText>
          )}
        </View>

        {/* Sentiment */}
        <View style={styles.block}>
          <PText style={styles.label}>Điểm cảm xúc</PText>
          <PText style={styles.value}>{data?.sentimentScore ?? "Chưa tính"}</PText>
        </View>
      </ScrollView>

      {loading && <MyLoadingIndicator />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, rowGap: 8 },

  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { fontSize: 12, color: "#6b7a90" },
  moodChip: { backgroundColor: "transparent", borderWidth: 1, minHeight: 28, paddingHorizontal: 10 },
  moodText: (color: string) => ({ color, fontSize: 13, lineHeight: 18, includeFontPadding: false }),

  contentTitle: { marginTop: 8, fontSize: 13, color: "#6b7a90", textTransform: "uppercase", letterSpacing: 0.3 },
  contentWrap: { marginTop: 4, position: "relative" },

  // Text hiển thị chính
  contentBody: { fontSize: 16, lineHeight: 24, color: "#0b203a", fontWeight: "500" },

  // Text ẩn để đo (không ảnh hưởng layout)
  hiddenMeasure: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    width: "100%",
    // tránh capture tap:
    // @ts-ignore
    pointerEvents: "none",
  },

  moreBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(28,133,252,0.08)",
  },
  moreText: { fontSize: 13, color: "#1c85fc", fontWeight: "600" },

  line: { marginVertical: 12, opacity: 0.12 },

  block: { marginTop: 4 },
  label: { fontSize: 12, color: "#6b7a90", textTransform: "uppercase", marginBottom: 4 },
  value: { fontSize: 14, lineHeight: 20, color: "#1c2a3a" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicChip: { borderRadius: 16, borderColor: "rgba(0,0,0,0.15)" },
});

export default memo(NoteDetails);
