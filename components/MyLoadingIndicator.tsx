import { FC } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";

const MyLoadingIndicator: FC = () => {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color="#1c85fc" size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MyLoadingIndicator;
