import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform, InteractionManager } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

type Props = {
  onBack?: () => void;
  title?: string;
  rightText?: string;
  paddingH?: number;
};

const HEADER_HEIGHT = 56;
const SIDE = 56;

export const TopBar: React.FC<Props> = ({ onBack, title, rightText, paddingH = 20 }) => {
  const insets = useSafeAreaInsets();
  const totalH = insets.top + HEADER_HEIGHT;

  // Delay BlurView để tránh “tràn full-screen” ở frame đầu trên Android
  const [showBlur, setShowBlur] = useState(Platform.OS !== "android" ? true : false);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const task = InteractionManager.runAfterInteractions(() => setShowBlur(true));
    return () => {
      task?.cancel?.();
    };
  }, [totalH]);

  return (
    <View style={[styles.wrapper, { height: totalH }]}>
      <View style={[styles.blurContainer, { height: totalH }]}>
        {showBlur ? (
          <BlurView
            pointerEvents="none"
            intensity={50}
            tint="light"
            style={{ width: "100%", height: "100%" }}
            {...(Platform.OS === "android" ? { experimentalBlurMethod: "dimezisBlurView" } : {})}
          />
        ) : (
          // Fallback: màu mờ nhẹ 1-2 frame đầu (Android)
          <View
            pointerEvents="none"
            style={{ width: "100%", height: "100%", backgroundColor: "rgba(255,255,255,0.72)" }}
          />
        )}
      </View>

      {/* CONTENT */}
      <View
        style={[
          styles.contentRow,
          { paddingTop: insets.top, paddingHorizontal: paddingH, height: totalH },
        ]}
        needsOffscreenAlphaCompositing
        renderToHardwareTextureAndroid
      >
        {/* LEFT */}
        <View style={styles.side}>
          {!!onBack && (
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={onBack}
              iconColor="#1c85fc"
              style={{ margin: 0, padding: 0 }}
              accessibilityLabel="Quay lại"
            />
          )}
        </View>

        {/* CENTER */}
        <View style={styles.center}>
          {!!title && <Text style={styles.title}>{title}</Text>}
        </View>

        {/* RIGHT */}
        <View style={styles.side}>{!!rightText && <Text style={styles.rightText}>{rightText}</Text>}</View>
      </View>

      {/* Hairline */}
      <View pointerEvents="none" style={styles.hairline} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0, right: 0, top: 0,
    backgroundColor: "transparent",
    zIndex: 10,
    elevation: 0,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  side: {
    width: SIDE,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1c85fc",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  rightText: { color: "#1c85fc", fontSize: 16 },
  hairline: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
});

export default TopBar;
