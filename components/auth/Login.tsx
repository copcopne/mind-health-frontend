import { FC, useContext, useState } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { Button, Text, TextInput, HelperText, IconButton, Portal, Dialog } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../App";
import api, { endpoints } from "../../configs/Apis";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserDispatch } from "../../configs/Contexts";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import TopBar from "../TopBar";
import axios from "axios";

type Props = NativeStackScreenProps<AuthStackParamList, "login">;

const Login: FC<Props> = ({ navigation }) => {
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPwd, setShowPwd] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [errId, setErrId] = useState<string | null>(null);
    const [errPwd, setErrPwd] = useState<string | null>(null);
    const [errGeneral, setErrGeneral] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState<boolean | false>(false);

    const userDispatch = useContext(UserDispatch)!;

    const validate = () => {
        let ok = true;
        setErrId(null);
        setErrPwd(null);

        if (!username!.trim()) {
            setErrId("Vui lòng nhập tên đăng nhập.");
            ok = false;
        };
        if (!password) {
            setErrPwd("Vui lòng nhập mật khẩu.");
            ok = false;
        };

        return ok;
    };

    const onLogin = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            const res = await api.post(endpoints['login'], {
                username: username,
                password: password
            });
            const user = await api.get(endpoints['profile'], {
                headers: {
                    Authorization: `Bearer ${res.data.access_token}`
                }
            });

            if (user.data.is_verified === false) {
                navigation.navigate("verify", {
                    email: user.data.email
                });
                return;
            }
            
            await AsyncStorage.multiSet([
                ["accessToken", res.data.access_token],
                ["refreshToken", res.data.refresh_token],
            ]);

            userDispatch({
                type: "login",
                payload: user.data
            });

        } catch (err: any) {
            let msg = "Hệ thống đang có lỗi, thử lại sau nhé!";
            if (axios.isAxiosError(err) && err.status === 400) {
                msg = err.response?.data?.message;
            } else {
                console.error(err);
                console.error(err.status);
                console.error(err.response?.data);
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
                            <Text style={styles.title}>MindHealth</Text>
                            <Text style={styles.subtitle}>Chào mừng bạn quay lại 💙</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            <TextInput
                                activeOutlineColor="#1c85fc"
                                mode="outlined"
                                label="Tên người dùng"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                style={styles.input}
                                error={!!errId}
                            />
                            {!!errId && <HelperText type="error">{errId}</HelperText>}

                            <TextInput
                                activeOutlineColor="#1c85fc"
                                mode="outlined"
                                label="Mật khẩu"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPwd}
                                autoCapitalize="none"
                                style={styles.input}
                                error={!!errPwd}
                                right={
                                    <TextInput.Icon
                                        icon={showPwd ? "eye-off" : "eye"}
                                        onPress={() => setShowPwd((p) => !p)}
                                    />
                                }
                            />
                            {!!errPwd && <HelperText type="error">{errPwd}</HelperText>}

                            {/* Forgot password */}
                            <Button
                                onPress={() => {/* TODO: điều hướng quên mật khẩu */ }}
                                compact
                                uppercase={false}
                                style={{ alignSelf: "flex-end", marginTop: -2 }}
                                textColor="#1c85fc"
                            >
                                Quên mật khẩu?
                            </Button>

                            <Button
                                mode="contained"
                                buttonColor="#1c85fc"
                                textColor="white"
                                style={styles.button}
                                contentStyle={{ paddingVertical: 8 }}
                                labelStyle={{ fontSize: 16, fontWeight: "600" }}
                                onPress={onLogin}
                                loading={loading}
                                disabled={loading}
                            >
                                Đăng nhập
                            </Button>

                            <Button
                                mode="text"
                                onPress={() => navigation.navigate("register")}
                                textColor="#1c85fc"
                                style={{ marginTop: 6 }}
                                labelStyle={{ fontSize: 15 }}
                            >
                                Chưa có tài khoản? <Text style={{ fontWeight: "700" }}>Đăng ký ngay</Text>
                            </Button>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>

            <Portal>
                <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
                    <Dialog.Title>Lỗi đăng nhập</Dialog.Title>
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
    wrapper: {
        flex: 1,
        backgroundColor: "#f9fcff",
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 54,
    },
    header: {
        marginTop: 12,
        marginBottom: 24,
        alignItems: "center",
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1c85fc",
    },
    subtitle: {
        marginTop: 6,
        fontSize: 15,
        color: "#666",
    },
    form: {
        marginTop: 8,
    },
    input: {
        marginTop: 12,
        backgroundColor: "white",
    },
    button: {
        marginTop: 18,
        borderRadius: 12,
    },
});

export default Login;
