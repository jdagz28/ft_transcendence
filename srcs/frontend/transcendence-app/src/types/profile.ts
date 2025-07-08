export interface MatchScore {
    matchId: number;
    userScore: number;
    opponentScore: number;
    scoreString: string;
}

export interface Match {
    gameId: number;
    created: string;
    ended: string;
    result: 'W' | 'L';
    finalScore: string;
    opponent: string;
    matchScores: MatchScore[];
    gameOptions: string;
    duration: string;
}

export interface UserProfile {
    avatar: string;
    username: string;
    nickname: string | null;
    email: string;
    created: string;
}