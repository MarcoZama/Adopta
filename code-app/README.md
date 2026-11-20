# Adopta Communications: code app

## Edizioni IT / EN (sorgenti 1.0.0.18)

Un progetto, due build separate: `npm run build:it` produce `dist-it`,
`npm run build:en` produce `dist-en`. Entrambe le interfacce restano IT/EN.
L'edizione e' visibile nell'intestazione e non puo' essere cambiata dall'utente.
I binding condivisi in [shared](../shared/) selezionano tabelle, ID e flow
prima della pubblicazione, senza modificare il testo libero delle comunicazioni.

Gli agenti e le nuove card hanno la lingua fissa dell'edizione. La pianificazione
salva anche `vm_language` coerentemente con la card; le card gia' pianificate
mantengono il payload originale. `vm_defaultlanguage` ora riguarda soltanto il
fallback delle app. La scelta UI precede lingua browser, fallback salvato ed edizione.

`npm run build` resta un alias IT; il `power.config.json` presente e' IT e usa
`dist-it`. Non eseguire un push EN con tale configurazione. Il setup EN e' bloccato
finche' non vengono creati contesti e appId reali in un ambiente autorizzato;
il setup IT verifica che l'ambiente richiesto coincida con quello configurato.
Il confezionamento locale delle due app e' gestito dalla
[build della soluzione](../deploy/README.md).

