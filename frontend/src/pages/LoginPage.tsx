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
    <div className="page" style={{ maxWidth: 360 }}>
      <h2>{mode === "signin" ? "Log in" : "Create an account"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? <Spinner label="Please wait…" /> : mode === "signin" ? "Log in" : "Sign up"}
        </button>
      </form>

      <p style={{ fontSize: 13, marginTop: 8 }}>
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button onClick={() => setMode("signup")} style={{ fontSize: 13 }}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Have an account?{" "}
            <button onClick={() => setMode("signin")} style={{ fontSize: 13 }}>
              Log in
            </button>
          </>
        )}
      </p>

      <hr style={{ margin: "20px 0" }} />

      <button
        onClick={() => navigate("/map")}
        style={{ width: "100%", padding: 10, fontWeight: 600 }}
      >
        Continue as Guest
      </button>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
        Guest mode: full access, nothing is saved between visits.
      </p>
    </div>
  );
}
