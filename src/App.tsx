import './App.css'
import {Header} from "./components/Header.tsx";
import {Shop} from "./components/Shop.tsx";
import {BattleZone} from "./components/BattleZone.tsx";

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 relative overflow-hidden">
            <div>
                <Header/>
            </div>
            <div className="flex flex-col lg:flex-row gap-5 m-3 sm:m-5 justify-center items-stretch lg:items-start">
                <Shop/>
                <BattleZone/>
            </div>
        </div>
    )
}

export default App
