import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import PlanPage from "./pages/PlanPage";
import ProvenancePage from "./pages/ProvenancePage";
import GuestBadge from "./components/GuestBadge";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import "./App.css";

function HomePage() {
  return (
    <div className="page">
      <h1 style={{ textAlign: "center" }}>PantherPark</h1>
      <p style={{ textAlign: "center" }}>
        Upload your class schedule, get told when to leave and which lot to drive to.
      </p>
      <p style={{ textAlign: "center" }}>
        <Link to="/map">View the live lot map →</Link>
      </p>
    </div>
  );
}

function NavBar() {
  const { isGuest, loading } = useAuth();
  return (
    <nav className="navbar">
      <div className="navbar-links">
        <Link to="/" className="navbar-brand">
          PantherPark
        </Link>
        <Link to="/map">Map</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/provenance">Data</Link>
        {/* Only show "Log in" when actually logged out -- otherwise it stuck
            around after a real login, which was confusing (GuestBadge
            already shows the signed-in email + a Sign out button). */}
        {!loading && isGuest && <Link to="/login">Log in</Link>}
      </div>
      <GuestBadge />
    </nav>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <NavBar />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/provenance" element={<ProvenancePage />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
