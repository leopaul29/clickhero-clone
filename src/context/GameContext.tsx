import {createContext, useState, type ReactNode} from "react";

export interface MonsterProps {
    name: string,
    life: number,
    gold: number,
}

export interface BonusProps {
    name: string;
    description: string;
    power: number;
    level: number;
    cost: number;
}

interface GameContextType {
    gold: number;
    power: number;
    dps: number;
    monster: MonsterProps;
    attackMonster: () => void;
    applyDps: () => void;
    buyBonus: (bonus: BonusProps) => void;
    bonusList: BonusProps[];
}
export const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameContextProviderProps {
    children: ReactNode;
}

const MOB1 = {name: 'rototo', life: 10, gold: 1};
//const MOB2= {name: 'putipito', life: 25, gold: 3};

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const [gold, setGold] = useState(10);
    const [power, setPower] = useState(1);
    const [dps, setDps] = useState(0);
    const [monster, setMonster] = useState(MOB1);

    const damageMonster = (damage:number) => {
        const newLife = monster.life - damage;

        if(newLife <= 0) {
            setGold(prevGold => prevGold + monster.gold);
            setMonster(getNextMonster());
        } else {
            setMonster(prevMonster => ({...prevMonster, life: newLife}))
        }
    }

    function getNextMonster() {
        return MOB1;
    }

    const attackMonster=() => {
        damageMonster(power);
    }

    const applyDps=()=> {
        damageMonster(dps);
    }

    function buyBonus(bonus: BonusProps){
        console.log("buyBonus");
        if (gold >= bonus.cost) {
            setGold(prevGold => prevGold - bonus.cost);

            if (bonus.name === "clickPower") {
                setPower(prevPower => prevPower + bonus.power);
            } else if (bonus.name === "dpsPower") {
                setDps(prevDps => prevDps + bonus.power);
            }

            // Update bonus level and cost (would need to be handled in parent component)
        }
    }

    return (
        <GameContext.Provider value={{gold, power, dps, monster, attackMonster, applyDps, buyBonus}}>
            {children}
        </GameContext.Provider>
    );
};
