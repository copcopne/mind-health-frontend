import React, { FC, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useSnackbar } from "../../configs/Contexts";
import TopBar from "../common/TopBar";
import { api, endpoints } from "../../configs/Apis";
import SharedDialog from "../common/SharedDialog";

const HEADER_HEIGHT = 56;

const ChangePassword: FC = () => {
  const dialogRef = useRef(null);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // >= 6 ký tự
  const hasLen6 = newPw.length >= 6;
  const matchConfirm = !!confirmPw && newPw === confirmPw;

  // Hợp lệ: có mật khẩu cũ + mật khẩu mới >= 6 + xác nhận trùng
  const validAll = !!oldPw && hasLen6 && matchConfirm;

  const onSubmit = async () => {
    if (!validAll || loading) return;
    try {
      setLoading(true);
      await api.patch(endpoints.profile, {
        old_password: oldPw,
        password: newPw
      });
      showSnackbar?.("Đổi mật khẩu thành công!");
      navigation.goBack();
    } catch (e: any) {
      dialogRef?.current.open({
        title: "Thao tác thất bại",
        message: "Mật khẩu cũ không đúng",
        confirmText: "OK"
      });
    } finally {
      setLoading(false);
    }
  };

  const keyboardOffset = Platform.OS === "ios" ? insets.top + HEADER_HEIGHT : 0;

  return (
    <SafeAreaView style={styles.wrapper} edges={["top", "bottom"]}>
      <TopBar onBack={() => navigation.goBack()} title="Đổi mật khẩu" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View style={styles.container}>
          <TextInput
            label="Mật khẩu hiện tại"
            value={oldPw}
            onChangeText={setOldPw}
            secureTextEntry={!showOld}
            autoCapitalize="none"
            style={styles.input}
            right={<TextInput.Icon icon={showOld ? "eye-off" : "eye"} onPress={() => setShowOld(v => !v)} />}
          />

          <TextInput
            label="Mật khẩu mới"
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            style={styles.input}
            right={<TextInput.Icon icon={showNew ? "eye-off" : "eye"} onPress={() => setShowNew(v => !v)} />}
          />

          {/* Chỉ còn 1 rule: ≥ 6 ký tự */}
          <View style={styles.hints}>
            <Hint ok={hasLen6} text="≥ 6 ký tự" />
          </View>

          <TextInput
            label="Xác nhận mật khẩu mới"
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            error={!!confirmPw && !matchConfirm}
            style={styles.input}
            right={<TextInput.Icon icon={showConfirm ? "eye-off" : "eye"} onPress={() => setShowConfirm(v => !v)} />}
          />
          <HelperText type={matchConfirm ? "info" : "error"} visible={!!confirmPw && !matchConfirm}>
            Mật khẩu xác nhận không khớp
          </HelperText>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={loading}
            disabled={!validAll || loading}
            style={{ marginTop: 8, borderRadius: 12 }}
          >
            Cập nhật
          </Button>

          <Text style={{ marginTop: 14, color: "#6b7280", textAlign: "center" }}>
            Gợi ý: dùng cụm dễ nhớ nhưng đủ dài để an toàn.
          </Text>
        </View>
      </KeyboardAvoidingView>
      <SharedDialog
        ref={dialogRef}
      />
    </SafeAreaView>
  );
};

export default ChangePassword;

// Hint pill nhỏ
const Hint = ({ ok, text }: { ok: boolean; text: string }) => (
  <Text style={[styles.hint, ok ? styles.hintOk : styles.hintBad]}>{text}</Text>
);

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f9fcff" },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  input: { backgroundColor: "white", marginTop: 10 },
  hints: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  hint: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  hintOk: { backgroundColor: "#e5f9ef", color: "#0ea05a" },
  hintBad: { backgroundColor: "#fdecec", color: "#e74c3c" },
});
