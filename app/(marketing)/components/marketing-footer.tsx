import Link from "next/link";

const footerLinks = [
  { href: "/pricing", label: "Priser" },
  { href: "/features", label: "Funktioner" },
  { href: "#", label: "Kontakta oss" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-slate-800">Lekbanken</p>
        <div className="flex flex-wrap gap-4">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-slate-500">App, Marketing och Admin – tydligt separerade upplevelser.</p>
      </div>
    </footer>
  );
}
