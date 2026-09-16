"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Account = { id: string; platform: string; label: string; tokenEnvKey?: string | null };
const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", reddit: "Reddit", x: "X", instagram: "Instagram" };

export default function TopBar() {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platform, setPlatform] = useState("youtube");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((all: Account[]) => {
      setAccounts(all);
      const forPlatform = all.filter((a) => a.platform === platform);
      if (forPlatform.length) setAccountId(forPlatform[0].id);
    });
  }, []);

  const accountsForPlatform = accounts.filter((a) => a.platform === platform);
  useEffect(() => {
    if (accountsForPlatform.length && !accountsForPlatform.find((a) => a.id === accountId)) {
      setAccountId(accountsForPlatform[0].id);
    }
  }, [platform]);

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-badge">CS</span>
          <span className="brand-text">Creator <span>Studio</span></span>
        </div>

        <div className="topbar-selects">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
            {Object.entries(PLATFORM_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
            {accountsForPlatform.length === 0 && <option value="">No account</option>}
            {accountsForPlatform.map((a) => (
              <option key={a.id} value={a.id}>{a.label}{!a.tokenEnvKey ? " ⚠" : ""}</option>
            ))}
          </select>
        </div>

        <div className="topbar-nav">
          <a href="/"><button className="btn-cta">+ New Post</button></a>
          <a href="/dashboard"><button className={`btn-nav ${pathname === "/dashboard" ? "active" : ""}`}>All Posts</button></a>
          <a href="/settings"><button className={`btn-nav ${pathname === "/settings" ? "active" : ""}`}>Settings</button></a>
        </div>
      </div>
    </div>
  );
}
