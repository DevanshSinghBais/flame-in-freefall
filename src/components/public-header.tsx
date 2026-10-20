"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

const publicLinks = [
  { href: "/about", label: "About the Science" },
  { href: "/sources", label: "Research Sources" },
  { href: "/sign-in", label: "Sign In" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    } else if (wasOpen.current) {
      menuButtonRef.current?.focus();
    }
    wasOpen.current = open;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="public-header">
      <div className="public-header-inner page-width">
        <Wordmark />
        <nav className="public-nav" aria-label="Main navigation">
          {publicLinks.map((link) => (
            <Link key={link.href} className={link.href === "/sign-in" ? "public-sign-in" : "public-nav-link"} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          className="icon-button mobile-menu-button"
          ref={menuButtonRef}
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <nav className="mobile-public-nav" id="public-mobile-nav" aria-label="Mobile navigation" ref={navRef}>
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
