import './App.css'
import {Header} from "./compontents/Header.tsx";
import {Shop} from "./compontents/Shop.tsx";
import {BattleZone} from "./compontents/BattleZone.tsx";

function App() {

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 relative overflow-hidden">
            <div>
                <Header/>
            </div>
            <div className="flex flex-row gap-5 m-5">
                <div>
                    <Shop/>
                </div>
                <div className="grow">
                    <BattleZone/>
                </div>
            </div>
        </div>
    )
}

export default App
