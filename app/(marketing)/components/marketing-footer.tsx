import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const footerLinks = [
  { href: "#how-it-works", labelKey: "nav.howItWorks" },
  { href: "#spotlight", labelKey: "nav.features" },
  { href: "#testimonials", labelKey: "nav.customers" },
  { href: "#pricing", labelKey: "nav.pricing" },
];

const legalLinks = [
  { href: "/legal/terms", labelKey: "footer.legal.terms" },
  { href: "/legal/privacy", labelKey: "footer.legal.privacy" },
];

export function MarketingFooter() {
  const t = useTranslations("marketing");
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-muted-foreground lg:px-8">
        <div className="lg:flex lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">Lekbanken</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="mt-6 lg:mt-0 flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1 transition hover:bg-muted hover:text-foreground"
              >
                {t(link.labelKey as Parameters<typeof t>[0])}
              </Link>
            ))}
          </div>

          <div className="mt-6 lg:mt-0 flex gap-3">
            <Button variant="outline" size="sm" href="/auth/login">
              {t("actions.login")}
            </Button>
            <Button size="sm" href="/auth/signup">
              {t("footer.actions.getStarted")}
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t(link.labelKey as Parameters<typeof t>[0])}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
