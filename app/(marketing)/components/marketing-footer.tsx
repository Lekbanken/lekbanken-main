import Link from "next/link";
import { Button } from "@/components/ui/button";

const footerLinks = [
  { href: "#how-it-works", label: "Så funkar det" },
  { href: "#spotlight", label: "Produkt" },
  { href: "#testimonials", label: "Kunder" },
  { href: "#pricing", label: "Priser" },
];

const legalLinks = [
  { href: "/legal/terms", label: "Användarvillkor" },
  { href: "/legal/privacy", label: "Integritetspolicy" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-muted-foreground lg:px-8">
        <div className="lg:flex lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">Lekbanken</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aktiviteter, pass och delning för coacher, lärare och ledare.
            </p>
          </div>

          <div className="mt-6 lg:mt-0 flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1 transition hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 lg:mt-0 flex gap-3">
            <Button variant="outline" size="sm" href="/auth/login">
              Logga in
            </Button>
            <Button size="sm" href="/auth/signup">
              Kom igång
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lekbanken AS. Alla rättigheter förbehållna.
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
