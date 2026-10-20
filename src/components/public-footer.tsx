import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="page-width footer-inner">
        <Wordmark />
        <nav aria-label="Footer navigation" className="footer-links">
          <Link href="/about">About the Science</Link>
          <Link href="/sources">Research Sources</Link>
          <Link href="/sign-in">Sign In</Link>
        </nav>
      </div>
    </footer>
  );
}
