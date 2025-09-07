import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet } from "react-native";
import { Portal, Dialog, Button, Text } from "react-native-paper";

export type SharedDialogRef = {
  open: (opts: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  close: () => void;
};

const SharedDialog = forwardRef<SharedDialogRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<{
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({});

  useImperativeHandle(ref, () => ({
    open: (opts) => {
      setOptions(opts);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const handleCancel = () => {
    setVisible(false);
    options.onCancel?.();
  };

  const handleConfirm = () => {
    setVisible(false);
    options.onConfirm?.();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleCancel} style={styles.dialog}>
        {options.title && <Dialog.Title>{options.title}</Dialog.Title>}
        {options.message && (
          <Dialog.Content>
            <Text>{options.message}</Text>
          </Dialog.Content>
        )}
        <Dialog.Actions style={styles.actions}>
          {options.cancelText && (
            <Button onPress={handleCancel}>{options.cancelText}</Button>
          )}
          {options.confirmText && (
            <Button onPress={handleConfirm}>{options.confirmText}</Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
});

export default SharedDialog;

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: "#e6f0ff",
    borderRadius: 12,
  },
  actions: {
    justifyContent: "flex-end",
  },
});
