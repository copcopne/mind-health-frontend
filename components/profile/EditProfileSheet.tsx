import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useContext,
  useEffect,
} from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import {
  Text,
  Button,
  TextInput,
  HelperText,
  SegmentedButtons,
  Checkbox,
  ActivityIndicator,
} from "react-native-paper";
import { BackHandler, Keyboard, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { UserContext, UserDispatch } from "../../configs/Contexts";
import { api, endpoints } from "../../configs/Apis";

export type EditProfileSheetRef = { open: () => void; close: () => void };

type Props = {};

// ====== MÀU CHỦ ĐẠO XANH ======
const BLUE = "#1c85fc";
const BLUE_OUTLINE = "#cfe3ff";

const EditProfileSheet = forwardRef<EditProfileSheetRef, Props>(function EditProfileSheet(_props, ref) {
  const user = useContext(UserContext);
  const userDispatch = useContext(UserDispatch)!;

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [gender, setGender] = useState<boolean>(user?.gender ?? true); // true=Nam, false=Nữ
  const [acceptSharing, setAcceptSharing] = useState<boolean>(user?.acceptSharingData ?? false);

  const [loading, setLoading] = useState(false);
  const [errFirst, setErrFirst] = useState("");
  const [errLast, setErrLast] = useState("");

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["80%"], []);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }),
    []
  );

  useEffect(() => {
    if (!isSheetOpen) {
      Keyboard.dismiss();
      return;
    }
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      sheetRef.current?.close();
      return true;
    });
    return () => backHandler.remove();
  }, [isSheetOpen]);

  const validate = () => {
    let ok = true;
    if (!firstName.trim()) {
      setErrFirst("Vui lòng nhập Họ");
      ok = false;
    } else setErrFirst("");

    if (!lastName.trim()) {
      setErrLast("Vui lòng nhập Tên");
      ok = false;
    } else setErrLast("");

    return ok;
  };

  const onSave = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender,
        accept_sharing_data: acceptSharing,
      };
      const res = await api.patch(endpoints.profile, payload);
      userDispatch({ type: "hydrate", payload: res.data });
      sheetRef.current?.close();
    } catch (e: any) {
      console.error("Lỗi cập nhật profile:", e);
      console.error(e?.response?.status);
      console.error(e?.response);
    } finally {
      setLoading(false);
    }
  };

  // ====== Props chung cho TextInput để đồng bộ màu xanh
  const commonInputProps = {
    mode: "outlined" as const,
    outlineColor: BLUE_OUTLINE,
    activeOutlineColor: BLUE,
    selectionColor: BLUE,
    underlineColor: BLUE_OUTLINE,
    style: styles.input,
  };

  return (
    <Portal hostName="root_portal">
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(index) => setIsSheetOpen(index !== -1)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            pressBehavior="close"
          />
        )}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Button onPress={() => sheetRef.current?.close()} disabled={loading} textColor={BLUE}>
              HỦY
            </Button>
            <Text style={styles.title}>Chỉnh sửa thông tin</Text>
            <Button onPress={onSave} disabled={loading} textColor={BLUE}>
              {loading ? <ActivityIndicator animating /> : "LƯU"}
            </Button>
          </View>

          {/* Form */}
          <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid>
            {/* Email & Username (chỉ đọc) */}
            <TextInput
              label="Email"
              {...commonInputProps}
              value={user.email}
              disabled
              selectionColor={BLUE}
              outlineColor={BLUE_OUTLINE}
              activeOutlineColor={BLUE}
            />
            <TextInput
              label="Tên người dùng"
              {...commonInputProps}
              value={user.username}
              disabled
              selectionColor={BLUE}
              outlineColor={BLUE_OUTLINE}
              activeOutlineColor={BLUE}
            />

            {/* Họ & Tên */}
            <View style={styles.row}>
              <TextInput
                label="Họ"
                {...commonInputProps}
                style={[styles.inputHalf, styles.inputHalfLeft]}
                value={firstName}
                onChangeText={setFirstName}
                error={!!errFirst}
                returnKeyType="next"
                selectionColor={BLUE}
                outlineColor={BLUE_OUTLINE}
                activeOutlineColor={BLUE}
              />
              <TextInput
                label="Tên"
                {...commonInputProps}
                style={[styles.inputHalf, styles.inputHalfRight]}
                value={lastName}
                onChangeText={setLastName}
                error={!!errLast}
                returnKeyType="done"
                selectionColor={BLUE}
                outlineColor={BLUE_OUTLINE}
                activeOutlineColor={BLUE}
              />
            </View>
            {!!errFirst && <HelperText type="error">{errFirst}</HelperText>}
            {!!errLast && <HelperText type="error">{errLast}</HelperText>}

            {/* Giới tính */}
            <Text style={styles.sectionLabel}>Giới tính</Text>
            <SegmentedButtons
              value={gender === false ? "male" : "female"}
              onValueChange={(v: any) => setGender(v !== "male")}
              buttons={[
                { value: "male", label: "Nam" },
                { value: "female", label: "Nữ" },
              ]}
              style={styles.segment}
            />

            {/* Chia sẻ dữ liệu */}
            <View style={styles.checkboxRow}>
              <Checkbox
                status={acceptSharing ? "checked" : "unchecked"}
                onPress={() => setAcceptSharing((s) => !s)}
                color={BLUE}
              />
              <Text style={styles.checkboxText}>
                Cho phép chia sẻ dữ liệu nhật ký cho hệ thống
              </Text>
            </View>
          </KeyboardAwareScrollView>
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
});

export default React.memo(EditProfileSheet);

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  input: { flex: 1, marginVertical: 3 },
  sectionLabel: { marginTop: 8, marginBottom: 6, fontWeight: "600" },
  segment: { marginBottom: 8 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  checkboxText: { fontSize: 16, flexWrap: "wrap" },
  inputHalf: { flex: 1, marginVertical: 3 },
  inputHalfLeft: { marginRight: 6 },
  inputHalfRight: { marginLeft: 6 },
});
