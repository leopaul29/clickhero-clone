import { useContext } from 'react';
import { GameContext } from '../context/GameContext.tsx';

/**
 * Header component displaying player stats
 * @constructor
 */
export function Header() {
    const gameContext = useContext(GameContext);

    return <div className="player-stats">
        <p>Current gold: {gameContext.gold}</p>
        <p>Click power: {gameContext.power}</p>
        <p>DPS: {gameContext.dps}</p>
    </div>
}
