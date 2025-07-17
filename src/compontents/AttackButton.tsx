import {useGameContext} from "../hooks/UseGameContext.tsx";

export function AttackButton() {
    const {attackMonster} = useGameContext();

    return (
        <button onClick={attackMonster}>Attack !</button>
    )
}