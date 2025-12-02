import { Button } from "@/components/ui/button";

export function LoginCta() {
  return (
    <section
      id="cta"
      className="relative isolate overflow-hidden bg-primary py-16 sm:py-24"
      aria-labelledby="cta-title"
    >
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
        <h2
          id="cta-title"
          className="text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl"
        >
          Redo att effektivisera planeringen?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
          Kom igång gratis, logga in när du vill fortsätta och bjud enkelt in kollegor. Ingen
          bindningstid.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            href="/auth/signup"
            className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Starta gratis
          </Button>
          <Button
            size="lg"
            variant="outline"
            href="/auth/login"
            className="border-white/40 text-primary-foreground hover:bg-white/10 transition-all hover:scale-[1.02]"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Logga in
          </Button>
          <Button
            size="lg"
            variant="ghost"
            href="#pricing"
            className="text-primary-foreground hover:bg-white/10 transition-all"
          >
            Se planer
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-primary-foreground/75">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-primary-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Onboarding på svenska
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Support svarar inom en arbetsdag.
          </span>
        </div>
      </div>
    </section>
  );
}
