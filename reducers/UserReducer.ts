export type User = {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  gender: boolean;
  acceptSharingData: boolean;
} | null;

export type UserState = User | null;

function mapUser(data: any): User {
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    firstName: data.first_name,
    lastName: data.last_name,
    gender: data.gender,
    acceptSharingData: data.accept_sharing_data,
  };
}


export type UserAction =
  | { type: "login" | "hydrate"; payload: User }
  | { type: "logout" };

export const userReducer = (current: User, action: UserAction): UserState => {
  switch (action.type) {
    case "login":
    case "hydrate":
      return mapUser(action.payload);

    case "logout":
      return null;

    default:
      return current;
  }
};
