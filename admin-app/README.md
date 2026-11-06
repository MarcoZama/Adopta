# Adopta Admin: code app

App minimale per configurare tutto da un'unica pagina. Dalla 1.0.0.11 sostituisce l'app model-driven *Adopta Admin*, che non è più nella soluzione. È scritta in React e TypeScript con la [Power Apps client library](https://learn.microsoft.com/power-apps/developer/code-apps/overview) e Fluent UI 9, come la code app delle comunicazioni.

Ha due schede:

- **Impostazioni**: il record di *Adopta Setting* usato da app, agente e flow, cioè il primo attivo per data di creazione. Se non esiste, l'app lo crea al primo salvataggio.
  - titolo dell'app, nome dell'agente, nome della configurazione;
  - lingua predefinita, italiano o inglese: lingua iniziale delle nuove comunicazioni e delle app, e lingua dei testi fissi dell'agente per gli utenti il cui profilo non è in italiano né in inglese;
  - logo: si carica o si rimuove subito, senza salvare;
  - URL della knowledge SharePoint dell'Adoption Coach, solo `https://`;
  - interruttore globale degli invii.
  - **Applicazione all'ambiente** mostra l'esito di *AdoptaApplySettings*. Dopo un salvataggio che avvia il flow, l'app attende l'esito per circa 40 secondi. Se il flow ha aggiornato le variabili, l'app ricorda di ripubblicare gli agenti.
- **Gruppi destinatari**:
  - elenco dei gruppi Entra (*Adopta Audience Group*), con l'interruttore *Attivo* su ogni riga;
  - nuovo gruppo, modifica ed eliminazione;
  - l'ID del gruppo deve essere un GUID e non può essere già presente in elenco.

Se più record di impostazioni sono attivi, l'app lo segnala e modifica solo il primo.

L'interfaccia è in italiano o in inglese, con il selettore **IT / EN** in alto a destra (testi in `src/i18n/messages.ts`). Dalla 1.0.0.12 serve la colonna *Default language* (`vm_defaultlanguage`) di *Adopta Setting*.

## Prerequisiti

- Gli stessi della code app delle comunicazioni (vedi [code-app/README.md](../code-app/README.md)): Node.js LTS e code app abilitate nell'ambiente.
- Soluzione `Adopta` **1.0.0.7 o successiva**, con le colonne *Coach knowledge URL*, *Sending enabled*, *Apply status* e *Applied on*.
- Chi la usa: ruoli *Basic User* + **Adopta Administrator**. Senza il ruolo l'app legge ma non salva, e l'errore lo indica. Le code app non si associano ai ruoli: va condivisa con ogni admin.

## Collegarla all'ambiente, provarla e pubblicarla

```powershell
npm install
npx pa auth login
.\setup.ps1 -EnvironmentId <id-ambiente>
npm run build
npx pa app run                                   # prova in locale
npx pa app push --solution-id <id-soluzione-Adopta>
```

`setup.ps1` esegue `pa app init` con il nome *Adopta Admin (code app)* e aggiunge le tabelle `vm_adoptasetting` e `vm_adoptaaudiencegroup`. L'app non chiama flow: le variabili d'ambiente le scrive *AdoptaApplySettings* quando cambia il record.

Dopo il push, esporta la soluzione e riportala in `src/` come descritto in [code-app/README.md](../code-app/README.md#3-pubblicarla-nella-soluzione).

## Come è fatta

| Cosa | Dove |
|---|---|
| Accesso ai dati | `src/data/admin.ts`, che importa i servizi generati in `src/generated/services` |
| Schede | `src/components/SettingsView.tsx` e `src/components/GroupsView.tsx`. Restano montate entrambe: cambiando scheda le modifiche non salvate non si perdono |
| Esito del flow | Letto da *Apply status*. Un testo che inizia con "Configurazione applicata" è un esito positivo; se contiene anche "Variabili aggiornate" l'app chiede di ripubblicare gli agenti. Il resto è un avviso |
| Interfaccia | `src/app.css` sui token di Fluent, con gli stessi componenti della code app delle comunicazioni (`Section`, `PageHeader`, `ConfirmDialog`, `EmptyState`) |