L'app per comporre e inviare le comunicazioni. Dalla 1.0.0.11 sostituisce l'app canvas *Adopta Communications*, che non è più nella soluzione. È scritta in React e TypeScript con la [Power Apps client library](https://learn.microsoft.com/power-apps/developer/code-apps/overview) e Fluent UI 9. Offre:

- elenco delle comunicazioni, nuova bozza e modifica;
- salvataggio con i gruppi destinatari;
- pianificazione con *AdoptaScheduleCommunication*;
- eliminazione, annullamento della pianificazione e interruttore globale degli invii con *AdoptaManageCommunication*;
- storico con esiti per destinatario e diagnostica. Chi non ha ricevuto la card perché non ha l'agente installato in Teams ha l'esito *Agente non installato*, con contatore e istruzioni;
- interfaccia in italiano o in inglese, con il selettore **IT / EN** nella barra laterale. La scelta resta nel browser; senza scelta vale la lingua del browser, poi la *Lingua predefinita* di *Adopta Setting*. I testi sono in `src/i18n/messages.ts`, che traduce anche i messaggi italiani dei flow;
- *Lingua della card* in sola lettura: le nuove card usano l'edizione installata; non la lingua selezionata nell'interfaccia.

Titolo, nome dell'agente e logo vengono letti da *Adopta Setting*, configurata nella code app *Adopta Admin (code app)* (vedi [admin-app/README.md](../admin-app/README.md)).

Ogni sezione ha due livelli:
- **Elenco:** una tabella a tutta larghezza. Per le comunicazioni ci sono schede di stato con contatori e la ricerca. Per lo storico ci sono i filtri per titolo, esito e date.
- **Pagina di dettaglio:** si apre cliccando una riga e si chiude con il link "←" in alto. L'editor ha l'intestazione fissa con stato e azioni e il modulo diviso in tre sezioni (*Messaggio*, *Link e chiusura*, *Destinatari e invio*), con l'anteprima della card Teams accanto. Il dettaglio dello storico ha contatori, tabella dei destinatari e diagnostica.

Se si esce da una bozza con modifiche non salvate (link "←", *Aggiorna* o barra laterale), l'app chiede conferma.

L'interfaccia è responsive:
- **Desktop:** barra laterale con navigazione e stato degli invii.
- **Tablet:** la barra laterale diventa una barra superiore con le schede di navigazione.
- **Telefono:** le tabelle mostrano solo titolo e stato, con la data sotto il titolo. Nell'editor i pulsanti *Pianifica invio* e *Salva bozza* restano in una barra fissa in basso.

## Prerequisiti

- Node.js LTS. La Power Apps CLI (`@microsoft/power-apps-cli`) è una dipendenza del progetto: dopo `npm install` si usa con `npx pa`.
- **Code app abilitate nell'ambiente**: Power Platform admin center → *Ambienti* → l'ambiente → *Impostazioni* → *Prodotto* → *Funzionalità* → **Power Apps code apps**. Vale anche per gli ambienti dei clienti.
- Soluzione `Adopta` **1.0.0.5 o successiva** importata nell'ambiente di sviluppo, con i flow accesi. Serve la colonna *Logo*: la CLI genera il download dell'immagine solo se la colonna esiste.
- Utenti finali con licenza Power Apps Premium e ruoli *Basic User* + *Adopta Communications Manager*.

## 1. Collegare l'app all'ambiente

```powershell
npm install
npx pa auth login
.\setup.ps1 -EnvironmentId <id-ambiente>
```

L'ID dell'ambiente è nel Power Platform admin center, oppure nel campo *Environment ID* di `pac org who`. L'URL Dataverse lo ricava la CLI. Se serve, si passa con `-OrgUrl`.

Lo script esegue `pa app init` con il nome *Adopta Communications (code app)*. Poi aggiunge le cinque tabelle con `pa app add data-source`, cerca i due flow con `pa app list-flows` e li aggiunge con `pa app add flow`. Se non li trova, passa gli ID con `-ScheduleFlowId` e `-ManageFlowId`.

Ambiente di sviluppo attuale: `prod-emea-a30e74af` (`bf52ea84-0d16-ec35-a4f2-526860910754`). La app è `dbcfaf8d-0436-4734-b8ad-724eeb1f6841` in `power.config.json`, quindi `npx pa app push` aggiorna sempre la stessa app.

I file generati (`power.config.json`, `src/generated/...`) dipendono dall'ambiente. Rigenerali con lo script dopo ogni modifica a tabelle o flow.

## 2. Provarla in locale

```powershell
npm run build
npx pa app run
```

Apri l'URL *Local Play* nello stesso profilo del browser che usi per Power Platform. Al primo avvio l'app chiede il consenso alla connessione Dataverse, perché i due flow girano con l'identità di chi li avvia.

## 3. Pubblicarla nella soluzione

```powershell
npx pa solution list --search Adopta
npm run build
npx pa app push --solution-id <id-soluzione-Adopta>
```

Poi esporta la soluzione e riportala nei sorgenti:

```powershell
pac solution export --name Adopta --environment <id-ambiente> --path ..\dist\Adopta_export.zip
pac solution unpack --zipfile ..\dist\Adopta_export.zip --folder ..\src --packagetype Unmanaged --allowDelete
```

Prima dell'export importa nell'ambiente le modifiche fatte a mano in `src/`: l'unpack con `--allowDelete` sostituisce `src/` con il contenuto dell'ambiente.

Dopo l'unpack controlla due cose:
- **Variabili d'ambiente:** in `src/environmentvariabledefinitions` non devono esserci file `environmentvariablevalues.json`. I valori li scrive *AdoptaApplySettings* in ogni ambiente; un valore esportato viaggerebbe con la soluzione, ad esempio l'URL dell'ambiente di sviluppo. Se ci sono, eliminali.
- **Solo code app:** in `src/CanvasApps` ci sono solo le due code app, `vm_adoptacommunicationscodeapp_d7690` e `vm_adoptaadmincodeapp_daf99`. Se ricompaiono la canvas `vm_adoptacommunications_1b76d` o le cartelle `src/AppModules` e `src/AppModuleSiteMaps` della model-driven, sono ancora nella soluzione dell'ambiente: toglile dal portale ed esporta di nuovo.

## Come è collegata ai dati

| Cosa | Dove |
|---|---|
| Tabelle e flow | `src/data/generated.ts` collega i metadati SDK generati all'adattatore condiviso in `shared/power-apps.ts`. I servizi mancanti producono un errore esplicito, senza usare il backend dell'altra edizione |
| Operazioni | `src/data/repository.ts`: letture, salvataggio della bozza, gruppi, flow e configurazione |
| Input dei flow | Trigger *When Power Apps calls a flow (V2)*: `text` = CommunicationId, `text_1` = Operation |
| Connessione dei flow | I due flow eseguono le azioni Dataverse con l'identità dell'utente (impersonazione), quindi l'app passa loro la connessione Dataverse dell'utente. In `power.config.json` ogni flow ha `workflowDetails.dependencies` verso il riferimento `shared_commondataserviceforapps`. La CLI non lo genera, perché per i flow aggiunge solo le connessioni "fornite dall'utente": lo aggiunge `setup.ps1`. Senza, le chiamate ai flow falliscono con "Unable to find api with id" |
| Interfaccia | `src/components/` (Fluent UI 9) e `src/app.css`, che usa i token di colore del tema Fluent. Non mettere classi di layout sul `FluentProvider`: Fluent le copia anche sul contenitore dei popup |

Dettagli che cambiano rispetto alla vecchia canvas:

- **Gruppi destinatari**: il salvataggio aggiunge e rimuove solo i gruppi cambiati, invece di cancellarli e ricrearli tutti.
- **Pulsanti della card**: non c'è il campo *Testo del pulsante*. La card ha *Dimmi di più* e *Ignora*, che inviano un messaggio all'agente in chat. Con *Dimmi di più* l'agente risponde con il pulsante *Apri il contenuto* (se la comunicazione ha un link) e poi con una spiegazione del Coach.
- **Fuso orario**: `vm_timezone` riceve quello del browser, ad esempio `Europe/Rome`. Nessun flow lo legge.
- **Storico**: mostra le 500 comunicazioni più recenti e fino a 5000 esiti per comunicazione. Titolo e UPN si filtrano nel browser, perché in Dataverse sono colonne di testo multiriga.
