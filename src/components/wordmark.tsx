import Link from "next/link";

export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link className={`wordmark ${className}`} href={href} aria-label="FLAME IN FREEFALL home">
      <span>FLAME</span>
      <span>IN FREEFALL</span>
    </Link>
  );
}
