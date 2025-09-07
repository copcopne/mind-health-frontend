import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import { Text, Button, TextInput, ActivityIndicator } from "react-native-paper";
import {
  BackHandler,
  Keyboard,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { api, endpoints } from "../../configs/Apis";
import { useSnackbar } from "../../configs/Contexts";

export type DeleteAccountRequestSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  onSubmitted?: () => void;
};

const DeleteAccountRequestSheet = forwardRef<DeleteAccountRequestSheetRef, Props>(
  function DeleteAccountRequestSheet({ onSubmitted }, ref) {
    const { showSnackbar } = useSnackbar();

    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["75%"], []);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          sheetRef.current?.expand();
        },
        close: () => sheetRef.current?.close(),
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
      setReason("");
      setLoading(false);
    };

    const onSubmit = async () => {
      Keyboard.dismiss();
      try {
        setLoading(true);
        // Backend nên nhận { reason?: string }
        const payload: { reason?: string } = {};
        if (reason.trim().length > 0) payload.reason = reason.trim();

        await api.post(endpoints.profileDeletion, payload);

        showSnackbar("Đã gửi yêu cầu xóa tài khoản.");
        sheetRef.current?.close();
        onSubmitted?.();
        resetForm();
      } catch (e: any) {
        console.error("Gửi yêu cầu xóa lỗi:", e?.response ?? e);
        showSnackbar("Không thể gửi yêu cầu. Vui lòng thử lại.");
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
              <Text style={styles.title}>Yêu cầu xóa tài khoản</Text>
              <Button onPress={onSubmit} disabled={loading}>
                {loading ? <ActivityIndicator animating /> : "GỬI"}
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
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Lưu ý quan trọng</Text>
                <Text style={styles.warningText}>
                  Yêu cầu xóa tài khoản sẽ được tiếp nhận và xử lý sau 7 ngày. Sau khi xóa, dữ
                  liệu của bạn có thể không khôi phục được. Nếu bạn chỉ muốn tạm dừng sử dụng, hãy cân
                  nhắc đăng xuất thay vì xóa.
                  Trong trường hợp bạn thay đổi quyết định khi chưa quá 7 ngày yêu cầu xóa, đăng nhập vào hệ thống để hủy yêu cầu xóa tài khoản.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Lý do (không bắt buộc)</Text>
              <TextInput
                mode="outlined"
                placeholder="Bạn có thể cho chúng mình biết lý do..."
                value={reason}
                onChangeText={setReason}
                multiline
                style={styles.input}
                outlineStyle={{ borderRadius: 12 }}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                scrollEnabled
              />

              <View style={styles.helperRow}>
                <Text style={styles.helperText}>Bạn có thể để trống phần này.</Text>
                <Text style={styles.counter}>{reason.length}</Text>
              </View>
            </KeyboardAwareScrollView>
          </BottomSheetView>
        </BottomSheet>
      </Portal>
    );
  }
);

export default React.memo(DeleteAccountRequestSheet);

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
  sectionLabel: { marginTop: 12, marginBottom: 6, fontWeight: "600" },

  input: {
    minHeight: 120,
    maxHeight: 240,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    paddingVertical: 6,
  },
  helperRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  helperText: { color: "#6b7a90" },
  counter: { color: "#6b7a90", fontVariant: ["tabular-nums"] },

  warningBox: {
    borderWidth: 1,
    borderColor: "#f1c40f",
    backgroundColor: Platform.select({ ios: "#fff8e1", android: "#fff8e1" }),
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  warningTitle: { fontWeight: "700", marginBottom: 4 },
  warningText: { lineHeight: 20 },

  dangerBtn: {
    marginTop: 16,
  },
});
