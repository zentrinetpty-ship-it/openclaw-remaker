import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CreatePage from "./pages/CreatePage";
import EditorPage from "./pages/EditorPage";
import DashboardPage from "./pages/DashboardPage";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

function App() {
  return (
    <div className="App min-h-screen bg-[#030712]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/editor/:projectId" element={<EditorPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
