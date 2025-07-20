import './App.css'
import {Monster} from "./compontents/Monster.tsx";
import {Header} from "./compontents/Header.tsx";
import {AttackButton} from "./compontents/AttackButton.tsx";
import {DpsTimer} from "./compontents/DpsTimer.tsx";
import {Shop} from "./compontents/Shop.tsx";

function App() {

    return (
        <div>
            <div>
                <Header/>
            </div>
            <div className="split-screen">
                <div>
                    <Shop/>
                </div>
                <div>
                    <h1>Monster</h1>
                    <Monster/>
                    <AttackButton/>
                    <DpsTimer/>
                </div>
            </div>
        </div>
    )
}

export default App
