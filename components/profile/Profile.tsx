import { FC, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, Card } from "react-native-paper";
import { UserContext } from "../../configs/Contexts";
import { api, endpoints } from "../../configs/Apis";
import EditProfileSheet, { EditProfileSheetRef } from "./EditProfileSheet";
import { mapNote, Note } from "../../configs/Types";
import NoteCard from "./NoteCard";
import { ProfileParamList } from "../../App";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<ProfileParamList, "profile">;

const Profile: FC<Props> = ({ navigation }) => {
  const user = useContext(UserContext);
  const editRef = useRef<EditProfileSheetRef>(null);
  const openEdit = () => {
    console.log("ref =", editRef.current);
    editRef.current?.open();
  };

  const [moodEndtries, setMoodEntries] = useState<Note[]>([]);
  const [page, setPage] = useState<number>(0);

  const loadMoodEntries = async () => {
  if (page >= 0) {
    try {
      let res = await api.get(endpoints.moodEntries);
      console.log(res.data);

      if (res.data.content.length > 0) {
        const mapped = res.data.content.map((item: any) => mapNote(item));
        setMoodEntries(mapped);
      }
      if (res.data.hasNext == false)
        setPage(-1);
    } catch (err: any) {
      console.error(err);
    }
  }
};
  useEffect(() => {
    loadMoodEntries();
  }, []);
  return (
    <SafeAreaView style={styles.wrapper}>
      {/* Header user info */}
      <Card style={styles.card}>
        <Card.Content style={styles.header}>
          <Text style={styles.name}>
            {user?.firstName + " " + user?.lastName}
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

            <Button
              mode="outlined"
              textColor="#1c85fc"
              style={styles.editBtn}
              onPress={() => {
                console.log("Logout");
              }}
            >
              Đăng xuất
            </Button>
          </View>
        </Card.Content>
      </Card>


      {/* Placeholder content */}
      <View style={styles.body}>
        {moodEndtries.map(m => <NoteCard key={m.id} note={m} navigation={navigation} ></NoteCard> )}
      </View>

      <EditProfileSheet ref={editRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
    padding: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 2,
    marginBottom: 20,
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
  editBtn: {
    borderRadius: 12,
    borderColor: "#1c85fc",
    flex: 1,                // cho 2 nút chia đều
    marginHorizontal: 4,    // khoảng cách giữa 2 nút
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    fontSize: 16,
    color: "#888",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between", // cách đều 2 nút
    width: "100%",
  }
});

export default Profile;
