import { FC, useContext } from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainTabParamList, RootStackParamList } from "../../App";
import { UserDispatch } from "../../configs/Contexts";

type Props = NativeStackScreenProps<MainTabParamList, "home">;

const Home: FC<Props> = ({ navigation }) => {
  const userDispatch = useContext(UserDispatch)!;

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          MindHealth
        </Text>

        <Button
          mode="contained"
          buttonColor="#e74c3c"
          textColor="white"
          style={styles.button}
          onPress={() => userDispatch({
            type:"logout"
          })}
        >
          Đăng xuất
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1c85fc",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: "#555",
  },
  button: {
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 24,
  },
});

export default Home;
