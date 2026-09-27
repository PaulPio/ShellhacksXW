import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import PlanPage from "./pages/PlanPage";
import ProvenancePage from "./pages/ProvenancePage";
import GuestBadge from "./components/GuestBadge";
import ErrorBoundary from "./components/ErrorBoundary";
import PantherMark from "./components/PantherMark";
import { AuthProvider } from "./context/AuthProvider";
import "./App.css";

const NAV_LINKS = [
  { to: "/map", label: "Live map" },
  { to: "/upload", label: "Upload schedule" },
  { to: "/plan", label: "My plan" },
  { to: "/provenance", label: "Data" },
];

const STEPS = [
  {
    index: "Step 01",
    title: "Upload your schedule",
    body: "Drop in your FIU schedule PDF or a screenshot. It's parsed in memory and discarded — nothing is stored.",
  },
  {
    index: "Step 02",
    title: "We model the lot",
    body: "Real Fall 2026 registrar sections give us a campus arrival curve, calibrated against live occupancy readings.",
  },
  {
    index: "Step 03",
    title: "Leave at the right time",
    body: "For every class you get a target arrival, the nearest lot with space, and directions — plus a fallback if it fills.",
  },
];

function HomePage() {
  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-invert">Modesto A. Maidique Campus</span>
            <h1>Park first. Panic never.</h1>
            <p className="hero-lede">
              PantherPark reads your class schedule and tells you when to leave and which lot to
              drive to — using live FIU parking occupancy, not guesswork.
            </p>
            <div className="hero-actions">
              <Link to="/upload" className="btn btn-primary">
                Upload your schedule
              </Link>
              <Link to="/map" className="btn btn-outline-invert">
                View the live map
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="section-sunken">
        <div className="section-inner">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">Three steps to a parking space</h2>
          <div className="card-grid">
            {STEPS.map((step) => (
              <article key={step.index} className="card card-step">
                <span className="step-index">{step.index}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">Straight answers</span>
        <h2 className="section-title">Every number says where it came from</h2>
        <p className="lede" style={{ marginTop: 24 }}>
          A reading from FIU's parking API is tagged <strong>live</strong>. A projection built from
          registrar data and calibrated against observed occupancy is tagged{" "}
          <strong>modelled</strong>. Anything we don't have enough history for is tagged{" "}
          <strong>simulated</strong>. We never present a guess as a measurement.
        </p>
        <p style={{ marginTop: 24 }}>
          <Link to="/provenance" className="btn btn-ghost">
            See the data provenance
          </Link>
        </p>
      </section>
    </>
  );
}

function NavBar() {
  return (
    <>
      <div className="utility-bar">
        <div className="utility-bar-inner">
          <span className="utility-tag">Florida International University</span>
          <span>Live occupancy · updated every minute</span>
        </div>
      </div>
      <nav className="navbar" aria-label="Primary">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <PantherMark className="navbar-mark" />
            PantherPark
          </Link>
          <ul className="navbar-links">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    isActive ? "navbar-link is-current" : "navbar-link"
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="navbar-end">
            <GuestBadge />
          </div>
        </div>
      </nav>
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <strong>PantherPark</strong>
          Built for ShellHacks 2026. Not an official FIU service.
        </div>
        <div>
          Occupancy from the{" "}
          <a href="https://parking.fiu.edu" target="_blank" rel="noreferrer">
            FIU Panther Park API
          </a>{" "}
          · <Link to="/provenance">data provenance</Link>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-shell">
            <NavBar />
            <main className="app-main">
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
            </main>
            <SiteFooter />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
