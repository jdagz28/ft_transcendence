export interface TournamentSettings {
  gameMode: string; 
  maxPlayers: number;
}

export interface UserProfile {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface Player extends UserProfile {}

export interface Tournament {
  id: number;
  name: string;
  status: string;
  created: string;
  ended: string | null;
  created_by: UserProfile;
  settings: TournamentSettings;
  players: Player[];
}
