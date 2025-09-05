import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import { TextInput, Button, Text, ActivityIndicator, Chip } from "react-native-paper";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StyleSheet, View } from "react-native";
import { useSnackbar } from "../configs/Contexts";
import { api, endpoints } from "../configs/Apis";
import { TargetType } from "../configs/Types";

const SATISFY_OPTIONS = [
  { value: "VERY_BAD", label: "Rất tệ" },
  { value: "BAD", label: "Tệ" },
  { value: "NORMAL", label: "Bình thường" },
  { value: "GOOD", label: "Tốt" },
  { value: "EXCELLENT", label: "Xuất sắc" },
];

export type FeedbackSheetRef = {
  /** Truyền luôn id và type khi mở để tạo mới */
  open: (targetId: number, targetType: TargetType) => void;
  /** Mở ở chế độ đã có feedback -> load data để chỉnh sửa + hiện nút XÓA */
  openExists: (targetId: number, targetType: TargetType) => void;
  close: () => void;
};

type Props = {
  onSubmitted?: () => void;
};

const FeedbackSheet = forwardRef<FeedbackSheetRef, Props>(function FeedbackSheet(
  { onSubmitted },
  ref
) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%"], []);
  const { showSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [satisfy, setSatisfy] = useState<string | null>(null);

  const [feedbackId, setFeedbackId] = useState<number>(-1);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("");

  /** true -> đang chỉnh sửa feedback đã tồn tại (hiện nút XÓA) */
  const [existing, setExisting] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (id, type) => {
      setTargetId(id);
      setTargetType(type);
      setExisting(false);
      // dọn form
      setContent("");
      setSatisfy(null);
      sheetRef.current?.expand();
    },
    openExists: (id, type) => {
      setTargetId(id);
      setTargetType(type);
      setExisting(true);
      sheetRef.current?.expand();
    },
    close: () => {
      sheetRef.current?.close();
      // dọn form
      setContent("");
      setSatisfy(null);
      setLoading(false);
      setExisting(false);
    },
  }));

  /** Lấy feedback hiện có để fill form khi existing = true */
  const getFeedback = async () => {
    if (!targetType || targetId == null) return;
    try {
      setLoading(true);
      const res = await api.get(endpoints.feedbacks, {
        params: {
          target_type: targetType,
          target_id: targetId,
        },
      });
      setContent(res.data?.content ?? "");
      setSatisfy(res.data?.satisfy_level ?? null);
      setFeedbackId(res.data?.id);
    } catch (err: any) {
      console.error(err);
      showSnackbar("Không tải được phản hồi hiện có", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (existing === true) {
      getFeedback();
    }
  }, [existing]);

  /** Tạo phản hồi mới */
  const postFeedback = async () => {
    if (targetType === "MOOD_ENTRY" && targetId != null) {
      return api.post(endpoints.feedbackMoodEntry(targetId), {
        content,
        satisfy_level: satisfy,
      });
    }
    else if (targetType === "MESSAGE" && targetId != null) {
      return api.post(endpoints.feedbackMessage(targetId), {
        content,
        satisfy_level: satisfy,
      });
    }
  };

  /** Cập nhật phản hồi hiện có */
  const updateFeedback = async () => {
    if (feedbackId > 0) {
      await api.put(endpoints.feedback(feedbackId), {
        content,
        satisfy_level: satisfy,
      });
      onSubmitted?.();
    }
  };

  /** Xóa phản hồi hiện có */
  const deleteFeedback = async () => {
    if (feedbackId > 0) {
      await api.delete(endpoints.feedback(feedbackId));
      onSubmitted?.();
    }
  };

  /** Điều kiện enable nút LƯU (áp dụng cho cả tạo mới & cập nhật) */
  const canSave =
    !loading && !!targetType && targetId != null && content.trim().length > 0;

  /** Nút LƯU ở header:
   * - existing = false  -> tạo mới (POST)
   * - existing = true   -> cập nhật (PUT)
   */
  const onSave = async () => {
    if (!targetType || targetId == null) {
      showSnackbar("Thiếu thông tin mục tiêu phản hồi", "error");
      return;
    }
    if (!content.trim()) {
      showSnackbar("Vui lòng nhập phản hồi", "error");
      return;
    }

    setLoading(true);
    try {
      if (existing) {
        await updateFeedback();
        showSnackbar("Đã cập nhật phản hồi", "success");
      } else {
        await postFeedback();
        showSnackbar("Đã gửi phản hồi", "success");
      }
      onSubmitted?.();
      sheetRef.current?.close();
      // dọn form
      setContent("");
      setSatisfy(null);
      setExisting(false);
    } catch (err) {
      console.error(err);
      showSnackbar(existing ? "Lỗi khi cập nhật phản hồi" : "Lỗi khi gửi phản hồi", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Nút XÓA ở dưới ô content (chỉ hiển thị khi existing = true) */
  const onDelete = async () => {
    if (!targetType || targetId == null) {
      showSnackbar("Thiếu thông tin mục tiêu phản hồi", "error");
      return;
    }
    setLoading(true);
    try {
      await deleteFeedback();
      showSnackbar("Đã xóa phản hồi", "success");
      sheetRef.current?.close();
      // dọn form
      setContent("");
      setSatisfy(null);
      setExisting(false);
    } catch (err) {
      console.error(err);
      showSnackbar("Lỗi khi xóa phản hồi", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal hostName="root_portal">
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} />
        )}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Button onPress={() => sheetRef.current?.close()} disabled={loading}>
              HỦY
            </Button>
            <Text style={styles.title}>{existing ? "Sửa phản hồi" : "Phản hồi"}</Text>

            <Button onPress={onSave} disabled={!canSave}>
              {loading ? <ActivityIndicator animating /> : "LƯU"}
            </Button>
          </View>

          <KeyboardAwareScrollView
            contentContainerStyle={styles.container}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            enableAutomaticScroll
            extraScrollHeight={96}
            keyboardOpeningTime={0}
          >
            {/* Phân loại phản hồi */}
            <Text style={styles.sectionLabel}>Mức độ hài lòng</Text>
            <View style={styles.row}>
              {SATISFY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={satisfy === opt.value}
                  onPress={() => setSatisfy(opt.value)}
                  style={[
                    styles.chip,
                    satisfy === opt.value && { backgroundColor: "#3498db22" },
                  ]}
                  selectedColor="#3498db"
                  disabled={loading}
                >
                  {opt.label}
                </Chip>
              ))}
            </View>

            {/* Nội dung phản hồi */}
            <Text style={styles.sectionLabel}>Nội dung phản hồi</Text>
            <TextInput
              placeholder="Nhập phản hồi của bạn..."
              value={content}
              onChangeText={setContent}
              multiline
              style={styles.input}
              mode="outlined"
              outlineStyle={{ borderRadius: 12 }}
              returnKeyType="default"
              onSubmitEditing={() => {
                if (canSave) onSave();
              }}
              editable={!loading}
            />

            {/* Nút XÓA chỉ xuất hiện khi đang sửa feedback hiện có */}
            {existing && (
              <Button
                mode="text"
                onPress={onDelete}
                disabled={loading}
                style={styles.deleteBtn}
                textColor="#e74c3c"
              >
                XÓA PHẢN HỒI
              </Button>
            )}
          </KeyboardAwareScrollView>
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
});

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  sectionLabel: { marginTop: 8, marginBottom: 6, fontWeight: "600" },
  input: {
    minHeight: 120,
    maxHeight: 260,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    borderColor: "#157dc2ff",
    borderWidth: 1,
    backgroundColor: "white",
  },
  deleteBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
});

export default React.memo(FeedbackSheet);
