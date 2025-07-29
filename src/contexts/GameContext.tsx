import {useState, type ReactNode, useEffect, useCallback, createContext, useMemo} from "react";
import {BONUSES, MONSTERS} from "../data/monsters.ts";
import type {Bonus, GameContextType, Monster, PersistentState} from "../types/game.ts";
import {calculateReward, getMonsterById, getNextMonsterId, updateBonusesStats} from "../utils/gameLogic.ts";
import {clearLocalStorage} from "../utils/storage.ts";

interface GameContextProviderProps {
    children: ReactNode;
}
function initializeGameState():PersistentState {
    return {
        gold: 20,
        power: 1,
        dps: 0,
        bonuses: BONUSES,
        currentMonsterId: 1
    };
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const [persistentData, setPersistentData] = useState<PersistentState>(initializeGameState());

    const currentMonster:Monster = useMemo(() => {
            return getMonsterById(persistentData.currentMonsterId) || MONSTERS[0]
        },
        [persistentData.currentMonsterId]
    );
    const [monsterLife,setMonsterLife] = useState<number>(currentMonster.life);
    useEffect(() => {
        setMonsterLife(currentMonster.life);
    }, [currentMonster.id]);

    const [isAttacking, setIsAttacking] = useState(false);
    const [combatLog, setCombatLog] = useState<string[]>([]);

    const damageMonster = useCallback((damage:number, source:string = "Attaque") => {
        const newLife = Math.max(0, monsterLife - damage);

        if(newLife <= 0) {
            const reward: number = calculateReward(currentMonster.goldReward,persistentData.bonuses[2].level,persistentData.bonuses[2].power);
            setPersistentData(prev => ({
                ...prev,
                gold: prev.gold + reward,
                currentMonsterId: getNextMonsterId(prev.currentMonsterId)
            }));

            setCombatLog(prev => {
                return [...prev.slice(-4), `${currentMonster.nameJp} defeated ! +${reward} 金`];
            });
        } else {
            setMonsterLife(newLife);
            setCombatLog(prev => {
                return [...prev.slice(-4), `${source}: -${damage} HP`];
            });
        }
    },[currentMonster, persistentData.bonuses, monsterLife])

    const attackMonster=() => {
        if (isAttacking) return;

        // console.log("attack power",persistentData.power)
        setIsAttacking(true);

        damageMonster(persistentData.power,"刀攻撃");
        setTimeout(() => setIsAttacking(false), 300);
    }
    const applyDps=()=> damageMonster(persistentData.dps, "Chi Energy");
    const buyBonus= useCallback((bonus: Bonus) => {
        if (persistentData.gold >= bonus.cost) {
            const {newBonusCost, newBonusPower} = updateBonusesStats(bonus);

            setPersistentData(prev => ({
                ...prev,
                gold: prev.gold - bonus.cost,
                power: bonus.id === 1 ? prev.power + bonus.power : prev.power,
                dps: bonus.id === 2 ? prev.dps + bonus.power : prev.dps,
                bonuses: prev.bonuses.map(b =>
                    b.name === bonus.name
                        ? {...b, level: b.level + 1, cost: newBonusCost, power: newBonusPower}
                        : b)
            }));

            setCombatLog((prev:string[]) => [...prev.slice(-4), `${bonus.nameJp} improved by ${bonus.power}!`]);
        }
    },[persistentData, setPersistentData])

    const clearProgress = () => {
        setPersistentData(prevState => ({
            ...prevState,
            gold: 0,
            power:10,
            dps:0,
            bonuses:BONUSES
        }))
        clearLocalStorage()
    }

    const contextValue = useMemo(() => ({
        persistentData: persistentData,
        monsterData: { currentMonster, monsterLife },
        combatData: { isAttacking, combatLog },
        actions: { attackMonster, applyDps, buyBonus, clearProgress }
    }), [persistentData, currentMonster, monsterLife, isAttacking, combatLog]);

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
