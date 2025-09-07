import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Portal, Dialog, Button, Text } from "react-native-paper";

type Options = {
  title?: string;
  message?: string;
  tips?: string[];
  contactText?: string;
  cancelText?: string;
  onContact?: () => void;
  onCancel?: () => void;
};

export type WarningDialogRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  /** Nếu muốn cố định hành vi khi bấm "Liên hệ chuyên gia" */
  onContactPress?: () => void;
  /** Mặc định dialog không dismiss khi chạm nền; bật lại nếu cần */
  dismissable?: boolean;
};

const DEFAULTS: Required<Pick<Options, "title" | "message" | "tips" | "contactText" | "cancelText">> = {
  title: "Bạn không cô đơn",
  message:
    "Những lúc cảm thấy quá tiêu cực là điều có thể xảy ra. Hãy hít thở chậm lại và cho mình một chút thời gian.",
  tips: [
    "Viết ra điều bạn đang thấy khó khăn",
    "Liên hệ một người bạn hoặc người thân mà bạn tin tưởng",
    "Uống nước, rửa mặt, hoặc đi bộ vài phút để thư giãn",
  ],
  contactText: "Liên hệ chuyên gia",
  cancelText: "Đóng",
};

const WarningDialog = forwardRef<WarningDialogRef, Props>(
  ({ onContactPress, dismissable = false }, ref) => {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<Options>({});

    const merged = { ...DEFAULTS, ...options };

    const handleCancel = () => {
      setVisible(false);
      (options.onCancel ?? merged.onCancel)?.();
    };

    const handleContact = () => {
      setVisible(false);
      // Ưu tiên callback truyền vào khi mở, sau đó tới prop onContactPress
      (options.onContact ?? onContactPress)?.();
    };

    useImperativeHandle(ref, () => ({
      open: () => {
        setVisible(true);
      },
      close: () => setVisible(false),
    }));

    return (
      <Portal>
        <Dialog visible={visible} onDismiss={handleCancel} dismissable={dismissable} style={styles.dialog}>
          {/* Tiêu đề */}
          <Dialog.Title style={styles.title}>{merged.title}</Dialog.Title>

          {/* Nội dung */}
          <Dialog.Content>
            <Text style={styles.message}>{merged.message}</Text>

            {merged.tips?.length ? (
              <View style={styles.tipList}>
                {merged.tips.map((t, i) => (
                  <View key={i} style={styles.tipItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.tipText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.safetyNote}>
              Nếu bạn thấy mình có nguy cơ tự gây hại, hãy tìm trợ giúp ngay từ các dịch vụ khẩn cấp tại nơi bạn sống.
            </Text>
          </Dialog.Content>

          {/* Actions */}
          <Dialog.Actions style={styles.actions}>
            <Button mode="text" onPress={handleCancel}>
              {merged.cancelText}
            </Button>
            <Button mode="contained" onPress={handleContact}>
              {merged.contactText}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  }
);

export default WarningDialog;

const styles = StyleSheet.create({
  dialog: { borderRadius: 12, backgroundColor: "#e6f0ff" },
  title: { fontWeight: "700" },
  message: { marginBottom: 8, lineHeight: 20 },
  tipList: { marginTop: 4, marginBottom: 8 },
  tipItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  bullet: { marginRight: 6, lineHeight: 20 },
  tipText: { flex: 1, lineHeight: 20 },
  safetyNote: { marginTop: 8, fontSize: 12, opacity: 0.7 },
  actions: { justifyContent: "flex-end" },
});
