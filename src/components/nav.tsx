"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const authedLinks = [
  { href: "/upload", label: "Upload" },
  { href: "/browse", label: "Browse" },
];

export function Nav({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b-2 border-divider px-8 py-4">
      <span className="text-lg font-extrabold">Ledger</span>
      <div className="flex items-center gap-6 text-sm font-medium">
        {authenticated &&
          authedLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "text-accent" : "text-foreground hover:text-accent-700"}
              >
                {link.label}
              </Link>
            );
          })}
        {authenticated ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="text-foreground hover:text-accent-700"
          >
            Sign Out
          </button>
        ) : (
          <Link
            href="/signin"
            aria-current={pathname.startsWith("/signin") ? "page" : undefined}
            className={
              pathname.startsWith("/signin")
                ? "text-accent"
                : "text-foreground hover:text-accent-700"
            }
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
