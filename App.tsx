import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useReducer, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/home/Home";
import { userReducer } from "./reducers/UserReducer";
import { SnackbarProvider, UserContext, UserDispatch } from "./configs/Contexts";
import api, { endpoints } from "./configs/Apis";
import Profile from "./components/profile/Profile";
import { MD3LightTheme, PaperProvider, useTheme } from "react-native-paper";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";

// ===== Types =====
export type RootStackParamList = {
  auth: undefined;
  mainTabs: undefined;
};
export type AuthStackParamList = {
  welcomeScreen: undefined;
  login: undefined;
  register: undefined;
};
export type MainTabParamList = {
  home: undefined;
  profile: undefined;
};

// ===== Navigators =====
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="welcomeScreen">
      <AuthStack.Screen name="welcomeScreen" component={WelcomeScreen} />
      <AuthStack.Screen name="login" component={Login} />
      <AuthStack.Screen name="register" component={Register} />
    </AuthStack.Navigator>
  );
}

const MainTabs = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // 1) Bỏ label
        tabBarShowLabel: false,

        // 2) Style thanh tab cho thoáng & icon to
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 12, 
          borderTopWidth: 0.5,
          borderTopColor: "#e5e7eb", // xám nhẹ
          backgroundColor: "#ffffff",
        },

        // 3) Màu active/inactive
        tabBarActiveTintColor: theme.colors.primary ?? "#1c85fc",
        tabBarInactiveTintColor: "#9aa0a6",

        // 4) Icon lớn hơn (bỏ qua size mặc định)
        tabBarIcon: ({ color, focused }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: "home",
            profile: "person-circle",
          };
          const name = map[route.name] ?? "ellipse";
          return (
            <Ionicons
              name={name}
              size={30}               // icon to hơn
              color={color}
              style={{ marginTop: 2 }} // cân giữa dọc
            />
          );
        },

        // 5) Tắt ripple effect bằng cách override nút
        tabBarButton: (props) => (
          <TouchableOpacity
            {...(props as TouchableOpacityProps)}
            activeOpacity={0.8}  // mờ nhẹ khi bấm (không ripple)
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        ),
      })}
    >
      <Tab.Screen name="home" component={Home} options={{ title: "Trang chủ" }} />
      <Tab.Screen name="profile" component={Profile} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
};
export default () => {
  const theme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#1c85fc',     // màu nút, highlight
      surface: '#b3c0dfff',     // nền dialog
      onSurface: '#333333',   // màu chữ
    },
  };

  const [user, dispatch] = useReducer(userReducer, null);
  const [loading, setLoading] = useState(false);

  // Khôi phục phiên nếu có refreshToken
  useEffect(() => {
    const checkLoginState = async () => {
      try {
        setLoading(true);
        const refreshToken = (await AsyncStorage.getItem("refreshToken"));
        if (refreshToken) {
          const res = await api.post(endpoints.refresh, { refresh_token: refreshToken }); // trả access/refresh mới
          await AsyncStorage.multiSet([
            ["accessToken", res.data.access_token],
            ["refreshToken", res.data.refresh_token],
          ]);
          const me = await api.get(endpoints.profile);
          dispatch({ type: "hydrate", payload: me.data });
        } else {
          dispatch({ type: "logout" });
        }
      } catch (err) {
        if (axios.isAxiosError(err)) {
          console.log("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }
        dispatch({ type: "logout" });
      } finally {
        setLoading(false);
      }
    };
    checkLoginState();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <UserContext.Provider value={user}>
          <UserDispatch.Provider value={dispatch}>
            <SnackbarProvider>
              <NavigationContainer>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                  {!user ? (
                    <RootStack.Screen name="auth" component={AuthNavigator} />
                  ) : (
                    <RootStack.Screen name="mainTabs" component={MainTabs} />
                  )}
                </RootStack.Navigator>
              </NavigationContainer>
            </SnackbarProvider>
          </UserDispatch.Provider>
        </UserContext.Provider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
