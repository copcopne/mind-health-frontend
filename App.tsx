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
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import Verify from "./components/auth/Verify";
import ForgotPassword from "./components/auth/ForgotPassword";
import { PortalHost, PortalProvider } from "@gorhom/portal";
import Notes from './components/note/Notes';
import NoteDetails from './components/note/NoteDetails';
import Settings from './components/setting/Settings';
import ChatScreen from './components/chat/ChatScreen';
import Empty from './components/common/Empty';
import CreateNoteModal from './components/note/CreateNoteModal';
import MyLoadingIndicator from './components/common/MyLoadingIndicator';
import ChangePassword from './components/setting/ChangePassword';

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
  createNote: undefined;
  chat: undefined;
  settings: undefined;
};
export type ProfileParamList = {
  profileStack: undefined;
  notes: { navigation: any };
  noteDetails: { id: number };
}
export type SettingsParamList = {
  settingsStack: undefined;
  changePassword: undefined;
}

export type NotesParamList = {
  noteStack: undefined;
  noteDetails: { id: number, navigation: any };
}

// ===== Navigators =====
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileParamList>();
const NotesStack = createNativeStackNavigator<NotesParamList>();
const SettingsStack = createNativeStackNavigator<SettingsParamList>();
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

const NotesNavigator = () => {
  return (
    <NotesStack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName="noteStack" >
      <NotesStack.Screen name='noteStack' component={Notes} />
      <NotesStack.Screen name='noteDetails' component={NoteDetails} />
    </NotesStack.Navigator>
  )
}

const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName="profileStack" >
      <ProfileStack.Screen name="profileStack" component={Profile} />
      <ProfileStack.Screen name="notes" component={NotesNavigator} />
      <ProfileStack.Screen name="noteDetails" component={NoteDetails} />
    </ProfileStack.Navigator>
  );
}

const SettingNavigator = () => {
  return (
    <SettingsStack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName="settingsStack" >
      <SettingsStack.Screen name="settingsStack" component={Settings} />
      <SettingsStack.Screen name="changePassword" component={ChangePassword} />
    </SettingsStack.Navigator>
  )
}

const MainTabs = () => {
  const insets = useSafeAreaInsets();

  const TAB_BASE = 50;
  const tabBarHeight = TAB_BASE + Math.max(insets.bottom, 0);

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 0,
          backgroundColor: "#D4EBF8",
        },
        tabBarActiveTintColor: "#1F509A",
        tabBarInactiveTintColor: "#89A8B2",
        tabBarIcon: ({ color }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: "home",               // Trang chủ
            chat: "chatbubble-ellipses", // Trò chuyện
            profile: "person-circle",    // Hồ sơ
            settings: "settings",        // Cài đặt
          };
          const name = map[route.name] ?? "ellipse";
          if (route.name === "createNote")
            return null;
          return (
            <Ionicons
              name={name}
              size={30}
              color={color}
            />
          );
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...(props as TouchableOpacityProps)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        ),
      })}
    >
      <Tab.Screen name="home" component={Home} options={{ title: "Trang chủ" }} />
      <Tab.Screen name="chat" component={ChatScreen} options={{ title: "Trò chuyện AI" }} />
      <Tab.Screen name="createNote" component={Empty} options={{ title: "Tạo nhật ký mới", tabBarButton: () => <CreateNoteModal /> }} />
      <Tab.Screen name="profile" component={ProfileNavigator} options={{ title: "Hồ sơ" }} />
      <Tab.Screen name="settings" component={SettingNavigator} options={{ title: "Cài đặt" }} />
    </Tab.Navigator>

  );
};
export default () => {
  const BLUE = "#1c85fc";
  const BLUE_OUTLINE = "#cfe3ff";
  const BLUE_CONTAINER = "#e6f0ff";

  const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // ==== Chủ đạo xanh ====
    primary: BLUE,
    secondary: BLUE,          // một số control fallback vào đây
    tertiary: BLUE,           // phòng hờ
    
    // ==== TextInput MD3 ====
    outline: BLUE_OUTLINE,    // viền khi chưa focus
    onSurfaceVariant: "#4a607a", // label/placeholder/viền mờ

    // ==== SegmentedButtons MD3 ====
    secondaryContainer: BLUE_CONTAINER, // nền khi chọn
    onSecondaryContainer: "#0b203a",    // chữ khi chọn

    // ==== Dialog/Card surface xanh nhạt ====
    surface: BLUE_CONTAINER,
    surfaceContainer: BLUE_CONTAINER,
    surfaceContainerHigh: BLUE_CONTAINER,
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

  if (loading)
    return <MyLoadingIndicator />

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
