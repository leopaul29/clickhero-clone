import type {Bonus} from "../types/game.ts";
import {useGameContext} from "../hooks/UseGameContext.tsx";

/**
 * Display Bonus line
 * @constructor
 */
export function Bonus({ bonus }: { bonus: Bonus }) {
    const {buyBonus, gold} = useGameContext();

    return <>
        <td>name: {bonus.name}</td>
        <td>power: {bonus.power}</td>
        <td>level: {bonus.level}</td>
        <td>cost: {bonus.cost}</td>
        <td>
            <button
                onClick={() => buyBonus(bonus)}
                disabled={gold < bonus.cost}
            >
                BUY
            </button>
        </td>
    </>
}
