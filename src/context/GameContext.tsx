import {useState, type ReactNode, useEffect, useCallback, createContext} from "react";
import {BONUSES, MONSTERS} from "../data/monsters.ts";
import type {Bonus, GameContextType} from "../types/game.ts";
import {calculateReward, getNextMonster, updateBonusesStats} from "../utils/gameLogic.ts";
import {
    clearLocalStorage,
    createDebouncedUpdater,
    load,
    storeBonuses,
    storeDps,
    storeGold,
    storePower
} from "../utils/storage.ts";

interface GameContextProviderProps {
    children: ReactNode;
}

const initializeGameState = () => {
    const savedData = load();
    return {
        gold: savedData.gold,
        power: savedData.power,
        dps: savedData.dps,
        bonuses: savedData.bonuses.length > 0 ? savedData.bonuses : BONUSES
    };
};

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const initialState  = initializeGameState();
    const [gold, setGold] = useState<number>(initialState.gold);
    const [power, setPower] = useState<number>(initialState.power);
    const [dps, setDps] = useState<number>(initialState.dps);
    const [bonuses, setBonuses] = useState<Bonus[]>(initialState.bonuses);

    const [currentMonster, setCurrentMonster] = useState(MONSTERS[0]);
    const [isAttacking, setIsAttacking] = useState(false);
    const [combatLog, setCombatLog] = useState<string[]>([]);

    const damageMonster = useCallback((damage:number, source:string = "Attaque") => {
        const newLife = Math.max(0, currentMonster.life - damage);

        if(newLife <= 0) {
            const reward: number = calculateReward(currentMonster.goldReward,bonuses[2].level,bonuses[2].power);
            const newGoldAmount = gold + reward;
            setGold(newGoldAmount);
            storeGold(newGoldAmount);
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
    },[setGold,setCurrentMonster,combatLog])

    const attackMonster=() => {
        if (isAttacking) return;

        setIsAttacking(true);

        damageMonster(power,"刀攻撃");
        setTimeout(() => setIsAttacking(false), 300);
    }
    const applyDps=()=> damageMonster(dps, "Chi Energy");
    const buyBonus= useCallback((bonus: Bonus) => {
        if (gold >= bonus.cost) {
            const newGoldAmount = gold - bonus.cost;
            setGold(newGoldAmount);
            storeGold(newGoldAmount);
            switch (bonus.id) {
                case 1:
                { const newPowerAmount= power + bonus.power;
                    setPower(newPowerAmount);
                    storePower(newPowerAmount)
                    break; }
                case 2:
                { const newDpsAmount = dps + bonus.power;
                    setDps(newDpsAmount);
                    storeDps(newDpsAmount);
                    break; }
            }

            const {newBonusCost, newBonusPower} = updateBonusesStats(bonus);
            setBonuses(prev => {
                const newBonuses = prev.map(b =>
                    b.name === bonus.name
                        ? {...b, level: b.level + 1, cost: newBonusCost, power: newBonusPower}
                        : b)
                storeBonuses(newBonuses);
                return newBonuses
                }
            );

            setCombatLog((prev:string[]) => [...prev.slice(-4), `${bonus.nameJp} improved by ${bonus.power}!`]);
        }
    },[])

    const debouncedUpdate = createDebouncedUpdater(300);
    useEffect(() => {
        debouncedUpdate({ gold, power, dps, bonuses });
    }, [gold, power, dps, bonuses]);


    const clearProgress = () => {
        setGold(0)
        setPower(10)
        setDps(0)
        setBonuses(BONUSES)
        clearLocalStorage()
    }

    return (
        <GameContext.Provider value={{gold, power, dps, currentMonster, isAttacking, attackMonster, applyDps, bonuses, buyBonus, combatLog,clearProgress}}>
            {children}
        </GameContext.Provider>
    );
};
