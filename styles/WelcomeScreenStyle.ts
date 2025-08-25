import { StyleSheet } from "react-native";

const WelcomeScreenStyle = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1c85fc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    width: "100%",
    borderRadius: 12,
    marginTop: 12,
  },
});

export default WelcomeScreenStyle;
