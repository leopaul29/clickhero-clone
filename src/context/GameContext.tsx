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
    const [currentMonster, setCurrentMonster] = useState(MONSTERS[0]);
    const [isAttacking, setIsAttacking] = useState(false);

    const damageMonster = (damage:number) => {
        const newLife = Math.max(0, currentMonster.life - damage);

        if(newLife <= 0) {
            const reward = currentMonster.goldReward;
            setGold(prev => prev + reward);
            if(power > 5) {
                setCurrentMonster(getNextMonster(1));
            } else if(power > 10) {
                setCurrentMonster(getNextMonster(2));
            } else {
                setCurrentMonster(getNextMonster());
            }
        } else {
            setCurrentMonster(prev => ({ ...prev, life: newLife }));
            setCurrentMonster(prevCurrentMonster => ({...prevCurrentMonster, life: newLife}))
        }
    }

    const attackMonster=() => {
        if (isAttacking) return;

        setIsAttacking(true);

        damageMonster(power);
        setTimeout(() => setIsAttacking(false), 300);
    }
    const applyDps=()=> damageMonster(dps);
    const buyBonus= (bonus: Bonus) => {
        if (gold >= bonus.cost) {
            setGold(prev => prev - bonus.cost);

            switch (bonus.name) {
                case "clickPower":
                    setPower(prev => prev + bonus.power);
                    break;
                case "dpsPower":
                    setDps(prev => prev + bonus.power);
                    break;
            }
        }
    };

    return (
        <GameContext.Provider value={{gold, power, dps, currentMonster, isAttacking, attackMonster, applyDps, buyBonus}}>
            {children}
        </GameContext.Provider>
    );
};
