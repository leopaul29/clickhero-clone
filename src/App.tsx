import './App.css'
import {Header} from "./compontents/Header.tsx";
import {Shop} from "./compontents/Shop.tsx";
import {BattleZone} from "./compontents/BattleZone.tsx";

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
                    <BattleZone/>
                </div>
            </div>
        </div>
    )
}

export default App
