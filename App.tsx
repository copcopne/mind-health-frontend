import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useReducer, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Home from "./components/home/Home";
import { userReducer } from "./reducers/UserReducer";
import { SnackbarProvider, UserContext, UserDispatch } from "./configs/Contexts";
import { api, endpoints, getTokens, logout } from "./configs/Apis";
import Profile from "./components/profile/Profile";
import { MD3LightTheme, PaperProvider, useTheme } from "react-native-paper";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import Verify from "./components/auth/Verify";
import ForgotPassword from "./components/auth/ForgotPassword";
import { PortalHost, PortalProvider } from "@gorhom/portal";
import NoteDetail from './components/note/NoteDetails';

// ===== Types =====
export type RootStackParamList = {
  auth: undefined;
  mainTabs: undefined;
};
export type AuthStackParamList = {
  welcomeScreen: undefined;
  login: undefined;
  register: undefined;
  verify: { email: string, username?: string, password?: string };
  forgot: undefined;
};
export type MainTabParamList = {
  home: undefined;
  profile: undefined;
};
export type ProfileParamList = {
  profileStack: undefined;
  noteDetails: { id: number, navigation: any };
}

// ===== Navigators =====
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName="welcomeScreen">
      <AuthStack.Screen name="welcomeScreen" component={WelcomeScreen} />
      <AuthStack.Screen name="login" component={Login} />
      <AuthStack.Screen name="register" component={Register} />
      <AuthStack.Screen name="verify" component={Verify} />
      <AuthStack.Screen name="forgot" component={ForgotPassword} />
    </AuthStack.Navigator>
  );
}

const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName="profileStack">
      <ProfileStack.Screen name="profileStack" component={Profile} />
      <ProfileStack.Screen name="noteDetails" component={NoteDetail} />
    </ProfileStack.Navigator>
  );
}

const MainTabs = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const TAB_BASE = 50; // icon to vừa đẹp
  const tabBarHeight = TAB_BASE + Math.max(insets.bottom, 0);

  return (

    <Tab.Navigator id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,

        // 1) Bỏ label
        tabBarShowLabel: false,

        // 2) Style thanh tab cho thoáng & icon to
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
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
              size={30}
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
      <Tab.Screen name="profile" component={ProfileNavigator} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
};
export default () => {
  const theme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#1c85fc', // màu nút, highlight
      surface: '#b3c0dfff', // nền dialog
      onSurface: '#333333', // màu chữ
    },
  };

  const [user, dispatch] = useReducer(userReducer, null);
  const [loading, setLoading] = useState(false);

  // Khôi phục phiên nếu có refreshToken
  useEffect(() => {
    const checkLoginState = async () => {
      try {
        setLoading(true);

        // Lấy token từ SecureStore
        const { accessToken, refreshToken } = await getTokens();

        if (!accessToken && !refreshToken) {
          // Không có gì -> đăng xuất
          dispatch({ type: "logout" });
          return;
        }

        // Gọi thẳng profile (interceptor tự refresh nếu cần)
        const me = await api.get(endpoints.profile);
        dispatch({ type: "hydrate", payload: me.data });
      } catch (err) {
        // Bất kỳ lỗi nào -> coi như hết phiên
        await logout(); // clear SecureStore
        dispatch({ type: "logout" });
      } finally {
        setLoading(false);
      }
    };
    checkLoginState();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortalProvider>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <UserContext.Provider value={user}>
              <UserDispatch.Provider value={dispatch}>
                <SnackbarProvider>
                  <NavigationContainer>
                    <RootStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
                      {!user ? (
                        <RootStack.Screen name="auth" component={AuthNavigator} />
                      ) : (
                        <RootStack.Screen name="mainTabs" component={MainTabs} />
                      )}
                    </RootStack.Navigator>
                  </NavigationContainer>
                </SnackbarProvider>

                {/* Các PortalHost đặt làm sibling của NavigationContainer */}
                <PortalHost name="root_portal" />
                <PortalHost name="create_post_host" />
                {/* nếu CreatePostModal của em dùng host này */}
              </UserDispatch.Provider>
            </UserContext.Provider>
          </SafeAreaProvider>
        </PaperProvider>
      </PortalProvider>
    </GestureHandlerRootView>
  );
}
