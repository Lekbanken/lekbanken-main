import Link from 'next/link'

export const metadata = {
  title: 'Användarvillkor - Lekbanken',
  description: 'Användarvillkor och regler för användning av Lekbanken',
}

export default function TermsPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <div className="not-prose mb-8">
        <Link 
          href="/" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Tillbaka till startsidan
        </Link>
      </div>

      <h1 className="text-4xl font-bold mb-4">Användarvillkor</h1>
      <p className="text-muted-foreground mb-8">
        Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Introduktion</h2>
        <p>
          Välkommen till Lekbanken! Dessa användarvillkor (&ldquo;Villkoren&rdquo;) reglerar din användning av 
          Lekbanken-plattformen och våra tjänster. Genom att använda våra tjänster godkänner du dessa villkor.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Användning av tjänsten</h2>
        <h3 className="text-xl font-semibold mb-2">2.1 Behörighet</h3>
        <p>
          För att använda Lekbanken måste du vara minst 18 år gammal eller ha tillstånd från 
          vårdnadshavare. Om du använder tjänsten på uppdrag av en organisation, garanterar du 
          att du har behörighet att ingå detta avtal för organisationens räkning.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Kontosäkerhet</h3>
        <p>
          Du är ansvarig för att hålla dina inloggningsuppgifter säkra och för all aktivitet 
          som sker under ditt konto. Du måste omedelbart meddela oss om du upptäcker obehörig 
          användning av ditt konto.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">2.3 Accepterad användning</h3>
        <p>Du samtycker till att inte:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Använda tjänsten för olagliga ändamål</li>
          <li>Försöka få obehörig åtkomst till systemet</li>
          <li>Ladda upp skadligt innehåll eller virus</li>
          <li>Trakassera, hota eller förolämpa andra användare</li>
          <li>Överföra spam eller oönskad kommunikation</li>
          <li>Bryta mot andras immateriella rättigheter</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Innehåll och immateriella rättigheter</h2>
        <h3 className="text-xl font-semibold mb-2">3.1 Ditt innehåll</h3>
        <p>
          Du behåller äganderätten till allt innehåll du laddar upp till Lekbanken. Genom att 
          ladda upp innehåll ger du oss en icke-exklusiv licens att använda, visa och distribuera 
          ditt innehåll för att tillhandahålla tjänsten.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Vårt innehåll</h3>
        <p>
          All programvara, design, text, grafik och annat material som tillhandahålls av Lekbanken 
          skyddas av upphovsrätt och andra immateriella rättigheter. Du får inte kopiera, modifiera 
          eller distribuera vårt innehåll utan skriftligt tillstånd.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Betalning och prenumerationer</h2>
        <h3 className="text-xl font-semibold mb-2">4.1 Avgifter</h3>
        <p>
          Vissa funktioner i Lekbanken kräver en betald prenumeration. Alla priser anges på vår 
          prissättningssida och inkluderar tillämplig moms.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Fakturering</h3>
        <p>
          Prenumerationsavgifter debiteras automatiskt vid början av varje faktureringsperiod. 
          Du är ansvarig för att tillhandahålla giltiga betalningsuppgifter.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">4.3 Återbetalning</h3>
        <p>
          Återbetalningar hanteras i enlighet med vår återbetalningspolicy. Kontakta vår support 
          för att diskutera återbetalning inom 14 dagar från köpdatum.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Uppsägning</h2>
        <p>
          Du kan när som helst avsluta ditt konto genom att kontakta vår support. Vi förbehåller 
          oss rätten att stänga av eller avsluta konton som bryter mot dessa villkor.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Ansvarsbegränsning</h2>
        <p>
          Lekbanken tillhandahålls &ldquo;i befintligt skick&rdquo; utan garantier av något slag. Vi ansvarar 
          inte för indirekta skador, förlorad vinst eller dataförlust som uppstår från användningen 
          av våra tjänster.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Ändringar av villkoren</h2>
        <p>
          Vi kan uppdatera dessa villkor från tid till annan. Vi kommer att meddela dig om 
          väsentliga ändringar via e-post eller genom ett meddelande i tjänsten. Din fortsatta 
          användning av tjänsten efter ändringar utgör ditt godkännande av de nya villkoren.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Tillämplig lag</h2>
        <p>
          Dessa villkor regleras av norsk lag. Eventuella tvister ska lösas i norska domstolar.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">9. Kontaktinformation</h2>
        <p>
          Om du har frågor om dessa användarvillkor, vänligen kontakta oss:
        </p>
        <ul className="list-none space-y-2 mt-4">
          <li><strong>E-post:</strong> legal@lekbanken.no</li>
          <li><strong>Adress:</strong> Lekbanken AS, Oslo, Norge</li>
        </ul>
      </section>

      <div className="not-prose mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Genom att använda Lekbanken godkänner du dessa användarvillkor och vår{' '}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            integritetspolicy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
