import React, { FC, useContext, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Appbar,
  Button,
  Divider,
  List,
  Portal,
  Dialog,
  TextInput,
  Text,
  useTheme,
} from "react-native-paper";
import { UserDispatch } from "../../configs/Contexts";
import { logout } from "../../configs/Apis";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsParamList } from "../../App";
import TopBar from "../common/TopBar";
import DeletionRequestSheet from "./DeletionRequestSheet";

type Props = NativeStackScreenProps<SettingsParamList, "settingsStack">;
const Settings: FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const deleteRef = useRef(null);
  const userDispatch = useContext(UserDispatch)!;

  const handleOpenDeletion = () => {
    deleteRef?.current?.open();
  };

  const doLogout = async () => {
    await logout();
    userDispatch({ type: "logout" });
  };

  return (
    <>
      <SafeAreaView style={styles.wrapper}>
        {/* Header */}
        <TopBar title="Cài dặt" />

        {/* Content */}
        <View style={styles.container}>
          <List.Section>
            <List.Subheader style={styles.sectionTitle}>Tài khoản</List.Subheader>

            <List.Item
              title="Đổi mật khẩu"
              left={(p) => <List.Icon {...p} icon="key-variant" />}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={() => navigation.navigate("changePassword")}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Yêu cầu xoá tài khoản"
              titleStyle={{ color: "#e74c3c" }}
              left={(p) => <List.Icon {...p} icon="alert-circle-outline" color="#e74c3c" />}
              onPress={() => handleOpenDeletion()}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Đăng xuất"
              titleStyle={{ color: theme.colors.primary }}
              left={(p) => <List.Icon {...p} icon="logout" color={theme.colors.primary} />}
              onPress={doLogout}
            />
          </List.Section>

          <View style={{ marginTop: 12 }}>
            <Text variant="bodySmall" style={{ color: "#8a8a8a", textAlign: "center" }}>
              MindHealth • v1.0.0
            </Text>
          </View>
        </View>

        <DeletionRequestSheet
          ref={deleteRef}
          onSubmitted={doLogout}
        />
      </SafeAreaView>
    </>
  );
};

export default Settings;

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f9fcff" },
  header: { backgroundColor: "#f9fcff", elevation: 0 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 64 },
  sectionTitle: { color: "#6b7280", marginBottom: 4 },
  divider: { marginLeft: 56, opacity: 0.3 },
  input: { marginTop: 8, backgroundColor: "white" },
});
