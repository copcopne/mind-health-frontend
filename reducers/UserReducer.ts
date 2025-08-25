import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  gender: boolean;
} | null;

export type UserAction =
  | { type: "login" | "hydrate"; payload: User }
  | { type: "logout" };

export const userReducer = (current: User, action: UserAction): User => {
  switch (action.type) {
    case "login":
    case "hydrate":
      return action.payload;

    case "logout":
      AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
      return null;

    default:
      return current;
  }
};
