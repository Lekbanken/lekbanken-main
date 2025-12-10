import Link from 'next/link'

export const metadata = {
  title: 'Integritetspolicy - Lekbanken',
  description: 'Hur Lekbanken hanterar och skyddar dina personuppgifter',
}

export default function PrivacyPage() {
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

      <h1 className="text-4xl font-bold mb-4">Integritetspolicy</h1>
      <p className="text-muted-foreground mb-8">
        Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Introduktion</h2>
        <p>
          På Lekbanken värnar vi om din integritet. Denna integritetspolicy förklarar hur vi 
          samlar in, använder, lagrar och skyddar dina personuppgifter när du använder våra tjänster.
        </p>
        <p>
          Vi följer Dataskyddsförordningen (GDPR) och norsk dataskyddslagstiftning.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Personuppgifter vi samlar in</h2>
        
        <h3 className="text-xl font-semibold mb-2">2.1 Information du tillhandahåller</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Kontoinformation:</strong> Namn, e-postadress, lösenord (krypterat)</li>
          <li><strong>Profilinformation:</strong> Profilbild, biografi, preferenser</li>
          <li><strong>Organisationsinformation:</strong> Organisationsnamn, kontaktuppgifter</li>
          <li><strong>Betalningsinformation:</strong> Faktureringsadress (betalningsuppgifter hanteras av Stripe)</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Information vi samlar in automatiskt</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Användningsdata:</strong> Sidvisningar, funktionsanvändning, sessionstid</li>
          <li><strong>Enhetsinformation:</strong> Enhetstyp, webbläsare, operativsystem</li>
          <li><strong>Loggdata:</strong> IP-adress, datum och tid för åtkomst, felloggar</li>
          <li><strong>Cookies:</strong> Se vår cookiepolicy nedan</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Hur vi använder dina uppgifter</h2>
        <p>Vi använder dina personuppgifter för att:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Tillhandahålla och förbättra våra tjänster</li>
          <li>Hantera ditt konto och autentisering</li>
          <li>Bearbeta betalningar och fakturor</li>
          <li>Skicka tjänstemeddelanden och uppdateringar</li>
          <li>Ge kundsupport</li>
          <li>Analysera användning och optimera användarupplevelsen</li>
          <li>Upptäcka och förhindra bedrägerier eller säkerhetsincidenter</li>
          <li>Följa juridiska krav</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Rättslig grund för behandling</h2>
        <p>Vi behandlar dina personuppgifter baserat på:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Avtal:</strong> För att fullgöra vårt avtal med dig (tjänsteleverans)</li>
          <li><strong>Samtycke:</strong> När du har gett explicit samtycke (t.ex. marknadsföring)</li>
          <li><strong>Berättigat intresse:</strong> För att förbättra tjänsten och förhindra missbruk</li>
          <li><strong>Juridisk skyldighet:</strong> För att följa lagar och förordningar</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Delning av personuppgifter</h2>
        <p>Vi delar dina uppgifter endast med:</p>
        
        <h3 className="text-xl font-semibold mb-2 mt-4">5.1 Tjänsteleverantörer</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Supabase:</strong> Databashosting och autentisering</li>
          <li><strong>Vercel:</strong> Webbhosting och CDN</li>
          <li><strong>Stripe:</strong> Betalningshantering</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2 mt-4">5.2 Juridiska krav</h3>
        <p>
          Vi kan dela uppgifter om det krävs enligt lag, domstolsbeslut eller myndighetsbegäran.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">5.3 Företagsöverlåtelser</h3>
        <p>
          Vid fusion, förvärv eller försäljning kan dina uppgifter överföras till den nya ägaren.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Lagring och säkerhet</h2>
        
        <h3 className="text-xl font-semibold mb-2">6.1 Var lagras data?</h3>
        <p>
          Dina personuppgifter lagras i Europa (via Supabase EU-region) för att följa GDPR-krav.
        </p>

        <h3 className="text-xl font-semibold mb-2 mt-4">6.2 Hur länge lagras data?</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Aktiva konton:</strong> Så länge ditt konto är aktivt</li>
          <li><strong>Avslutade konton:</strong> 30 dagar efter avslutning (backup-syfte)</li>
          <li><strong>Loggar:</strong> 90 dagar</li>
          <li><strong>Fakturor:</strong> 7 år (bokföringskrav)</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2 mt-4">6.3 Säkerhetsåtgärder</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>HTTPS-kryptering för all datatransmission</li>
          <li>Krypterade lösenord (bcrypt)</li>
          <li>Row-Level Security (RLS) i databasen</li>
          <li>Regelbundna säkerhetsupdateringar</li>
          <li>Åtkomstkontroll och auditloggar</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Dina rättigheter</h2>
        <p>Enligt GDPR har du rätt att:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Tillgång:</strong> Få en kopia av dina personuppgifter</li>
          <li><strong>Rättelse:</strong> Korrigera felaktiga uppgifter</li>
          <li><strong>Radering:</strong> Begära att vi raderar dina uppgifter (&ldquo;rätten att bli glömd&rdquo;)</li>
          <li><strong>Dataportabilitet:</strong> Få dina uppgifter i strukturerat format</li>
          <li><strong>Invändning:</strong> Motsätta dig viss behandling</li>
          <li><strong>Begränsa behandling:</strong> Begära begränsad behandling</li>
          <li><strong>Återkalla samtycke:</strong> Dra tillbaka samtycke när som helst</li>
        </ul>
        <p className="mt-4">
          För att utöva dessa rättigheter, kontakta oss på{' '}
          <a href="mailto:privacy@lekbanken.no" className="text-primary hover:underline">
            privacy@lekbanken.no
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
        <p>Vi använder cookies för att:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Nödvändiga cookies:</strong> Autentisering, sessionhantering</li>
          <li><strong>Funktionella cookies:</strong> Språkval, preferenser</li>
          <li><strong>Analytiska cookies:</strong> Användningsstatistik (anonymiserad)</li>
        </ul>
        <p className="mt-4">
          Du kan hantera cookies i dina webbläsarinställningar. Observera att vissa funktioner 
          kanske inte fungerar korrekt om du blockerar cookies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">9. Barn</h2>
        <p>
          Lekbanken är inte avsett för barn under 13 år. Vi samlar inte medvetet in personuppgifter 
          från barn. Om du är vårdnadshavare och upptäcker att ditt barn har lämnat personuppgifter, 
          kontakta oss så raderar vi informationen.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">10. Ändringar av integritetspolicyn</h2>
        <p>
          Vi kan uppdatera denna policy från tid till annan. Vi kommer att meddela dig om 
          väsentliga ändringar via e-post eller genom ett meddelande i tjänsten.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">11. Kontaktinformation</h2>
        <p>
          Om du har frågor om denna integritetspolicy eller hur vi hanterar dina personuppgifter:
        </p>
        <ul className="list-none space-y-2 mt-4">
          <li><strong>E-post:</strong> privacy@lekbanken.no</li>
          <li><strong>Adress:</strong> Lekbanken AS, Oslo, Norge</li>
          <li><strong>Dataskyddsombud:</strong> dpo@lekbanken.no</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">12. Klagomål</h2>
        <p>
          Om du är missnöjd med hur vi hanterar dina personuppgifter har du rätt att lämna in 
          ett klagomål till Datatilsynet (Norges dataskyddsmyndighet):
        </p>
        <ul className="list-none space-y-2 mt-4">
          <li><strong>Webbplats:</strong> <a href="https://www.datatilsynet.no" className="text-primary hover:underline">www.datatilsynet.no</a></li>
          <li><strong>E-post:</strong> postkasse@datatilsynet.no</li>
        </ul>
      </section>

      <div className="not-prose mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Genom att använda Lekbanken godkänner du denna integritetspolicy och våra{' '}
          <Link href="/legal/terms" className="text-primary hover:underline">
            användarvillkor
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
