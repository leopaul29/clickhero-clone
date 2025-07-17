import {useGameContext} from "../hooks/UseGameContext.tsx";

/**
 * @constructor
 */
export function Monster() {
    const {monster} = useGameContext();

    // Apply DPS damage every second
    // useEffect(() => {
    //     const dpsInterval = setInterval(() => {
    //         if (gameContext.dps > 0) {
    //             setMonster(prevState => {
    //                 if (prevState.life - gameContext.dps <= 0) {
    //                     gameContext.setGold(prevGold => prevGold + prevState.gold);
    //                     return MOB1;
    //                 } else {
    //                     return {...prevState, life: prevState.life - gameContext.dps};
    //                 }
    //             });
    //         }
    //     }, 1000);
    //
    //     return () => clearInterval(dpsInterval);
    // }, [gameContext.dps]);

    return <div>
        <h2>name: {monster.name}</h2>
        <div className="monster-visual"></div>
        <p>life: {monster.life}</p>
        <p>gold: {monster.gold}</p>
    </div>
}
