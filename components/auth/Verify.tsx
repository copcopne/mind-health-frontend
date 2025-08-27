import React, { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Keyboard, Platform } from "react-native";
import { Button, HelperText, Text, TextInput, ActivityIndicator } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserDispatch, useSnackbar } from "../../configs/Contexts";
import { AuthStackParamList } from "../../App";
import api, { endpoints } from "../../configs/Apis";
import TopBar from "../TopBar";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = NativeStackScreenProps<AuthStackParamList, "verify">;

const RESEND_SECONDS = 60;

const Verify: FC<Props> = ({ navigation, route }) => {
    const email = route.params?.email ?? "";
    const username = route.params?.username ?? "";
    const password = route.params?.username ?? "";
    const { showSnackbar } = useSnackbar();
    const insets = useSafeAreaInsets();


    const userDispatch = useContext(UserDispatch)!;

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [remain, setRemain] = useState(RESEND_SECONDS);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // countdown cho resend
    useEffect(() => {
        timerRef.current && clearInterval(timerRef.current);
        if (remain > 0) {
            timerRef.current = setInterval(() => {
                setRemain((s) => (s > 0 ? s - 1 : 0));
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [remain]);

    const canSubmit = useMemo(() => /^\d{6}$/.test(code), [code]);

    // auto submit khi đủ 6 số
    useEffect(() => {
        if (canSubmit && !loading) {
            // tránh double-submit khi user gõ nhanh
            onVerify().catch(() => { });
        }
    }, [canSubmit]);

    const onVerify = async () => {
        if (!email) {
            setErr("Thiếu email để xác minh.");
            return;
        }
        if (!canSubmit) {
            setErr("Mã OTP gồm 6 chữ số.");
            return;
        }
        try {
            Keyboard.dismiss();
            setLoading(true);
            setErr(null);
            await api.post(endpoints.verify, { email, code });
            showSnackbar("Xác minh email thành công!", "success");
            if (username && password) {
                const res = await api.post(endpoints['login'], {
                    username: username,
                    password: password
                });
                const user = await api.get(endpoints['profile'], {
                    headers: {
                        Authorization: `Bearer ${res.data.access_token}`
                    }
                });
                await AsyncStorage.multiSet([
                    ["accessToken", res.data.access_token],
                    ["refreshToken", res.data.refresh_token],
                ]);

                userDispatch({
                    type: "login",
                    payload: user.data
                });
            }
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                "Mã OTP không đúng hoặc đã hết hạn.";
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    const onResend = async () => {
        if (!email || remain > 0) return;
        try {
            setResending(true);
            setErr(null);
            await api.post(endpoints.verifyRequest, { email });
            showSnackbar("Đã gửi lại mã xác minh.", "info");
            setRemain(RESEND_SECONDS);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Gửi lại OTP thất bại. Thử lại nhé!";
            setErr(msg);
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={[styles.wrapper, { paddingTop: insets.top }]}>
            <TopBar onBack={() => navigation.goBack()} />

            <KeyboardAwareScrollView
                contentContainerStyle={styles.content}
                enableOnAndroid
                extraScrollHeight={24}
                keyboardOpeningTime={0}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Xác minh email</Text>
                    <Text style={styles.subtitle}>
                        Một mã xác minh đã được gửi tới{" "}
                        <Text style={{ fontWeight: "700", color: "#0b203a" }}>{email || "(chưa có email)"}</Text>
                    </Text>
                </View>

                <Text style={styles.label}>Nhập mã 6 số</Text>
                <TextInput
                    mode="outlined"
                    value={code}
                    onChangeText={(t) => {
                        // chỉ giữ số, cắt tối đa 6
                        const clean = t.replace(/\D/g, "").slice(0, 6);
                        setCode(clean);
                        setErr(null);
                    }}
                    keyboardType={Platform.select({ ios: "number-pad", android: "numeric" }) as any}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    inputMode="numeric"
                    maxLength={6}
                    style={styles.codeInput}
                    outlineColor="#cfe6ff"
                    activeOutlineColor="#1c85fc"
                    autoFocus
                />
                {!!err && <HelperText type="error" style={{ marginTop: 4 }}>{err}</HelperText>}

                <Button
                    mode="contained"
                    buttonColor="#1c85fc"
                    textColor="white"
                    style={styles.button}
                    contentStyle={{ paddingVertical: 10 }}
                    labelStyle={{ fontSize: 16, fontWeight: "600" }}
                    onPress={onVerify}
                    loading={loading}
                    disabled={!canSubmit || loading}
                >
                    Xác minh
                </Button>

                <View style={styles.resendRow}>
                    {remain > 0 ? (
                        <Text style={{ color: "#667" }}>Gửi lại mã sau {remain}s</Text>
                    ) : (
                        <Button
                            mode="text"
                            onPress={onResend}
                            textColor="#1c85fc"
                            disabled={resending}
                            compact
                        >
                            Gửi lại mã
                        </Button>
                    )}
                    {resending && <ActivityIndicator style={{ marginLeft: 8 }} />}
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: "#f9fcff" },
    topBar: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    header: { marginTop: 12, marginBottom: 18, alignItems: "center" },
    title: { fontSize: 22, fontWeight: "800", color: "#1c85fc" },
    subtitle: { marginTop: 6, fontSize: 14, color: "#666", textAlign: "center" },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0b203a",
        marginBottom: 8,
        alignSelf: "flex-start",
    },
    codeInput: {
        backgroundColor: "white",
        textAlign: "center",
        fontSize: 24,
        letterSpacing: 6,
    },
    button: { marginTop: 16, borderRadius: 12 },
    resendRow: {
        marginTop: 12,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
    },
});

export default Verify;
