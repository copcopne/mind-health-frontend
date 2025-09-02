import { FC } from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import GlobalStyle from "../styles/GlobalStyle";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../App";
import WelcomeScreenStyle from "../styles/WelcomeScreenStyle";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<AuthStackParamList, "welcomeScreen">;

const WelcomeScreen: FC<Props> = ({ navigation }) => {
    return (
        <SafeAreaView style={[GlobalStyle.container, WelcomeScreenStyle.wrapper]}>
            <View style={WelcomeScreenStyle.content}>
                <Text style={WelcomeScreenStyle.title}>MindHealth</Text>
                <Text style={WelcomeScreenStyle.subtitle}>
                    Chào mừng bạn đến với hành trình chăm sóc sức khỏe tinh thần 💙
                </Text>
            </View>

            <View style={WelcomeScreenStyle.buttonContainer}>
                <Button
                    mode="contained"
                    buttonColor="#e7f3ff"
                    textColor="#1c85fc"
                    style={WelcomeScreenStyle.button}
                    contentStyle={{ paddingVertical: 6 }}
                    labelStyle={{ fontSize: 16, fontWeight: "600" }}
                    onPress={() => navigation.navigate("register")}
                >
                    Đăng ký
                </Button>

                <Button
                    mode="contained"
                    buttonColor="#1c85fc"
                    textColor="white"
                    style={WelcomeScreenStyle.button}
                    contentStyle={{ paddingVertical: 6 }}
                    labelStyle={{ fontSize: 16, fontWeight: "600" }}
                    onPress={() => navigation.navigate("login")}
                >
                    Đăng nhập
                </Button>
            </View>
        </SafeAreaView>
    );
};

export default WelcomeScreen;
