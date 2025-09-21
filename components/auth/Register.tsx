import { FC, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    StyleSheet,
    Keyboard,
    Animated,
    Easing,
    Platform,
} from "react-native";
import {
    Button,
    Text,
    TextInput,
    HelperText,
    RadioButton,
    ProgressBar,
    Checkbox
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../App";
import { api, endpoints } from "../../configs/Apis";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import TopBar from "../common/TopBar";
import { useSnackbar } from "../../configs/Contexts";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import SharedDialog from "../common/SharedDialog";

type Props = NativeStackScreenProps<AuthStackParamList, "register">;
type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS: Step[] = [0, 1, 2, 3, 4];

const Register: FC<Props> = ({ navigation }) => {
    // form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [gender, setGender] = useState<boolean | null>(null);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [accepted, setAccepted] = useState(true);
    const { showSnackbar, } = useSnackbar();

    // wizard
    const [step, setStep] = useState<Step>(0);
    const [loading, setLoading] = useState(false);

    // error
    const [err, setErr] = useState<Record<string, string | null>>({});
    const dialogRef = useRef(null);

    const progress = useMemo(() => (step + 1) / TOTAL_STEPS.length, [step]);

    // ---------- animation ----------
    const slide = useRef(new Animated.Value(0)).current;
    const dirRef = useRef<1 | -1>(1);
    const kbBottom = useRef(new Animated.Value(0)).current;
    const loginHintAnim = useRef(new Animated.Value(step === 0 ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(loginHintAnim, {
            toValue: step === 0 ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [step]);

    const loginHintStyle = {
        opacity: loginHintAnim,
        transform: [
            {
                translateY: loginHintAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0], // ẩn: hơi tụt xuống, hiện: vị trí chuẩn
                }),
            },
        ],
        // khi ẩn thì chặn click
        pointerEvents: step === 0 ? "auto" as const : "none" as const,
    };

    const animateIn = () => {
        slide.setValue(0);
        Animated.timing(slide, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };
    const animateStepChange = (nextStep: Step, dir: 1 | -1) => {
        dirRef.current = dir;
        Animated.timing(slide, {
            toValue: 0,
            duration: 160,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            setStep(nextStep);
            animateIn();
        });
    };

    useEffect(() => {
        const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const onShow = (e: any) => {
            const h = e.endCoordinates?.height ?? 0;
            const dur = (e.duration ?? 180) * (Platform.OS === "ios" ? 1 : 1);
            Animated.timing(kbBottom, {
                toValue: h,
                duration: dur,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false, // layout -> false
            }).start();
        };

        const onHide = (e: any) => {
            const dur = (e?.duration ?? 160);
            Animated.timing(kbBottom, {
                toValue: 0,
                duration: dur,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: false,
            }).start();
        };

        const subShow = Keyboard.addListener(showEvt, onShow);
        const subHide = Keyboard.addListener(hideEvt, onHide);

        return () => {
            subShow.remove();
            subHide.remove();
        };
    }, [kbBottom]);

    const translateX = slide.interpolate({
        inputRange: [0, 1],
        outputRange: [dirRef.current === 1 ? 24 : -24, 0],
    });
    const opacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    // kick on first mount
    if ((slide as any)._value === 0) requestAnimationFrame(() => animateIn());

    // ---------- validate ----------
    const validateStep = (s: Step) => {
        let ok = true;
        const nextErr: Record<string, string | null> = { ...err };
        const set = (k: string, v: string | null) => { nextErr[k] = v; if (v) ok = false; };

        if (s === 0) {
            set("firstName", !firstName.trim() ? "Vui lòng nhập tên." : null);
            set("lastName", !lastName.trim() ? "Vui lòng nhập họ." : null);
        }
        if (s === 1) set("gender", gender === null ? "Vui lòng chọn giới tính." : null);
        if (s === 2) {
            if (!email.trim()) set("email", "Vui lòng nhập email.");
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) set("email", "Email không hợp lệ.");
            else set("email", null);
        }
        if (s === 3) set("username", !username.trim() ? "Vui lòng nhập tên người dùng." : null);
        if (s === 4) {
            if (!password) set("password", "Vui lòng nhập mật khẩu.");
            else if (password.length < 6) set("password", "Mật khẩu tối thiểu 6 ký tự.");
            else set("password", null);

            if (!confirmPwd) set("confirmPwd", "Vui lòng xác nhận mật khẩu.");
            else if (confirmPwd !== password) set("confirmPwd", "Mật khẩu xác nhận không trùng khớp.");
            else set("confirmPwd", null);
        }

        setErr(nextErr);
        return ok;
    };

    const goNext = () => {
        Keyboard.dismiss();
        if (!validateStep(step)) return;
        if (step < TOTAL_STEPS.length - 1) animateStepChange((step + 1) as Step, 1);
    };
    const goBack = () => {
        Keyboard.dismiss();
        if (step > 0) animateStepChange((step - 1) as Step, -1);
        else navigation.goBack();
    };

    const showErrorDialog = (msg: string) => {
        dialogRef?.current?.open({
            title: "Lỗi đăng ký",
            message: msg,
            confirmText: "OK",
            cancelText: "Hủy",
        });
    };

    const onSubmit = async () => {
        if (!validateStep(4)) return;
        try {
            setLoading(true);
            const payload = { first_name: firstName, last_name: lastName, username, email, gender, password, accept_sharing_data: accepted };
            await api.post(endpoints.users, payload);
            navigation.replace("login");
            showSnackbar("Tạo thành công!", "success");
            navigation.navigate("welcomeScreen");
            navigation.navigate("verify", {
                email: email,
                username: username,
                password: password,
            });
        } catch (err: any) {
            let msg = "Hệ thống đang có lỗi, thử lại sau nhé!";
            if (axios.isAxiosError(err) && err.status === 400) {
                msg = err.response?.data?.message;
            } else {
                console.error(err);
                console.error(err?.status);
                console.error(err?.response?.data);
            }
            showErrorDialog(msg);

        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.wrapper}>
            <TopBar onBack={goBack} title="Đăng ký tài khoản" rightText={`${step + 1}/${TOTAL_STEPS.length}`} />
            <View style={styles.body}>
                <KeyboardAwareScrollView
                    contentContainerStyle={styles.scrollContent}
                    enableOnAndroid
                    extraScrollHeight={24}
                    keyboardOpeningTime={0}
                    keyboardShouldPersistTaps="handled"
                    style={{ flex: 1 }}
                >

                    <ProgressBar progress={progress} color="#1c85fc" style={{ height: 6, borderRadius: 6, marginTop: 56 }} />

                    {/* Nội dung step (animated) */}
                    <Animated.View style={[styles.formCentered, { opacity, transform: [{ translateX }] }]}>
                        {step === 0 && (
                            <>
                                <Text style={styles.bigLabel}>Tên bạn là gì?</Text>
                                <View style={styles.row}>
                                    <View style={styles.col}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Nhập họ"
                                            value={lastName}
                                            onChangeText={setLastName}
                                            style={styles.input}
                                            activeOutlineColor="#1c85fc"
                                            error={!!err.lastName}
                                        />
                                        {!!err.lastName && <HelperText type="error">{err.lastName}</HelperText>}
                                    </View>

                                    <View style={styles.col}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Nhập tên"
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            style={styles.input}
                                            activeOutlineColor="#1c85fc"
                                            error={!!err.firstName}
                                        />
                                        {!!err.firstName && <HelperText type="error">{err.firstName}</HelperText>}
                                    </View>
                                </View>
                            </>

                        )}

                        {step === 1 && (
                            <>
                                <Text style={styles.bigLabel}>Giới tính</Text>
                                <RadioButton.Group onValueChange={(v) => setGender(v === "true")} value={String(gender)}>
                                    <View style={styles.genderRow}>
                                        <RadioButton value="false" />
                                        <Text style={styles.genderText}>Nam</Text>
                                        <RadioButton value="true" />
                                        <Text style={styles.genderText}>Nữ</Text>
                                    </View>
                                </RadioButton.Group>
                                {!!err.gender && <HelperText type="error">{err.gender}</HelperText>}
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={styles.bigLabel}>Email của bạn</Text>
                                <TextInput
                                    mode="outlined"
                                    placeholder="Nhập email"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.inputWide}
                                    activeOutlineColor="#1c85fc"
                                    error={!!err.email}
                                />
                                {!!err.email && <HelperText type="error">{err.email}</HelperText>}
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Text style={styles.bigLabel}>Nhập tên người dùng</Text>
                                <TextInput
                                    mode="outlined"
                                    placeholder="Nhập tên người dùng"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    style={styles.inputWide}
                                    activeOutlineColor="#1c85fc"
                                    error={!!err.username}
                                />
                                {!!err.username && <HelperText type="error">{err.username}</HelperText>}
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <Text style={styles.bigLabel}>Mật khẩu bạn muốn đặt</Text>
                                <TextInput
                                    mode="outlined"
                                    placeholder="Nhập mật khẩu"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPwd}
                                    autoCapitalize="none"
                                    style={styles.inputWide}
                                    activeOutlineColor="#1c85fc"
                                    error={!!err.password}
                                    right={<TextInput.Icon icon={showPwd ? "eye-off" : "eye"} onPress={() => setShowPwd((p) => !p)} />}
                                />
                                {!!err.password && <HelperText type="error">{err.password}</HelperText>}

                                <TextInput
                                    mode="outlined"
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPwd}
                                    onChangeText={setConfirmPwd}
                                    secureTextEntry={!showConfirmPwd}
                                    autoCapitalize="none"
                                    style={styles.inputWide}
                                    activeOutlineColor="#1c85fc"
                                    error={!!err.confirmPwd}
                                    right={
                                        <TextInput.Icon
                                            icon={showConfirmPwd ? "eye-off" : "eye"}
                                            onPress={() => setShowConfirmPwd((p) => !p)}
                                        />
                                    }
                                />

                                {!!err.confirmPwd && <HelperText type="error">{err.confirmPwd}</HelperText>}
                            </>
                        )}

                        {!!err.general && <HelperText type="error">{err.general}</HelperText>}
                    </Animated.View>

                </KeyboardAwareScrollView>

                {/* FOOTER */}
                <Animated.View style={[styles.footer, { bottom: kbBottom }]}>
                    <Animated.View style={loginHintStyle}>
                        <Button
                            mode="text"
                            onPress={() => navigation.replace("login")}
                            textColor="#1c85fc"
                            style={{ marginTop: 6 }}
                        >
                            Đã có tài khoản? <Text style={{ fontWeight: "700" }}>Đăng nhập</Text>
                        </Button>
                    </Animated.View>
                    {step === TOTAL_STEPS.length - 1 && (
                        <Animated.View style={styles.agreeRow}>
                            <Checkbox
                                status={accepted ? "checked" : "unchecked"}
                                onPress={() => {
                                    setAccepted((v) => !v);
                                    if (!accepted) {
                                        setErr((e) => ({ ...e, accepted: null }));
                                    }
                                }}
                            />
                            <Text
                                style={styles.agreeText}
                                onPress={() => setAccepted((v) => !v)}
                            >
                                Đồng ý <Text style={{ fontWeight: "700", textDecorationLine: "underline", color: "#1c85fc" }}>
                                    chia sẻ dữ liệu
                                </Text> cho nội bộ hệ thống để cải thiện trải nghiệm người dùng.
                            </Text>
                        </Animated.View>
                    )}

                    {step < TOTAL_STEPS.length - 1 ? (
                        <Button
                            mode="contained"
                            buttonColor="#1c85fc"
                            textColor="white"
                            style={styles.footerBtn}
                            contentStyle={{ paddingVertical: 10 }}
                            labelStyle={{ fontSize: 16, fontWeight: "600" }}
                            onPress={goNext}
                        >
                            Tiếp tục
                        </Button>
                    ) : (
                        <Button
                            mode="contained"
                            buttonColor="#1c85fc"
                            textColor="white"
                            style={styles.footerBtn}
                            contentStyle={{ paddingVertical: 10 }}
                            labelStyle={{ fontSize: 16, fontWeight: "600" }}
                            onPress={onSubmit}
                            loading={loading}
                            disabled={loading}
                        >
                            Hoàn tất đăng ký
                        </Button>
                    )}
                </Animated.View>
            </View>

            <SharedDialog ref={dialogRef} />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: "#f9fcff" },
    body: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 140,
    },
    topBar: {
        flexDirection: "row", alignItems: "center", marginBottom: 8,
        paddingTop: 24,
    },
    title: { fontSize: 22, fontWeight: "bold", color: "#1c85fc" },
    subtitle: { marginTop: 4, fontSize: 14, color: "#666" },
    form: { marginTop: 8, paddingHorizontal: 2 },
    row: { flexDirection: "row", gap: 12 },
    col: { flex: 1 },
    genderRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    genderText: { marginRight: 18, color: "#333" },

    formCentered: {
        flex: 1,
        paddingHorizontal: 2,
        justifyContent: "center",
    },
    bigLabel: {
        fontSize: 26,
        fontWeight: "700",
        color: "#0b203a",
        textAlign: "left",
        marginBottom: 12,
    },
    input: {
        marginTop: 12,
        backgroundColor: "white",
    },
    inputWide: {
        marginTop: 12,
        backgroundColor: "white",
        alignSelf: "stretch",
    },
    agreeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        marginTop: 12,
    },
    agreeText: { flex: 1, color: "#333" },


    // Footer cố định
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingBottom: 16,
        marginBottom: 16,
        paddingTop: 8,

    },
    footerBtn: { borderRadius: 14 },
});

export default Register;
