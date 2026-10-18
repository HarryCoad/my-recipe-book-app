import { APIResponse } from '@/helpers/axios';

// The logged-in user, from login, signup, GET /users/user-details and PATCH /users/update-me
export interface User {
  id: string;
  username: string;
  email: string;
  photo: string;
  // Hides their saved recipes from their profile for everyone else
  bPrivateSaves: boolean;
}

// Someone's public profile, from GET /users/:id. Never includes their email
export type PublicUser = Pick<User, 'id' | 'username' | 'photo' | 'bPrivateSaves'>;
export type UserProfileResponse = APIResponse<{ user: PublicUser }>;

// GET /users/user-details: `data` is the user itself
export type UserDetailsResponse = APIResponse<User>;

// PATCH /users/update-me. Both fields are optional
export type UpdateMeBody = { username?: string; bPrivateSaves?: boolean };
export type UpdateMeResponse = APIResponse<{ user: User }>;
