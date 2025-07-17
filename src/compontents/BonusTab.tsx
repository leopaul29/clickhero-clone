import { Bonus } from "./Bonus.tsx";
import {BONUSES} from "../data/monsters.ts";

/**
 * Display bonuses tab
 * @constructor
 */

export function BonusTab() {
    return <div>
        <table>
            <thead>
            <th>Name</th>
            </thead>
            <tbody>
            {BONUSES.map(
                (bonus, index) => (
                    <tr><Bonus key={index} bonus={bonus} /></tr>)
            )}
            </tbody>
        </table>
    </div>
}
