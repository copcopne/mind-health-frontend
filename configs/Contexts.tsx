import React, { createContext, Dispatch, ReactNode, useContext, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Portal, Snackbar } from "react-native-paper";
import type { User, UserAction } from "../reducers/UserReducer";

// ----- User Contexts -----
export const UserContext = createContext<User | null>(null);
export const UserDispatch = createContext<Dispatch<UserAction> | null>(null);

// ----- Snackbar Context -----
type SnackbarType = "success" | "error" | "info" | "warning";

export type SnackbarState = {
  visible: boolean;
  message: string;
  type: SnackbarType;
};

export type SnackbarContextValue = {
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>;
  // optional helper:
  showSnackbar: (message: string, type?: SnackbarType, durationMs?: number) => void;
};

export const SnackbarContext = createContext<SnackbarContextValue | null>(null);

type SnackbarProviderProps = {
  children: ReactNode;
  defaultType?: SnackbarType;
  defaultDuration?: number; // chỉ dùng cho helper showSnackbar (auto ẩn)
};

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
  defaultType = "success",
  defaultDuration = 3000,
}) => {
  const insets = useSafeAreaInsets();
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: "",
    type: defaultType,
  });

  const showSnackbar = (message: string, type: SnackbarType = defaultType, durationMs = defaultDuration) => {
    setSnackbar({ visible: true, message, type });
    if (durationMs > 0) {
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
      }, durationMs);
    }
  };

  return (
    <SnackbarContext.Provider value={{ setSnackbar, showSnackbar }}>
      {children}

      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
          duration={defaultDuration}
          style={{
            backgroundColor:
              snackbar.type === "success"
                ? "#4caf50"
                : snackbar.type === "error"
                ? "#f44336"
                : snackbar.type === "warning"
                ? "#ff9800"
                : "#2196f3", // info
            position: "absolute",
            bottom: insets.bottom + 60,
            left: 0,
            right: 0,
          }}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextValue => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return ctx;
};
