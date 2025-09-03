import { type FC, useContext, useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View, Keyboard, Platform } from "react-native"
import { Button, HelperText, Text, TextInput, ActivityIndicator } from "react-native-paper"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { UserDispatch, useSnackbar } from "../../configs/Contexts"
import type { AuthStackParamList } from "../../App"
import { api, endpoints, setTokens } from "../../configs/Apis"
import TopBar from "../common/TopBar"
import { useNavigationState } from "@react-navigation/native"

type Props = NativeStackScreenProps<AuthStackParamList, "verify">

const RESEND_SECONDS = 60

const Verify: FC<Props> = ({ navigation, route }) => {
    const email = route.params?.email ?? "";
    const username = route.params?.username ?? "";
    const password = route.params?.password ?? "";
    const { showSnackbar } = useSnackbar();
    const insets = useSafeAreaInsets();

    const userDispatch = useContext(UserDispatch)!

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [remain, setRemain] = useState(0);
    const [sentOnce, setSentOnce] = useState(false);
    const [isFromRegister, setIsFromRegister] = useState(false);

    const prevRouteName = useNavigationState((state) => {
        const routes = state.routes;
        const index = state.index;
        if (index > 0) {
            return routes[index - 1].name;
        }
        return null;
    });

    useEffect(() => {
        if (prevRouteName === "register") {
            setIsFromRegister(true);
            setSentOnce(true);
            setRemain(RESEND_SECONDS);
        }
    }, [prevRouteName]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // countdown cho resend
    useEffect(() => {
        timerRef.current && clearInterval(timerRef.current)
        if (remain > 0) {
            timerRef.current = setInterval(() => {
                setRemain((s) => (s > 0 ? s - 1 : 0))
            }, 1000)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [remain])

    const canSubmit = useMemo(() => /^\d{6}$/.test(code), [code])
    const onVerify = async () => {
        if (!email) {
            setErr("Thiếu email để xác minh.")
            return
        }
        if (!canSubmit) {
            setErr("Mã OTP gồm 6 chữ số.")
            return
        }
        try {
            Keyboard.dismiss()
            setLoading(true)
            setErr(null)
            await api.post(endpoints.verify, { email, code })
            showSnackbar("Xác minh email thành công!", "success")
            if (username && password) {
                const res = await api.post(endpoints.login, {
                    username: username,
                    password: password,
                })
                const user = await api.get(endpoints["profile"], {
                    headers: {
                        Authorization: `Bearer ${res.data.access_token}`,
                    },
                })
                await setTokens({
                    accessToken: res.data.access_token,
                    refreshToken: res.data.refresh_token,
                });

                userDispatch({
                    type: "login",
                    payload: user.data,
                })
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.response?.data?.error || "Mã OTP không đúng hoặc đã hết hạn."
            setErr(msg)
        } finally {
            setLoading(false)
        }
    }

    const onResend = async () => {
        if (!email || remain > 0) return;
        try {
            setResending(true);
            setErr(null);
            await api.post(endpoints.verifyEmail, { email });
            showSnackbar(sentOnce ? "Đã gửi lại mã xác minh." : "Đã gửi mã xác minh.", "info");
            setSentOnce(true);
            setRemain(RESEND_SECONDS); // bắt đầu countdown sau khi gửi thành công
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Gửi OTP thất bại. Thử lại nhé!";
            setErr(msg);
        } finally {
            setResending(false);
        }
    };

    return (
        <SafeAreaView style={[styles.wrapper, { paddingTop: insets.top }]}>
            <TopBar onBack={() => navigation.goBack()} />

            <View style={styles.mainContainer}>
                <KeyboardAwareScrollView
                    contentContainerStyle={styles.content}
                    enableOnAndroid
                    extraScrollHeight={24}
                    keyboardOpeningTime={0}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.centerContent}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Xác minh email</Text>
                            <Text style={styles.subtitle}>
                                Mã xác minh sẽ được gửi tới{" "}
                                <Text style={{ fontWeight: "700", color: "#0b203a" }}>{email || "(chưa có email)"}</Text>
                            </Text>
                        </View>

                        <Text style={styles.label}>Nhập mã 6 số</Text>
                        <TextInput
                            mode="outlined"
                            value={code}
                            onChangeText={(t) => {
                                // chỉ giữ số, cắt tối đa 6
                                const clean = t.replace(/\D/g, "").slice(0, 6)
                                setCode(clean)
                                setErr(null)
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
                        {!!err && (
                            <HelperText type="error" style={styles.errorText}>
                                {err}
                            </HelperText>
                        )}
                    </View>
                    <View style={styles.bottomContainer}>
                        <View style={{ height: 12 }} />

                        {remain > 0 ? (
                            <Text style={[styles.resendText, { textAlign: "center" }]}>
                                Gửi lại mã sau {remain}s
                            </Text>
                        ) : (
                            <Button
                                mode="text"
                                onPress={onResend}
                                textColor="#1c85fc"
                                disabled={resending || !email}
                                compact
                                labelStyle={styles.resendButtonText}
                            >
                                {sentOnce ? "Gửi lại mã" : "Gửi mã"}
                            </Button>
                        )}
                        <Button
                            mode="contained"
                            onPress={onVerify}
                            disabled={!canSubmit || loading}
                            loading={loading}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                        >
                            Xác minh
                        </Button>
                        {resending && <ActivityIndicator style={{ alignSelf: "center", marginTop: 6 }} />}
                    </View>


                </KeyboardAwareScrollView>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: "#f9fcff" },
    mainContainer: { flex: 1 },
    topBar: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    centerContent: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },
    header: {
        marginBottom: 32,
        alignItems: "center",
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: "#1c85fc",
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 18,
        color: "#666",
        textAlign: "center",
        lineHeight: 24,
    },
    label: {
        fontSize: 20,
        fontWeight: "600",
        color: "#0b203a",
        marginBottom: 16,
        textAlign: "center",
    },
    codeInput: {
        backgroundColor: "white",
        textAlign: "center",
        fontSize: 28,
        letterSpacing: 8,
        width: "100%",
        maxWidth: 300,
    },
    errorText: {
        marginTop: 8,
        fontSize: 16,
        textAlign: "center",
    },
    resendRow: {
        marginTop: 24,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
    },
    resendText: {
        color: "#667",
        fontSize: 16,
    },
    resendButtonText: {
        fontSize: 16,
    },
    bottomContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 16,
    },
    button: {
        marginTop: 18,
        borderRadius: 12,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    buttonLabel: {
        fontSize: 20,
        fontWeight: "600",
    },
})

export default Verify
