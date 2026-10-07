import {createContext} from "react";
import type {GameContextType} from "../types/game.ts";

// Kept in its own module so the provider file only exports a component,
// which is what React Fast Refresh needs to hot-reload it.
export const GameContext = createContext<GameContextType | undefined>(undefined);
