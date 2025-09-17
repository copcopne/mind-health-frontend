import { FC, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Button, Text, TextInput, HelperText } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../App";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import TopBar from "../common/TopBar";
import { api, endpoints } from "../../configs/Apis";
import axios from "axios";
import SharedDialog, { SharedDialogRef } from "../common/SharedDialog";

type Props = NativeStackScreenProps<AuthStackParamList, "forgot">;

const RESEND_SECONDS = 60;
const INPUT_HEIGHT = 56;

const ForgotPassword: FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errOtp, setErrOtp] = useState<string | null>(null);
  const [errNewPwd, setErrNewPwd] = useState<string | null>(null);
  const [errConfirmPwd, setErrConfirmPwd] = useState<string | null>(null);

  const [remain, setRemain] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dialogRef = useRef<SharedDialogRef>(null);

  // Khi chạm 0 thì dừng interval (không cleanup trên mọi render)
  useEffect(() => {
    if (remain <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRemain(0);
    }
  }, [remain]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setRemain(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemain((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  };

  const validateEmail = () => {
    setErrEmail(null);
    if (!email.trim()) {
      setErrEmail("Vui lòng nhập email.");
      return false;
    }
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

  // ===== actions
  const handleSendOtp = async () => {
    if (remain > 0) return;
    if (!validateEmail()) return;

    try {
      setLoading(true);
      await api.post(endpoints.forgotPassword, { email });

      dialogRef.current?.open({
        title: "Đã gửi yêu cầu OTP",
        message: "Nếu email hợp lệ, mã OTP sẽ được gửi trong ít phút. Vui lòng kiểm tra hộp thư của bạn.",
        confirmText: "OK",
      });

      startCountdown();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          dialogRef.current?.open({
            title: "Đã gửi yêu cầu OTP",
            message: "Nếu email hợp lệ, mã OTP sẽ được gửi trong ít phút. Vui lòng kiểm tra hộp thư của bạn.",
            confirmText: "OK",
          });
          startCountdown();
        } else {
          dialogRef.current?.open({
            title: "Không thể gửi OTP",
            message: err.response?.data?.message || "Hệ thống đang bận, vui lòng thử lại sau.",
            confirmText: "Đóng",
          });
        }
      } else {
        console.error(err);
        dialogRef.current?.open({
          title: "Không thể gửi OTP",
          message: "Đã có lỗi không xác định. Vui lòng thử lại sau.",
          confirmText: "Đóng",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setErrOtp(null);
    if (!otp.trim()) {
      setErrOtp("Vui lòng nhập OTP.");
      return;
    }
    if (!validateEmail()) return;
    if (!validatePasswords()) return;

    try {
      setLoading(true);
      await api.post(endpoints.resetPassword, {
        email: email,
        code: otp,
        new_password: newPwd,
      });

      dialogRef.current?.open({
        title: "Thành công",
        message: "Đổi mật khẩu thành công! Hãy đăng nhập lại nhé.",
        confirmText: "OK",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err: any) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message || "Đổi mật khẩu thất bại. Thử lại sau nhé."
          : "Đổi mật khẩu thất bại. Thử lại sau nhé.";
      dialogRef.current?.open({
        title: "Lỗi",
        message: msg,
        confirmText: "Đóng",
      });
      if (!axios.isAxiosError(err)) console.error(err);
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
            </View>

            {/* ====== KHỐI TRÊN: Email + OTP ====== */}
            <View style={styles.sectionTop}>
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

              {/* OTP + nút Gửi OTP (ngang hàng, canh giữa) */}
              <View style={styles.otpRow}>
                <TextInput
                  activeOutlineColor="#1c85fc"
                  mode="outlined"
                  label="Mã OTP"
                  value={otp}
                  onChangeText={(t) => { setOtp(t); setErrOtp(null); }}
                  autoCapitalize="none"
                  style={[styles.input, styles.inputFixed]}
                  error={!!errOtp}
                  left={<TextInput.Icon icon="shield-key" />}
                />

                <Button
                  mode="contained-tonal"
                  style={styles.otpBtnRight}
                  contentStyle={{ height: INPUT_HEIGHT, paddingHorizontal: 14 }}
                  onPress={handleSendOtp}
                  disabled={loading || remain > 0}
                  loading={loading && remain === 0}
                >
                  {remain > 0 ? `Gửi lại (${remain}s)` : "Gửi OTP"}
                </Button>
              </View>
              {!!errOtp && <HelperText type="error" style={styles.helperBelowRow}>{errOtp}</HelperText>}
            </View>

            {/* ====== KHỐI DƯỚI: Mật khẩu mới ====== */}
            <View style={styles.sectionBottom}>
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
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAwareScrollView>

      <SharedDialog ref={dialogRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f9fcff" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 54 },
  header: { marginTop: 12, marginBottom: 24, alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c85fc" },

  input: { flex: 1, marginTop: 12, backgroundColor: "white" },
  inputFixed: { height: INPUT_HEIGHT },

  sectionTop: {},
  otpRow: {
    flexDirection: "row",
    alignItems: "center",   // canh giữa theo trục dọc
    gap: 10,
  },
  otpBtnRight: {
    marginTop: 12,          // khớp marginTop của input
    borderRadius: 12,
    justifyContent: "center",
  },

  helperBelowRow: {
    marginTop: 4,           // helper của OTP nằm dưới hàng, không làm thay đổi chiều cao hàng
  },

  sectionBottom: { marginTop: 20 },

  button: { marginTop: 18, borderRadius: 12 },
});

export default ForgotPassword;
