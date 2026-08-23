# Coach PO Testresultater – felles database og innlogging

Denne utgaven bruker **Supabase Auth + PostgreSQL**. Samme bruker kan logge inn på Mac, iPhone og iPad og får samme resultatarkiv.

## 1. Opprett Supabase-prosjekt

1. Gå til https://supabase.com og opprett et prosjekt.
2. Åpne **SQL Editor** i prosjektet.
3. Kopier hele innholdet i `SUPABASE_SETUP.sql`, lim det inn og kjør spørringen.

## 2. Koble appen til prosjektet

I Supabase finner du prosjektets **Project URL** og **Publishable key / anon key** under prosjektinnstillingene/API.

Åpne `config.js` og erstatt:

- `https://DIN-PROSJEKT-ID.supabase.co`
- `DIN-PUBLISHABLE-ELLER-ANON-KEY`

Bruk aldri `service_role`-nøkkelen i denne filen. Den skal ikke ligge i en nettleserapp.

## 3. Innlogging

Appen støtter e-post + passord. Standard Supabase-oppsett kan kreve bekreftelse av e-post før første innlogging. Dette kan styres under Authentication-innstillingene i Supabase.

**Bruk samme Coach PO-konto på alle egne enheter** for å se de samme resultatene.

## 4. Eksisterende lokale resultater

Ved første innlogging på en tom database vil appen automatisk flytte eksisterende lokale resultater på den enheten til skyen. Når databasen allerede har data, hentes skydata i stedet slik at en ny iPhone/iPad ikke lager dubletter.

## 5. Synkronisering

- Registrering, PDF-import, sletting og endringer caches lokalt og sendes til Supabase.
- Ved kortvarig nettutfall beholdes endringer i en lokal synk-kø.
- Når nettet kommer tilbake, forsøker appen å sende køen automatisk.
- Appen oppdaterer også data når den blir aktiv igjen. Knappen **Oppdater** kan brukes manuelt.

## 6. Sikkerhet

Databasen har Row Level Security (RLS). En innlogget bruker kan bare lese og endre rader som tilhører sin egen bruker-ID. Fødselsdato og øvrige utøverdata bør behandles som personopplysninger, så bruk et sterkt passord og begrens hvem som får Coach PO-kontoen.

## 7. Publisering

Etter at `config.js` er fylt ut kan hele mappen publiseres på Netlify eller GitHub Pages, på samme måte som forrige PWA-pakke. Bruk HTTPS.

På iPhone/iPad: Safari → Del → **Legg til på Hjem-skjerm**.
På Mac: Safari → Arkiv → **Legg til i Dock**.
