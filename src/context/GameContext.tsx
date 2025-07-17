import {createContext, useState, type ReactNode} from "react";
import {MONSTERS} from "../data/monsters.ts";
import type {Bonus, GameContextType} from "../types/game.ts";
import {getNextMonster} from "../utils/gameLogic.ts";

export const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameContextProviderProps {
    children: ReactNode;
}

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const [gold, setGold] = useState(10);
    const [power, setPower] = useState(1);
    const [dps, setDps] = useState(0);
    const [monster, setMonster] = useState(MONSTERS[0]);

    const damageMonster = (damage:number) => {
        const newLife = monster.life - damage;

        if(newLife <= 0) {
            setGold(prevGold => prevGold + monster.gold);
            if(power > 5) {
                setMonster(getNextMonster(1));
            } else if(power > 10) {
                setMonster(getNextMonster(2));
            } else {
                setMonster(getNextMonster());
            }
        } else {
            setMonster(prevMonster => ({...prevMonster, life: newLife}))
        }
    }

    const attackMonster=() => damageMonster(power);
    const applyDps=()=> damageMonster(dps);
    const buyBonus= (bonus: Bonus) => {
        if (gold >= bonus.cost) {
            setGold(prevGold => prevGold - bonus.cost);

            if (bonus.name === "clickPower") {
                setPower(prevPower => prevPower + bonus.power);
            } else if (bonus.name === "dpsPower") {
                setDps(prevDps => prevDps + bonus.power);
            }
        }
    };

    return (
        <GameContext.Provider value={{gold, power, dps, monster, attackMonster, applyDps, buyBonus}}>
            {children}
        </GameContext.Provider>
    );
};
