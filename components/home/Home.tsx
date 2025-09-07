import { FC } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainTabParamList } from "../../App";

type Props = NativeStackScreenProps<MainTabParamList, "home">;

const Home: FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Xin chào 👋</Text>
          <Text style={styles.subtitle}>Chào mừng đến với MindHealth</Text>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Khám phá</Text>
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            style={styles.actionBtn}
            onPress={() => {}}
          >
            Nhật ký
          </Button>
          <Button
            mode="contained"
            style={styles.actionBtn}
            onPress={() => navigation.navigate("chat")}
          >
            Trò chuyện
          </Button>
          <Button
            mode="contained"
            style={styles.actionBtn}
            onPress={() => navigation.navigate("profile")}
          >
            Hồ sơ
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0b203a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
  },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 2,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b203a",
    marginBottom: 12,
  },
  placeholder: {
    height: 160,
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: "#c7d2fe",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
  },
});

export default Home;
