//Taste d: Theme toggle
import { Map } from "./components/Map";
import { Input } from "./components/ui/input";
export default function App() {
    return (
        <>
            <Input
                placeholder="Suche..."
                className="fixed top-5 left-5 z-9999 w-64 bg-gray-500!"
            />
            <Map />
        </>
    );
}
