/**
 * Audit log for all random chore assignment game runs.
 * Every run is immutable — no deletions.
 */
import { create } from 'zustand';

export type GameId = 'spin_wheel' | 'dice_battle' | 'card_flip' | 'rocket_race' | 'plinko';

export type GameRun = {
  id: string;
  gameId: GameId;
  gameName: string;
  choreId: string;
  choreTitle: string;
  winner: string;
  participants: string[];
  ranBy: string;
  ranAt: number; // Unix ms
  seed: number;  // Stored for verifiability
};

interface RandomGamesState {
  log: GameRun[];
  addRun: (run: Omit<GameRun, 'id'>) => void;
}

export const useRandomGamesStore = create<RandomGamesState>((set) => ({
  log: [],
  addRun: (run) =>
    set((state) => ({
      log: [{ ...run, id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }, ...state.log],
    })),
}));
