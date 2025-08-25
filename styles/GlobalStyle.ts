import { StyleSheet } from "react-native";

const GlobalStyle = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center"
    },
    wrapper: { 
        flex: 1, 
        backgroundColor: "#f9fcff" 
    },
    body: { 
        flex: 1 
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
});
export default GlobalStyle;