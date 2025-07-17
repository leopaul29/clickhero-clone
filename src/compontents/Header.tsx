import {useGameContext} from "../hooks/UseGameContext.tsx";
/**
 * Header component displaying player stats
 * @constructor
 */
export function Header() {
    const {gold, power, dps} = useGameContext();

    return <div className="player-stats">
        <p>Current gold: {gold}</p>
        <p>Click power: {power}</p>
        <p>DPS: {dps}</p>
    </div>
}
