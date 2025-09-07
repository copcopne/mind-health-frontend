import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import { Text, Button, TextInput, ActivityIndicator } from "react-native-paper";
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Animated,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { api, endpoints } from "../../configs/Apis";
import { useSnackbar } from "../../configs/Contexts";
import { MOOD_OPTIONS } from "../../configs/Moods";
import WarningDialog from "../common/WarningDialog";

type Mood = "VERY_BAD" | "BAD" | "NORMAL" | "GOOD" | "EXCELLENT";

export type CreateNoteSheetRef = {
  open: () => void;
  close: () => void;
  openWithMood?: (m: Mood) => void;
  openForEdit: (note: { id: number; content: string; mood_level: Mood }) => void;
};

type Props = {
  onCreated?: () => void;
  onUpdated?: () => void;
};

const CreateNoteSheet = forwardRef<CreateNoteSheetRef, Props>(function CreateNoteSheet(
  { onCreated, onUpdated },
  ref
) {
  const { showSnackbar } = useSnackbar();

  const sheetRef = useRef<BottomSheet>(null);
  const warnRef = useRef(null);
  const snapPoints = useMemo(() => ["80%"], []);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // form state
  const [mood, setMood] = useState<Mood | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // mode state
  const [editingId, setEditingId] = useState<number | null>(null);

  // submit guard (để hiện lỗi khi chưa chọn mood)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setEditingId(null);
        sheetRef.current?.expand();
      },
      close: () => sheetRef.current?.close(),
      openWithMood: (m) => {
        setEditingId(null);
        setMood(m);
        sheetRef.current?.expand();
      },
      openForEdit: (note) => {
        setEditingId(note.id);
        setMood(note.mood_level ?? null);
        setContent(note.content ?? "");
        sheetRef.current?.expand();
      },
    }),
    []
  );

  // Android back button -> close sheet
  useEffect(() => {
    if (!isSheetOpen) {
      Keyboard.dismiss();
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      sheetRef.current?.close();
      return true;
    });
    return () => sub.remove();
  }, [isSheetOpen]);

  const resetForm = () => {
    setMood(null);
    setContent("");
    setLoading(false);
    setEditingId(null);
    setAttemptedSubmit(false);
  };

  // bắt buộc có mood + có nội dung + không loading
  const canSubmit = useMemo(
    () => !loading && !!mood && content.trim().length > 0,
    [loading, mood, content]
  );

  const onSave = async () => {
    setAttemptedSubmit(true);

    if (!canSubmit) {
      showSnackbar("Vui lòng chọn cảm xúc và nhập nội dung.");
      return;
    }

    Keyboard.dismiss();

    const payload: any = {
      content: content.trim(),
      mood_level: mood as Mood,
    };

    try {
      setLoading(true);
      let res;
      if (editingId == null) {
        // CREATE
        res = await api.post(endpoints.moodEntries, payload);
        showSnackbar("Đã lưu nhật ký 🎉");
        onCreated?.();
      } else {
        res = await api.patch?.(endpoints.moodEntryDetail(editingId), payload);
        showSnackbar("Đã cập nhật nhật ký ✨");
        onUpdated?.();
      }
      sheetRef.current?.close();
      if (res.data.is_crisis === true) {
        warnRef?.current?.open();
      }
      resetForm();
    } catch (e: any) {
      console.error("Lưu nhật ký lỗi:", e?.response ?? e);
      showSnackbar("Thao tác thất bại, thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };

  const isEdit = editingId != null;

  return (
    <Portal hostName="root_portal">
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(idx) => setIsSheetOpen(idx !== -1)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            pressBehavior="close"
          />
        )}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onClose={resetForm}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Button onPress={() => sheetRef.current?.close()} disabled={loading}>
              HỦY
            </Button>
            <Text style={styles.title}>{isEdit ? "Chỉnh sửa nhật ký" : "Viết nhật ký"}</Text>
            <Button onPress={onSave} disabled={!canSubmit || loading}>
              {loading ? <ActivityIndicator animating /> : "LƯU"}
            </Button>
          </View>

          {/* Form */}
          <KeyboardAwareScrollView
            contentContainerStyle={styles.container}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            enableAutomaticScroll
            extraScrollHeight={96}
            keyboardOpeningTime={0}
          >
            {/* Mood */}
            <View style={styles.moodHeaderRow}>
              <Text style={[styles.sectionLabel, styles.moodHeaderLabel]}>
                Bạn đang cảm thấy thế nào?
                <Text style={styles.required}> *</Text>
              </Text>

              <View
                pointerEvents={mood ? "auto" : "none"}
                style={[styles.clearWrap, !mood && styles.clearWrapHidden]}
              >
                <Button compact onPress={() => setMood(null)}>
                  Bỏ chọn
                </Button>
              </View>
            </View>

            <View style={styles.moodRowOneLine}>
              {MOOD_OPTIONS.map((m) => (
                <MoodTile
                  key={m.code}
                  emoji={m.emoji}
                  label={m.label}
                  color={m.color}
                  selected={mood === m.code}
                  onPress={() => setMood((curr) => (curr === m.code ? null : m.code))}
                />
              ))}
            </View>

            {!mood && attemptedSubmit && (
              <Text style={styles.errorText}>Bạn cần chọn một cảm xúc.</Text>
            )}

            {/* Content */}
            <View style={{ flexDirection:"row", alignItems:"center" }}>
            <Text style={styles.sectionLabel}>Tâm sự của bạn</Text>
            <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              mode="outlined"
              placeholder="Hôm nay mình cảm thấy..."
              value={content}
              onChangeText={setContent}
              multiline
              style={styles.input}
              outlineStyle={{ borderRadius: 12 }}
              returnKeyType="default"
              onSubmitEditing={() => {
                if (canSubmit) onSave();
                else {
                  setAttemptedSubmit(true);
                  showSnackbar("Vui lòng chọn cảm xúc và nhập nội dung.");
                }
              }}
              scrollEnabled
            />
            <View style={styles.helperRow}>
              <Text style={styles.helperText}>
                {isEdit ? "Bạn đang chỉnh sửa mục hiện có." : "Bạn có thể nhập dài tuỳ thích."}
              </Text>
              <Text style={styles.counter}>{content.length}</Text>
            </View>
          </KeyboardAwareScrollView>
        </BottomSheetView>
      </BottomSheet>
      <WarningDialog
        ref={warnRef}
      />
    </Portal>
  );
});

