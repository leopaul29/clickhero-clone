import './App.css'
import {Monster} from "./compontents/Monster.tsx";
import {BonusTab} from "./compontents/BonusTab.tsx";
import {Header} from "./compontents/Header.tsx";
import {AttackButton} from "./compontents/AttackButton.tsx";
import {DpsTimer} from "./compontents/DpsTimer.tsx";

function App() {

    return (
        <div className="app">
            <div>
                <h1>Player</h1>
                <Header/>
                <AttackButton/>
                <DpsTimer/>
            </div>
            <div className="split-screen">
                <div>
                    <h1>Bonus</h1>
                    <BonusTab/>
                </div>
                <div>
                    <h1>Monster</h1>
                    <Monster/>
                </div>
            </div>
        </div>
    )
}

export default App
