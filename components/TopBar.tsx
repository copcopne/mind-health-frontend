import React from "react";
import { View, StyleSheet } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
  rightText?: string;          // ví dụ: "1/5" cho Register, để trống cho Login
  paddingH?: number;           // padding ngang, mặc định 20 để khớp layout
};

const HEADER_HEIGHT = 56;      // chiều cao cố định của thanh header (không tính safe area)

export const TopBar: React.FC<Props> = ({ onBack, rightText, paddingH = 20 }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,            // tôn trọng safe area
          height: insets.top + HEADER_HEIGHT,
          paddingHorizontal: paddingH,
        },
      ]}
    >
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={onBack}
        iconColor="#1c85fc"
        style={{ margin: 0 }}                // *** xoá margin mặc định ***
      />
      <View style={{ flex: 1 }} />
      {rightText ? (
        <Text style={{ color: "#1c85fc", minWidth: 44, textAlign: "right" }}>
          {rightText}
        </Text>
      ) : (
        // Giữ chỗ để nút back không xê dịch giữa các màn
        <View style={{ width: 44 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 10,
  },
});

export const TOPBAR_TOTAL_HEIGHT = (insetsTop: number) => insetsTop + HEADER_HEIGHT;
export default TopBar;
