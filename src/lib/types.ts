import type { CreatureRaceType, CreatureClassType } from "$lib/server/db/schema";
export interface RegistrationData {
    username: string;
    displayName: string;
    bio: string;
    preferences: {
      notifications: boolean;
      publicProfile: boolean;
    };
    class: CreatureClassType;
    race: CreatureRaceType;
  }