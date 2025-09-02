import { FC, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Button, Text, TextInput, HelperText, Portal, Dialog } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../App";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import TopBar from "../TopBar";
import { api, endpoints } from "../../configs/Apis";
import axios from "axios";

type Props = NativeStackScreenProps<AuthStackParamList, "forgot">;

const RESEND_SECONDS = 60;

const ForgotPassword: FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lỗi từng field
  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errOtp, setErrOtp] = useState<string | null>(null);
  const [errNewPwd, setErrNewPwd] = useState<string | null>(null);
  const [errConfirmPwd, setErrConfirmPwd] = useState<string | null>(null);

  // Dialog lỗi chung
  const [errGeneral, setErrGeneral] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Resend cooldown
  const [remain, setRemain] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (remain <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remain]);

  const startCountdown = () => {
    setRemain(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemain((s) => s - 1);
    }, 1000);
  };

  const validateEmail = () => {
    setErrEmail(null);
    if (!email.trim()) {
      setErrEmail("Vui lòng nhập email.");
      return false;
    }
    // Check đơn giản
    const ok = /\S+@\S+\.\S+/.test(email);
    if (!ok) {
      setErrEmail("Email không hợp lệ.");
      return false;
    }
    return true;
  };

  const validatePasswords = () => {
    setErrNewPwd(null);
    setErrConfirmPwd(null);

    if (!newPwd) {
      setErrNewPwd("Vui lòng nhập mật khẩu mới.");
      return false;
    }
    if (newPwd.length < 8) {
      setErrNewPwd("Mật khẩu tối thiểu 8 ký tự nha.");
      return false;
    }
    if (!confirmPwd) {
      setErrConfirmPwd("Vui lòng xác nhận mật khẩu.");
      return false;
    }
    if (newPwd !== confirmPwd) {
      setErrConfirmPwd("Mật khẩu xác nhận không khớp.");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateEmail()) return;
    try {
      setLoading(true);
      await api.post(endpoints.forgotPassword, { email });
      setOtpSent(true);
      startCountdown();
    } catch (err: any) {
      let msg = "Hệ thống đang lỗi, thử lại sau nha.";
      if (axios.isAxiosError(err)) {
        const code = err.response?.status;
        msg = err.response?.data?.message || (code === 404 ? "Email không tồn tại." : msg);
      } else {
        console.error(err);
      }
      setErrGeneral(msg);
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (remain > 0) return;
    if (!validateEmail()) return;
    try {
      setLoading(true);
      await api.post(endpoints.forgotPassword, { email });
      startCountdown();
    } catch (err: any) {
      let msg = "Không gửi lại được OTP. Thử sau 1 lát nhé.";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || msg;
      } else {
        console.error(err);
      }
      setErrGeneral(msg);
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };

  // Tuỳ backend: có bước verify riêng hay verify luôn trong reset.
  const handleReset = async () => {
    // Khi reset, yêu cầu OTP + new password
    setErrOtp(null);
    if (!otpSent) {
      setErrGeneral("Em cần nhận OTP trước đã nha.");
      setShowDialog(true);
      return;
    }
    if (!otp.trim()) {
      setErrOtp("Vui lòng nhập OTP.");
      return;
    }
    if (!validatePasswords()) return;

    try {
      setLoading(true);
      // Nhiều backend verify trong endpoint reset luôn, mình gửi cả email+otp+newPassword
      await api.post(endpoints.resetPassword, {
        email: email,
        code: otp,
        new_password: newPwd,
      });

      setErrGeneral("Đổi mật khẩu thành công! Em đăng nhập lại nhé.");
      setShowDialog(true);
      setTimeout(() => {
        setShowDialog(false);
        navigation.goBack();
      }, 1200);
    } catch (err: any) {
      let msg = "Đổi mật khẩu thất bại. Thử lại sau nhé.";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || msg;
      } else {
        console.error(err);
      }
      setErrGeneral(msg);
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <TopBar onBack={() => navigation.goBack()} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}
        enableOnAndroid
        extraScrollHeight={24}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>Nhập email để nhận mã OTP, sau đó đặt mật khẩu mới nha 💪</Text>
            </View>

            {/* Email */}
            <TextInput
              activeOutlineColor="#1c85fc"
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrEmail(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              error={!!errEmail}
              left={<TextInput.Icon icon="email" />}
            />
            {!!errEmail && <HelperText type="error">{errEmail}</HelperText>}

            <Button
              mode="contained"
              buttonColor="#1c85fc"
              textColor="white"
              style={{ marginTop: 10, borderRadius: 12 }}
              contentStyle={{ paddingVertical: 8 }}
              onPress={handleSendOtp}
              loading={loading}
              disabled={loading}
            >
              {otpSent ? "Gửi lại OTP" : "Gửi OTP"}
            </Button>

            {/* OTP + Resend */}
            {otpSent && (
              <>
                <TextInput
                  activeOutlineColor="#1c85fc"
                  mode="outlined"
                  label="Mã OTP"
                  value={otp}
                  onChangeText={(t) => { setOtp(t); setErrOtp(null); }}
                  autoCapitalize="none"
                  style={styles.input}
                  error={!!errOtp}
                  left={<TextInput.Icon icon="shield-key" />}
                />
                {!!errOtp && <HelperText type="error">{errOtp}</HelperText>}

                <Button
                  mode="text"
                  onPress={handleResendOtp}
                  textColor="#1c85fc"
                  disabled={remain > 0 || loading}
                  style={{ alignSelf: "flex-start", marginTop: -6 }}
                >
                  {remain > 0 ? `Gửi lại OTP sau ${remain}s` : "Gửi lại OTP"}
                </Button>
              </>
            )}

            {/* New password */}
            {otpSent && (
              <>
                <TextInput
                  activeOutlineColor="#1c85fc"
                  mode="outlined"
                  label="Mật khẩu mới"
                  value={newPwd}
                  onChangeText={(t) => { setNewPwd(t); setErrNewPwd(null); }}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  style={styles.input}
                  error={!!errNewPwd}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPwd ? "eye-off" : "eye"}
                      onPress={() => setShowPwd((p) => !p)}
                    />
                  }
                />
                {!!errNewPwd && <HelperText type="error">{errNewPwd}</HelperText>}

                <TextInput
                  activeOutlineColor="#1c85fc"
                  mode="outlined"
                  label="Xác nhận mật khẩu mới"
                  value={confirmPwd}
                  onChangeText={(t) => { setConfirmPwd(t); setErrConfirmPwd(null); }}
                  secureTextEntry={!showPwd2}
                  autoCapitalize="none"
                  style={styles.input}
                  error={!!errConfirmPwd}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showPwd2 ? "eye-off" : "eye"}
                      onPress={() => setShowPwd2((p) => !p)}
                    />
                  }
                />
                {!!errConfirmPwd && <HelperText type="error">{errConfirmPwd}</HelperText>}

                <Button
                  mode="contained"
                  buttonColor="#1c85fc"
                  textColor="white"
                  style={styles.button}
                  contentStyle={{ paddingVertical: 8 }}
                  labelStyle={{ fontSize: 16, fontWeight: "600" }}
                  onPress={handleReset}
                  loading={loading}
                  disabled={loading}
                >
                  Đổi mật khẩu
                </Button>
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAwareScrollView>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Thông báo</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errGeneral}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f9fcff" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 54 },
  header: { marginTop: 12, marginBottom: 24, alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c85fc" },
  subtitle: { marginTop: 6, fontSize: 14, color: "#666", textAlign: "center" },
  input: { marginTop: 12, backgroundColor: "white" },
  button: { marginTop: 18, borderRadius: 12 },
});

export default ForgotPassword;
