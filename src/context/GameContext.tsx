import {createContext, useState, type ReactNode} from "react";
import {BONUSES, MONSTERS} from "../data/monsters.ts";
import type {Bonus, GameContextType} from "../types/game.ts";
import {calculateReward, getNextMonster, updateBonusesStats} from "../utils/gameLogic.ts";

export const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameContextProviderProps {
    children: ReactNode;
}

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const [gold, setGold] = useState(0);
    const [power, setPower] = useState(1);
    const [dps, setDps] = useState(0);
    const [currentMonster, setCurrentMonster] = useState(MONSTERS[0]);
    const [isAttacking, setIsAttacking] = useState(false);
    const [combatLog, setCombatLog] = useState<string[]>([]);
    const [bonuses, setBonuses] = useState<Bonus[]>(BONUSES);

    const damageMonster = (damage:number, source:string = "Attaque") => {
        const newLife = Math.max(0, currentMonster.life - damage);

        if(newLife <= 0) {
            const reward: number = calculateReward(currentMonster.goldReward,bonuses[2].level,bonuses[2].power);

            setGold(prev => prev + reward);
            setCurrentMonster(getNextMonster());
            setCombatLog(prev => {
                return [...prev.slice(-4), `${currentMonster.nameJp} defeated ! +${reward} 金`];
            });
            setCurrentMonster(getNextMonster(currentMonster.id));
        } else {
            setCurrentMonster(prev => ({ ...prev, life: newLife }));
            setCurrentMonster(prevCurrentMonster => ({...prevCurrentMonster, life: newLife}))
            setCombatLog(prev => {
                return [...prev.slice(-4), `${source}: -${damage} HP`];
            });
        }
    }

    const attackMonster=() => {
        if (isAttacking) return;

        setIsAttacking(true);

        damageMonster(power,"刀攻撃");
        setTimeout(() => setIsAttacking(false), 300);
    }
    const applyDps=()=> damageMonster(dps, "Chi Energy");
    const buyBonus= (bonus: Bonus) => {
        if (gold >= bonus.cost) {
            setGold(prev => prev - bonus.cost);
            switch (bonus.id) {
                case 1:
                    setPower(prev => prev + bonus.power);
                    break;
                case 2:
                    setDps(prev => prev + bonus.power);
                    break;
            }

            const {newBonusCost, newBonusPower} = updateBonusesStats(bonus);
            setBonuses(prev => prev.map(b =>
                b.name === bonus.name
                    ? { ...b, level: b.level + 1, cost: newBonusCost, power: newBonusPower ,  }
                    : b
            ));

            setCombatLog((prev:string[]) => [...prev.slice(-4), `${bonus.nameJp} improved by ${bonus.power}!`]);
        }
    };

    return (
        <GameContext.Provider value={{gold, power, dps, currentMonster, isAttacking, attackMonster, applyDps, bonuses, buyBonus, combatLog}}>
            {children}
        </GameContext.Provider>
    );
};
