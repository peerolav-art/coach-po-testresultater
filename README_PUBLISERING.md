# Coach PO Testresultater – Cloud Edition v2.0

**Før publisering:** Følg `OPPSETT_SUPABASE.md`, kjør `SUPABASE_SETUP.sql`, og fyll inn `config.js`.

# Coach PO Testresultater – publiseringsklar PWA

Denne mappen kan publiseres som en statisk HTTPS-side. `index.html` er startsiden. Coach PO-logoen brukes både inne i appen og som appikon.

## Netlify (enklest)
1. Logg inn på Netlify.
2. Velg å opprette et nytt nettsted ved å dra inn hele denne mappen, eller ZIP-filen etter utpakking.
3. Når nettstedet er publisert får du en `https://...netlify.app`-adresse.
4. Åpne adressen på iPhone/iPad i Safari → Del → **Legg til på Hjem-skjerm**.
5. På Mac i Safari → Arkiv → **Legg til i Dock**.

## GitHub Pages
1. Opprett et repository og last opp innholdet i denne mappen til roten.
2. I repository-innstillinger: Pages → Deploy from branch → `main` / root.
3. Bruk HTTPS-adressen GitHub Pages gir deg.

## Offline
Appskallet og ikonene caches av `service-worker.js`. PDF.js lastes fra CDN og caches etter første vellykkede nettbruk. PDF-import kan derfor kreve internett første gang. Sted krever nett/posisjonstillatelse.

## Viktig om testdata
Testresultatene lagres i `localStorage` på den enkelte enheten/nettleseren. Data synkroniseres **ikke automatisk** mellom Mac, iPhone og iPad. Bruk CSV-eksport som sikkerhetskopi. For felles datasett på tvers av enheter må appen senere kobles til en database/innlogging.

## Innhold
- `index.html` – appen
- `manifest.webmanifest` – installasjonsmetadata
- `service-worker.js` – offline/cache
- `icons/` – Coach PO appikoner
- `netlify.toml` – Netlify-oppsett
- `.nojekyll` – GitHub Pages-kompatibilitet
