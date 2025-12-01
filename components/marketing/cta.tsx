import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="relative isolate overflow-hidden bg-primary py-20 sm:py-28">
      {/* Bakgrundsdekor */}
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
            Redo att effektivisera din planering?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Kom igång gratis och se hur Lekbanken kan spara dig timmar varje vecka. 
            Ingen kreditkort krävs.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              href="/auth/signup"
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              Starta gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              href="/#contact"
              className="border-white/30 text-primary-foreground hover:bg-white/10"
            >
              Kontakta oss
            </Button>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/60">
            Över 500 ledare och lärare använder redan Lekbanken
          </p>
        </div>
      </div>
    </section>
  );
}
