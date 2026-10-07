import './App.css'
import {Header} from "./components/Header.tsx";
import {Shop} from "./components/Shop.tsx";
import {ShikigamiCodex} from "./components/ShikigamiCodex.tsx";
import {BattleZone} from "./components/BattleZone.tsx";

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 relative overflow-hidden">
            <div>
                <Header/>
            </div>
            <div className="flex flex-col lg:flex-row gap-5 m-3 sm:m-5 justify-center items-stretch lg:items-start">
                {/* The shop and the collection share a column: one is where gold goes,
                    the other is what catching gives back, and the loop runs between them.

                    On a phone the column stacks, so the fight is ordered first: the panels
                    are things to read, the battle is the thing to touch, and making the
                    player scroll past two cards to reach it is backwards. */}
                <div className="flex flex-col gap-5 w-full lg:w-auto order-2 lg:order-1">
                    <Shop/>
                    <ShikigamiCodex/>
                </div>
                <div className="order-1 lg:order-2 w-full lg:w-auto flex">
                    <BattleZone/>
                </div>
            </div>
        </div>
    )
}

export default App
