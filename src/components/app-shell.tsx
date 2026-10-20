"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { destinations } from "@/lib/workspace-navigation";
import { signOutAction } from "@/app/auth/actions";

export function AppShell({ children, userEmail = null }: { children: React.ReactNode; userEmail?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mobile && open) {
      sidebarRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (mobile && wasOpen.current) menuButtonRef.current?.focus();
    }
    wasOpen.current = mobile && open;
    return () => { document.body.style.overflow = ""; };
  }, [mobile, open]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const navigation = (
    <nav className="app-nav" aria-label="Workspace navigation">
      {destinations.map(({ slug, label, icon: Icon }) => {
        const href = `/workspace/${slug}`;
        const active = pathname === href
          || (slug === "overview" && pathname === "/workspace")
          || (slug === "research-explorer" && pathname.startsWith("/research/"));
        return (
          <Link
            className={`app-nav-link${active ? " is-active" : ""}`}
            href={href}
            key={slug}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            title={label}
            onClick={() => setOpen(false)}
          >
            <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell">
      <div className="workspace-mobile-bar">
        <button
          className="icon-button"
          ref={menuButtonRef}
          type="button"
          aria-label={open ? "Close workspace navigation" : "Open workspace navigation"}
          aria-expanded={open}
          aria-controls="workspace-sidebar"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <Wordmark />
      </div>
      {mobile && open && <button className="drawer-scrim" aria-label="Close navigation" type="button" onClick={() => setOpen(false)} />}
      <aside
        className={`app-sidebar${open ? " drawer-open" : ""}`}
        id="workspace-sidebar"
        ref={sidebarRef}
        aria-hidden={mobile && !open}
        inert={mobile && !open}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-lockup">
            <svg className="sidebar-orbit-mark" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="5" fill="currentColor" />
              <ellipse cx="24" cy="24" rx="20" ry="10" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(-34 24 24)" />
              <circle cx="42" cy="14" r="2.2" fill="var(--accent-ember)" />
              <circle cx="7" cy="29" r="1.8" fill="var(--text-primary)" />
            </svg>
            <Wordmark href="/workspace/overview" />
          </div>
          <span className="sidebar-caption">MICROGRAVITY COMBUSTION RESEARCH</span>
        </div>
        {navigation}
        <div className="sidebar-bottom">
          <span className="sidebar-bottom-mark" aria-hidden="true" />
          {userEmail ? (
            <>
              <Link className="sidebar-account" href="/workspace/settings" title={`Account settings for ${userEmail}`} aria-label={`Account settings for ${userEmail}`}>
                <UserRound size={17} aria-hidden="true" />
                <span><small>ACCOUNT SETTINGS</small><strong>{userEmail}</strong></span>
              </Link>
              <form action={signOutAction}>
                <button className="sidebar-signout" type="submit" title="Sign out"><LogOut size={16} aria-hidden="true" /><span>Sign out</span></button>
              </form>
            </>
          ) : (
            <>
              <p>Research, with its sources in view.</p>
              <Link className="sidebar-signin" href="/sign-in"><UserRound size={16} aria-hidden="true" /><span>Sign in to save research</span></Link>
            </>
          )}
          <a className="sidebar-photo-credit" href="https://www.nasa.gov/image-article/sun-rises-above-horizon-illuminating-earth/" target="_blank" rel="noreferrer">Earth from the ISS · NASA</a>
        </div>
      </aside>
      <div className="app-main-wrap" aria-hidden={mobile && open} inert={mobile && open}>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
