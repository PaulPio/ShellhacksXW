import { useAuth } from "../context/AuthProvider";

export default function GuestBadge() {
  const { isGuest, user, signOut } = useAuth();

  if (isGuest) {
    return (
      <span
        style={{
          background: "#fef3c7",
          color: "#92400e",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Guest mode — nothing is saved
      </span>
    );
  }

  return (
    <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
      {user?.email}
      <button onClick={() => signOut()} style={{ fontSize: 12 }}>
        Sign out
      </button>
    </span>
  );
}
