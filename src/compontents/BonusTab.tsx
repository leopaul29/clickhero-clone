import { Bonus } from "./Bonus.tsx";

/**
 *
 * @constructor
 */
const BONUS = [
    {name: "clickPower", description: "add click power", power: 5, level:0, cost:10},
    {name: "dpsPower", description: "add dps power", power: 3, level:0,cost:50}
]

export function BonusTab() {
    return <div>
        {BONUS.map(
            (bonus, index) => (<Bonus key={index} bonus={bonus} />)
        )}
    </div>
}
