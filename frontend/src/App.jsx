import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Review from "./pages/Review";

function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Home />}
            />
            <Route
                path="/review"
                element={<Review />}
            />
        </Routes>
    );
}

export default App;