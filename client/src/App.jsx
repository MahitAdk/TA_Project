import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdGenerator from "./pages/AdGenerator";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/ad-generator" element={<AdGenerator />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
