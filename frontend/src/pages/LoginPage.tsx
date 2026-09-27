import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import Spinner from "../components/Spinner";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const errMsg = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (errMsg) {
      setError(errMsg);
      return;
    }
    navigate("/map");
  }

  return (
    <div className="page page-narrow">
      <div className="auth-card">
        <span className="eyebrow">PantherPark</span>
        <h2>{mode === "signin" ? "Log in" : "Create an account"}</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          An account keeps your schedule between visits. You don't need one to use PantherPark.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="visually-hidden" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="visually-hidden" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && (
            <div className="alert alert-error" style={{ margin: 0 }} role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            {busy ? <Spinner label="Please wait…" /> : mode === "signin" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 14 }}>
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button onClick={() => setMode("signup")} className="btn-link">
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button onClick={() => setMode("signin")} className="btn-link">
                Log in
              </button>
            </>
          )}
        </p>

        <div className="auth-divider">or</div>

        <button
          onClick={() => navigate("/map")}
          className="btn btn-ghost"
          style={{ width: "100%" }}
        >
          Continue as guest
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          Full access, nothing saved between visits.
        </p>
      </div>
    </div>
  );
}
