import { FC, memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, LayoutAnimation, TouchableWithoutFeedback } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  Card,
  Chip,
  Text as PText,
  IconButton,
  Button
} from "react-native-paper";

import { ProfileParamList } from "../../App";
import { mapNoteDetail, NoteDetail } from "../../configs/Types";
import { api, endpoints } from "../../configs/Apis";
import MyLoadingIndicator from "../common/MyLoadingIndicator";
import TopBar from "../common/TopBar";
import CreateNoteSheet, { CreateNoteSheetRef } from "./CreateNoteSheet";
import { moodMetaByCode, normalizeMood } from "../../configs/Moods";
import SharedDialog, { SharedDialogRef } from "../common/SharedDialog";
import FeedbackSheet, { FeedbackSheetRef } from "../FeedbackSheet";

type NoteDetailsRoute = RouteProp<ProfileParamList, "noteDetails">;

const MAX_LINES = 6;

const NoteDetails: FC = () => {
  const createRef = useRef<CreateNoteSheetRef>(null);
  const dialogRef = useRef<SharedDialogRef>(null);
  const feedbackRef = useRef<FeedbackSheetRef>(null);
  const {
    params: { id },
  } = useRoute<NoteDetailsRoute>();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
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

  // ⬇️ lấy mood theo cấu hình chung
  const moodCode = useMemo(
    () => normalizeMood(data?.moodLevel ?? null),
    [data?.moodLevel]
  );
  const moodMeta = moodCode ? moodMetaByCode[moodCode] : null;

  const otherTopics = data?.otherTopics ?? [];
  const content = (data?.content ?? "").trim();
  const hasContent = content.length > 0;

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoints.moodEntryDetail(id));
      const mapped = mapNoteDetail(res.data);
      console.info(mapped);
      setData(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const showDeleteConfirm = () => {
    dialogRef.current?.open({
      title: "Xác nhận xoá",
      message: "Bạn có chắc chắn muốn xoá nhật ký này không?\nCác dữ liệu liên quan cũng sẽ bị xóa theo.",
      cancelText: "HỦY",
      confirmText: "XOÁ",
      onConfirm: () => console.log("Đã xoá ✅"),
    });
  };

  useEffect(() => {
    setExpanded(false);
    setCanExpand(false);
    setMeasuredLines(null);
    loadData();
  }, [id]);

  useEffect(() => {
    setExpanded(false);
    setCanExpand(false);
    setMeasuredLines(null);
  }, [content]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  const onEdit = () => {
    try {
      createRef?.current.openForEdit({
        id: data?.id,
        content: data?.content,
        mood_level: data?.moodLevel
      });
    } catch {
      console.log("Edit action pressed");
    }
  };

  const onDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(endpoints.moodEntryDetail(id));
      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setConfirmVisible(false);
    }
  };

  const handleOpenFeedbackSheet = () => {
    if (data.canFeedback === true)
      feedbackRef.current?.open(data?.id, "MOOD_ENTRY");
    else
      feedbackRef.current?.openExists(data?.id, "MOOD_ENTRY");
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar onBack={() => navigation.goBack()} title="Chi tiết nhật ký" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never">

        <Card style={styles.card} mode="elevated">
          {/* HEADER */}
          <Card.Title
            title={"Nhật ký tâm trạng"}
            subtitle={createdAtStr}
            titleVariant="titleLarge"
            subtitleVariant="labelSmall"
            right={() => (
              <View style={styles.actions}>
                {data?.canEdit &&
                  <IconButton
                    icon="pencil"
                    onPress={onEdit}
                    accessibilityLabel="Sửa"
                    style={styles.actionBtn}
                  />
                }
                <IconButton
                  icon="delete-outline"
                  onPress={showDeleteConfirm}
                  accessibilityLabel="Xoá"
                  style={styles.actionBtn}
                />
              </View>
            )}
          />

          <Card.Content style={{ gap: 12 }}>
            <View style={styles.headRow}>
              <Chip
                mode="outlined"
                compact
                style={[
                  styles.moodChip,
                  { borderColor: moodMeta?.color ?? "rgba(0,0,0,0.2)" },
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

            {/* CONTENT */}
            <TouchableWithoutFeedback onPress={toggleExpand} accessible={false}>
              <View style={styles.contentPressWrap}>
                <PText style={styles.sectionLabel}>Nội dung</PText>

                {/* 1) TEXT ẨN để đo */}
                {hasContent && measuredLines === null && (
                  <PText
                    style={[styles.contentBody, styles.hiddenMeasure]}
                    onTextLayout={(e) => {
                      const lines = e?.nativeEvent?.lines?.length ?? 0;
                      setMeasuredLines(lines);
                      setCanExpand(lines > MAX_LINES);
                    }}
                  >
                    {content}
                  </PText>
                )}

                {/* 2) TEXT HIỂN THỊ */}
                <PText
                  style={styles.contentBody}
                  numberOfLines={expanded ? undefined : MAX_LINES}
                  ellipsizeMode="tail"
                >
                  {hasContent ? content : "—"}
                </PText>

                {canExpand && (
                  <PText style={styles.moreText}>{expanded ? "Thu gọn" : "Xem thêm"}</PText>
                )}
              </View>
            </TouchableWithoutFeedback>

            {/* ===== INSIGHT BOX (nổi bật) ===== */}
            <View style={styles.insightBox}>
              <View style={styles.insightHeader}>
                <PText style={styles.insightTitle}>✨ Dữ liệu phân loại của hệ thống</PText>
              </View>

              {/* MAIN TOPIC */}
              <View style={styles.insightSection}>
                <PText style={styles.sectionLabel}>Chủ đề chính</PText>

                {data?.mainTopic ? (
                  <Chip
                    mode="flat"
                    compact
                    style={styles.mainTopicChip}
                    textStyle={styles.mainTopicChipText}
                  >
                    {data.mainTopic}
                  </Chip>
                ) : (
                  <PText style={styles.value}>Chưa phân loại</PText>
                )}
              </View>


              {/* OTHER TOPICS */}
              <View style={styles.insightSection}>
                <PText style={styles.sectionLabel}>Các chủ đề phụ</PText>
                {otherTopics.length > 0 ? (
                  <View style={styles.chipsWrap}>
                    {otherTopics.map((t, idx) => (
                      <Chip
                        key={`${t}-${idx}`}
                        compact
                        mode="outlined"
                        style={styles.topicChip}
                        textStyle={styles.topicChipText}
                      >
                        {t}
                      </Chip>
                    ))}
                  </View>
                ) : (
                  <PText style={styles.value}>—</PText>
                )}
              </View>


              {/* SENTIMENT + ASK + BUTTON (separate row) */}
              <View style={styles.insightSection}>
                <PText style={styles.sectionLabel}>Điểm cảm xúc</PText>

                {/* Score hiển thị riêng một dòng */}
                <PText style={styles.value}>{data?.sentimentScore ?? "Chưa tính"}</PText>

                <View style={styles.askRow}>
                  <PText style={styles.askText} numberOfLines={2}>
                    Kết quả này có chính xác không?
                  </PText>

                  <Button
                    mode="text"
                    onPress={handleOpenFeedbackSheet}
                    compact
                    style={styles.linkBtn}
                    contentStyle={styles.linkBtnContent}
                    labelStyle={styles.linkBtnLabel}
                  >
                    {data?.canFeedback ?"Phản hồi" : "Xem phản hồi"}
                  </Button>
                </View>

              </View>

            </View>

          </Card.Content>
        </Card>
      </ScrollView>

      {(loading || deleting) && <MyLoadingIndicator />}

      <CreateNoteSheet
        ref={createRef}
        onCreated={() => {
          // tạo xong thì load lại chi tiết
          loadData();
        }}
      />
      <SharedDialog ref={dialogRef} />
      <FeedbackSheet ref={feedbackRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fb" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 72 }, // chừa TopBar
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f7faff",     // nền xanh dương rất nhạt
    borderWidth: 1,
    borderColor: "#dbeafe",         // viền xanh nhạt
    // optional: nhẹ nhàng hơn chút về đổ bóng
    shadowColor: "#1c85fc",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    marginBottom: 15,
  },


  actions: { 
    flexDirection: "row", 
    alignItems: "center",
    marginRight: 6,
  },
  actionBtn: { marginRight: 0 },

  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moodChip: { backgroundColor: "transparent", borderWidth: 1, minHeight: 28, paddingHorizontal: 10 },

  sectionLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7a90",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  contentBody: { fontSize: 16, lineHeight: 24, color: "#0b203a", fontWeight: "500" },

  hiddenMeasure: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    width: "100%",
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

  line: { marginVertical: 8, opacity: 0.12 },

  value: { fontSize: 14, lineHeight: 20, color: "#1c2a3a" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(28,133,252,0.35)",  // viền xanh
    backgroundColor: "rgba(28,133,252,0.10)", // nền xanh nhạt
    paddingHorizontal: 5,
  },
  topicChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  contentPressWrap: { marginTop: 4, position: "relative" },
  insightBox: {
    marginTop: 8,
    padding: 12,
    paddingBottom: 6,
    borderRadius: 12,
    backgroundColor: "rgba(28,133,252,0.06)",    // xanh nhạt
    borderWidth: 1,
    borderColor: "rgba(28,133,252,0.18)",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0b203a",
  },
  insightTagText: { fontSize: 12 },
  insightSection: {
    marginTop: 8,
  },
  mainTopicChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(28,133,252,0.12)", // nền xanh nhạt
    borderColor: "rgba(28,133,252,0.25)",
    borderWidth: 1,
    height: 32,
    paddingHorizontal: 10,
  },
  mainTopicChipText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#0b203a",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",   // value bên trái, button bên phải
    marginTop: 2,
  },

  linkBtn: {
    alignSelf: "auto",
    margin: 0,
  },

  linkBtnContent: {
    paddingHorizontal: 0,              // gọn như link
    minHeight: 28,
    margin: 0,
  },

  linkBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    // màu theo tông xanh của app
    color: "#1c85fc",
  },
  askRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  askText: {
    flex: 1,
    fontSize: 13,
    color: "#405166",
  },
});

export default memo(NoteDetails);
