export interface LeaderboardUser {
  userId: number;
  username: string;
  totalGames: number;
  wins: number;
  losses: number;
  winPercentage: number;
}