import {type BonusProps} from '../context/GameContext.tsx';
import {useGameContext} from "../hooks/UseGameContext.tsx";

/**
 * @constructor
 */
export function Bonus({ bonus }: { bonus: BonusProps }) {
    const {buyBonus, gold} = useGameContext();

    return <div>
        <h2>name: {bonus.name}</h2>
        <p>description: {bonus.description}</p>
        <p>power: {bonus.power}</p>
        <p>level: {bonus.level}</p>
        <p>cost: {bonus.cost}</p>
        <button 
            onClick={() => buyBonus(bonus)}
            disabled={gold < bonus.cost}
        >
            BUY
        </button>
    </div>
}