const MoodTile: React.FC<{
  emoji: string;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}> = ({ emoji, label, color, selected, onPress }) => {
  const emojiScale = useRef(new Animated.Value(selected ? 1.06 : 1)).current;
  const bgOpacity = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(emojiScale, {
      toValue: selected ? 1.06 : 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
    Animated.timing(bgOpacity, {
      toValue: selected ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  const onPressIn = () =>
    Animated.spring(emojiScale, {
      toValue: selected ? 1.06 : 0.96,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(emojiScale, {
      toValue: selected ? 1.06 : 1,
      useNativeDriver: true,
    }).start();

  return (
    <View style={styles.moodItemFixed}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        android_ripple={{ color: "#00000011", radius: 28, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={`Chọn mood ${label}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View
          style={[
            styles.moodCirclePress,
            { borderColor: selected ? color : "rgba(0,0,0,0.15)" },
          ]}
        >
          {/* nền nhạt fade in/out */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: color + "22", opacity: bgOpacity, borderRadius: 28 },
            ]}
          />

          {/* scale emoji thay vì scale circle */}
          <Animated.Text
            style={[styles.moodEmoji, { transform: [{ scale: emojiScale }, { translateY: -1 }] }]}
          >
            {emoji}
          </Animated.Text>
        </View>
      </Pressable>

      <Text style={[styles.moodLabel, selected && { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export default React.memo(CreateNoteSheet);

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700" },
  sectionLabel: { marginTop: 8, marginBottom: 6, fontWeight: "600" },

  input: {
    minHeight: 140,
    maxHeight: 260,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    paddingVertical: 6,
  },
  helperRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  helperText: { color: "#6b7a90" },
  counter: { color: "#6b7a90", fontVariant: ["tabular-nums"] },

  moodRowOneLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
  },
  moodItemFixed: {
    alignItems: "center",
    width: "20%",
  },
  moodCirclePress: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
    }),
    paddingVertical: 2,
  },
  moodEmoji: {
    fontSize: 28,
    lineHeight: Platform.OS === "android" ? 34 : 28,
    includeFontPadding: false,
  },
  moodLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  moodHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  clearWrap: {},
  clearWrapHidden: {
    opacity: 0,
  },
  moodHeaderLabel: {
    marginBottom: 0,
  },
  required: { color: "#e74c3c" },
  errorText: { color: "#e74c3c", marginTop: 4 },
});
