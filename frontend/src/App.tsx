import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import PlanPage from "./pages/PlanPage";
import ProvenancePage from "./pages/ProvenancePage";
import GuestBadge from "./components/GuestBadge";
import { AuthProvider } from "./context/AuthProvider";
import "./App.css";

function HomePage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>PantherPark</h1>
      <p>Upload your class schedule, get told when to leave and which lot to drive to.</p>
      <p>
        <Link to="/map">View the live lot map →</Link>
      </p>
    </div>
  );
}

function NavBar() {
  return (
    <nav
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "0 16px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/" style={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}>
          PantherPark
        </Link>
        <Link to="/map">Map</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/provenance">Data</Link>
        <Link to="/login">Log in</Link>
      </div>
      <GuestBadge />
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/provenance" element={<ProvenancePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
