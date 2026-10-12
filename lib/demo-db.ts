// DEMO MODE storage. Used only while NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are not set.
// Accounts live in this browser's localStorage, so they are NOT shared between devices and NOT secure.
// Passwords are stored in plain text here on purpose: it is a try-out mode. Real accounts need Supabase.
import { BUILTIN_STAFF_ROLES, PERMISSIONS, isStaffRole, type RoleDef } from "./permissions";

export type DemoAccount = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roles: string[];
  status: "pending" | "active" | "suspended";
  identityStatus: "none" | "pending" | "verified" | "rejected" | "needs_changes";
  identityNote?: string;
  extraPerms: string[];
  businessName?: string;
  createdAt: string;
};

const K_ACCOUNTS = "qistuha-demo-accounts";
const K_ROLES = "qistuha-demo-roles";
const K_SESSION = "qistuha-demo-session";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("qistuha-demo-change"));
  } catch {
    /* storage full or blocked */
  }
}

export const demoAccounts = {
  all: (): DemoAccount[] => read<DemoAccount[]>(K_ACCOUNTS, []),
  save: (list: DemoAccount[]) => write(K_ACCOUNTS, list),
  byEmail: (email: string) => demoAccounts.all().find((a) => a.email.toLowerCase() === email.trim().toLowerCase()),
  byId: (id: string) => demoAccounts.all().find((a) => a.id === id),
  hasOwner: () => demoAccounts.all().some((a) => a.roles.includes("admin")),
  update(id: string, patch: Partial<DemoAccount>) {
    demoAccounts.save(demoAccounts.all().map((a) => (a.id === id ? { ...a, ...patch } : a)));
  },
  add(a: Omit<DemoAccount, "id" | "createdAt" | "extraPerms">): DemoAccount {
    const acc: DemoAccount = { ...a, id: "d-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), extraPerms: [], createdAt: new Date().toISOString() };
    demoAccounts.save([...demoAccounts.all(), acc]);
    return acc;
  },
};

export const demoRoles = {
  custom: (): RoleDef[] => read<RoleDef[]>(K_ROLES, []),
  save: (list: RoleDef[]) => write(K_ROLES, list),
  all: (): RoleDef[] => [...BUILTIN_STAFF_ROLES, ...demoRoles.custom()],
  permsOf(roleName: string): string[] {
    return demoRoles.all().find((r) => r.name === roleName)?.perms ?? [];
  },
};

export const demoSession = {
  get: (): string | null => {
    try { return localStorage.getItem(K_SESSION); } catch { return null; }
  },
  set(id: string | null) {
    try {
      if (id) localStorage.setItem(K_SESSION, id); else localStorage.removeItem(K_SESSION);
      window.dispatchEvent(new Event("qistuha-demo-change"));
    } catch { /* ignore */ }
  },
};

/** All permission codes an account holds (owner has every one). */
export function permissionsOf(acc: Pick<DemoAccount, "roles" | "extraPerms">): string[] {
  if (acc.roles.includes("admin")) return PERMISSIONS.map((p) => p.code);
  const set = new Set<string>(acc.extraPerms);
  for (const r of acc.roles) if (isStaffRole(r)) demoRoles.permsOf(r).forEach((p) => set.add(p));
  return Array.from(set);
}

// ── Demo identity submissions (photos are small JPEG data URLs kept in this browser only)
export type DemoIdentity = {
  id: string; userId: string; userName: string; userEmail: string; doc: "national_id" | "passport";
  images: Record<string, string>; status: "submitted" | "approved" | "rejected" | "needs_changes";
  reason?: string; submittedAt: string; reviewedBy?: string;
};
const K_IDENT = "qistuha-demo-identity";
export const demoIdentity = {
  all: (): DemoIdentity[] => read<DemoIdentity[]>(K_IDENT, []),
  save: (l: DemoIdentity[]) => write(K_IDENT, l),
  submit(acc: DemoAccount, doc: DemoIdentity["doc"], images: Record<string, string>) {
    const rest = demoIdentity.all().filter((x) => !(x.userId === acc.id && x.status === "submitted"));
    demoIdentity.save([...rest, { id: "i-" + Date.now().toString(36), userId: acc.id, userName: acc.fullName, userEmail: acc.email, doc, images, status: "submitted", submittedAt: new Date().toISOString() }]);
    demoAccounts.update(acc.id, { identityStatus: "pending", identityNote: undefined });
  },
  decide(id: string, decision: "approved" | "rejected" | "needs_changes", reason: string, reviewer: string) {
    const item = demoIdentity.all().find((x) => x.id === id);
    if (!item) return;
    demoIdentity.save(demoIdentity.all().map((x) => (x.id === id ? { ...x, status: decision, reason, reviewedBy: reviewer } : x)));
    const acc = demoAccounts.byId(item.userId);
    demoAccounts.update(item.userId, {
      identityStatus: decision === "approved" ? "verified" : decision,
      identityNote: reason || undefined,
      status: decision === "approved" && acc?.status === "pending" ? "active" : acc?.status ?? "pending",
    });
  },
};
