import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function GuestBadge() {
  const { isGuest, user, signOut } = useAuth();

  if (isGuest) {
    return (
      <div className="user-chip">
        <span className="badge badge-guest">Guest — nothing saved</span>
        <Link to="/login" className="btn btn-ghost btn-sm">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="user-chip">
      <span className="user-chip-email" title={user?.email}>
        {user?.email}
      </span>
      <button onClick={() => signOut()} className="btn btn-ghost btn-sm">
        Sign out
      </button>
    </div>
  );
}
