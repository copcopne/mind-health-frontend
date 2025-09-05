import { FC, useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import CreateNoteSheet from "./CreateNoteSheet";

const CreateNoteModal: FC = () => {
    const bottomSheetRef = useRef(null);
    const handleAddButtonPress = () => {
        bottomSheetRef?.current?.open();
    }
    return (<>
        <View style={{ position: "relative" }}>
            <View style={{ backgroundColor: "#D4EBF8", position: "absolute", top: -22, borderRadius: 40, width: 80, height: 80 }}>
                <TouchableOpacity style={{ marginTop: 3, justifyContent: "center", alignItems: "center" }} onPress={handleAddButtonPress}>
                    <Icon size={40} source="plus-circle" color="#0A3981" />
                    <Text style={{ fontSize: 13, fontWeight: 700, color: "#0A3981" }}>Viết nhật ký</Text>
                </TouchableOpacity>
            </View>
        </View>
        <CreateNoteSheet ref={bottomSheetRef} />
    </>)
};
export default CreateNoteModal;