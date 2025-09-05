import { FC, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, Card, Divider, Chip } from "react-native-paper";
import { UserContext } from "../../configs/Contexts";
import { api, endpoints } from "../../configs/Apis";
import EditProfileSheet, { EditProfileSheetRef } from "./EditProfileSheet";
import { mapNote, Note } from "../../configs/Types";
import { ProfileParamList } from "../../App";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import NoteCard from "../note/NoteCard";
import CreateNoteSheet, { CreateNoteSheetRef } from "../note/CreateNoteSheet";

type Props = NativeStackScreenProps<ProfileParamList, "profileStack">;

const Profile: FC<Props> = ({ navigation }) => {
  const createRef = useRef<CreateNoteSheetRef>(null);
  const user = useContext(UserContext);
  const editRef = useRef<EditProfileSheetRef>(null);

  const openEdit = () => editRef.current?.open();

  const [moodEntries, setMoodEntries] = useState<Note[]>([]);

  const loadMoodEntries = async () => {
    try {
      const res = await api.get(endpoints.moodEntries, { params: { size: 3 } });
      if (res.data?.content?.length > 0) {
        setMoodEntries(res.data.content.map((item: any) => mapNote(item)));
      } else {
        setMoodEntries([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMoodEntries();
  }, []);

  return (
    <SafeAreaView style={styles.wrapper} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ===== Profile Card ===== */}
        <Card style={styles.card}>
          <Card.Content style={styles.header}>
            <Text style={styles.name}>
              {(user?.firstName ?? "") + " " + (user?.lastName ?? "")}
            </Text>

            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                textColor="#1c85fc"
                style={styles.editBtn}
                onPress={openEdit}
              >
                Chỉnh sửa thông tin
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* ===== Stats Card (placeholder) ===== */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Thống kê cảm xúc</Text>
              <Chip compact mode="flat" style={styles.rangeChip}>7 ngày gần đây</Chip>
            </View>

            {/* Placeholder biểu đồ */}
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>
                Biểu đồ sẽ hiển thị ở đây
              </Text>
            </View>

            {/* Gợi ý chú thích (placeholder) */}
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
              <Text style={styles.legendText}>Điểm cảm xúc trung bình</Text>
            </View>
          </Card.Content>
        </Card>

        {/* ===== Notes (3 items) ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nhật ký gần đây</Text>
          <Button
            compact
            mode="text"
            onPress={() => {
              navigation.navigate("notes");
            }}
            style={styles.viewAllBtn}
            labelStyle={styles.viewAllLabel}
          >
            Xem tất cả
          </Button>
        </View>

        {moodEntries.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ color: "#6b7280", marginBottom: 8 }}>
                Chưa có nhật ký nào.
              </Text>
              <Button
                mode="contained"
                onPress={() => createRef.current?.open()}
              >
                Tạo nhật ký đầu tiên
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {moodEntries.map((m) => (
              <NoteCard key={m.id} note={m} navigation={navigation} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sheets */}
      <CreateNoteSheet
        ref={createRef}
        onCreated={() => {
          loadMoodEntries();
        }}
      />
      <EditProfileSheet ref={editRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 2,
    marginBottom: 16,
  },
  header: {
    alignItems: "flex-start",
    paddingVertical: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0b203a",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  editBtn: {
    flex: 1,
    borderRadius: 12,
    borderColor: "#1c85fc",
  },

  /* ===== Section Header (title + xem tất cả) ===== */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b203a",
  },
  viewAllBtn: {
    marginRight: -8,
  },
  viewAllLabel: {
    fontSize: 14,
  },

  /* ===== Stats card ===== */
  rangeChip: {
    backgroundColor: "#EEF5FF",
  },
  chartPlaceholder: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: "#c7d2fe",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  chartPlaceholderText: {
    color: "#6b7280",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: "#4b5563",
  },
});

export default Profile;
