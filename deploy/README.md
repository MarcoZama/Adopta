# Adopta IT / EN: sorgenti ed export nativi 1.0.0.20

Per la descrizione del prodotto: [README principale](../README.md).
La pipeline GitHub crea nuovi export nativi IT/EN dopo il merge in `main`:
[configurazione CI e download delle Release](CI.md).
Le sezioni seguenti documentano anche le verifiche storiche, non l'esito
delle future esecuzioni CI.

## File versionati e artefatti locali

Git conserva i sorgenti IT/EN, i test, gli script, i lockfile npm e i metadati
necessari alla compilazione: gli schemi SDK in `.power/schemas`, i binding
generati e gli asset delle code app inclusi nella soluzione sorgente.
Non escludere queste dipendenze insieme alle cache.

Non sono versionati dipendenze installate, output `dist`, `dist-it`, `dist-en`,
staging `.solution-build`, ZIP nella radice, log, cache, file temporanei,
credenziali e configurazioni `*.local.*`. I pacchetti e i relativi hash/manifest
rimangono sul disco, ma non fanno parte di un clone del repository: conservarli
separatamente come artefatti di rilascio. I collegamenti a `dist` in questa guida
indicano tali percorsi locali, non download disponibili tramite Git.

I file `deploymentSettings*.json` versionati sono modelli con valori vuoti:
creare copie `deploymentSettings.it.local.json` / `deploymentSettings.en.local.json`
per i valori dell'ambiente. Non inserire segreti nei modelli o nei sorgenti.

## Export nativi 1.0.0.20: correzione avvio delle app

**Usare la 1.0.0.20. I pacchetti IT/EN 1.0.0.18 e 1.0.0.19 hanno un difetto
di packaging delle code app e sono conservati soltanto come archivio.**
Il primo asset del manifest era `edition.json`: il player mostrava il JSON
diagnostico invece dell'interfaccia. Non era una perdita dei dati o delle app.

Il builder ora mette `index.html` al primo posto ed esclude il diagnostico dagli
asset pubblicati. Il controllo viene eseguito anche sugli export nativi, non
soltanto sulla directory di build. Un test di regressione verifica ordine,
esclusione e rifiuto di una build senza HTML; la suite completa passa 24 test.

| Edizione | Managed | Unmanaged |
|---|---|---|
| IT | [Adopta_IT_1_0_0_20_managed.zip](../dist/Adopta_IT_1_0_0_20_managed.zip) | [Adopta_IT_1_0_0_20_unmanaged.zip](../dist/Adopta_IT_1_0_0_20_unmanaged.zip) |
| EN | [Adopta_EN_1_0_0_20_managed.zip](../dist/Adopta_EN_1_0_0_20_managed.zip) | [Adopta_EN_1_0_0_20_unmanaged.zip](../dist/Adopta_EN_1_0_0_20_unmanaged.zip) |

Sono export nativi da **adopta-v2**, con SHA-256 individuali e flag managed
verificati. Nello staging sono stati sostituiti solo metadati e asset delle app
e la versione della soluzione, preservando agenti, flow, tabelle e ruoli.
Verificati 46 YAML e 161 XML per edizione; i 57 payload funzionali di ciascuna
coppia sono identici. Due diagnostici in meno spiegano la differenza rispetto
ai 59 payload della 1.0.0.19.
Dettagli: [manifest nativo 1.0.0.20](../dist/Adopta_1_0_0_20_native.json).

Entrambe le managed 1.0.0.20 sono installate in **Adopta-V3**. Sono state aperte
nel player le quattro app: Admin IT/EN mostrano le impostazioni e l'assenza di
configurazione; Communications IT/EN caricano l'elenco vuoto. Nessun record e'
stato creato, nessun invio o pianificazione e' stato richiesto. Questo verifica
l'avvio e la lettura iniziale, non il collaudo di salvataggio o consegna Teams.
Restano validi i limiti sulla pubblicazione live degli agenti indicati sotto.

### Recupero del warning di import IT in Adopta-V3

Il GUID mancante corrispondeva ai metadati della tabella Delivery nel target:
la tabella esisteva e le connessioni erano Connected. Dopo pubblicazione dei
metadati e reimport managed, e' stata completata l'attivazione nativa
DeliverCommunication prima di DispatchScheduled. Entrambi sono ora On;
la verifica Dataverse conferma Activated. Nessuna definizione e' stata salvata
nell'editor: nella soluzione i flow restano Managed: Yes, Customized: No.
La verifica finale nel portale conferma tutti e dieci i flow IT/EN On.
Gli invii restano bloccati per assenza di una configurazione abilitata.

Il recupero di questo ambiente e' verificato; **non equivale alla certificazione
di un primo import senza warning in un ambiente vuoto**. La procedura di controllo
e recupero senza livelli unmanaged e' nella [guida di installazione](INSTALL.md).

## Archivio export nativi 1.0.0.19 (app difettose)

L'aggiornamento e' stato importato in **adopta-v2** usando una copia nativa
aggiornata dell'ambiente e applicando soltanto le modifiche agli agenti.
Workflow, app, tabelle e ruoli sono stati mantenuti invariati nello staging;
tutti e dieci i flow sono rimasti Activated. Nessun flow o invio di prova
e' stato richiesto dall'assistente.

| Edizione | Managed | Unmanaged |
|---|---|---|
| IT | [Adopta_IT_1_0_0_19_managed.zip](../dist/Adopta_IT_1_0_0_19_managed.zip) | [Adopta_IT_1_0_0_19_unmanaged.zip](../dist/Adopta_IT_1_0_0_19_unmanaged.zip) |
| EN | [Adopta_EN_1_0_0_19_managed.zip](../dist/Adopta_EN_1_0_0_19_managed.zip) | [Adopta_EN_1_0_0_19_unmanaged.zip](../dist/Adopta_EN_1_0_0_19_unmanaged.zip) |

Sono copie degli export nativi, con flag managed/unmanaged verificati e SHA-256
individuali. I 59 payload funzionali di ciascuna coppia sono identici.
Le sei definizioni agente aggiornate per edizione sono state confrontate
semanticamente con i sorgenti attesi; il vecchio topic del principale e'
disattivato e quello del Coach e' presente. SDK: 46 YAML e 161 XML per edizione
nel formato Both, senza valori d'ambiente esportati.
Dettagli: [manifest nativo 1.0.0.19](../dist/Adopta_1_0_0_19_native.json).

**Pubblicazione live non confermata per tutti gli agenti:** le personalizzazioni
Dataverse sono pubblicate e la CLI ha confermato Adopta IT. Per il Coach IT
ha restituito uno stato fallito precedente, per quello EN ha generato un errore
interno di parsing della risposta di stato; Adopta EN non e' stata pubblicata
da quella sequenza interrotta. Verificare in Copilot Studio e pubblicare
Coach-principale per entrambe le edizioni prima della prova Teams.
Gli export contengono comunque la revisione 1.0.0.19 verificata, non la 1.0.0.18.

## 1.0.0.19: attesa del Coach e chiarimenti

La modifica e' nei sorgenti IT/EN, nelle build locali e negli export nativi
1.0.0.19. E' importata nell'ambiente, ma la pubblicazione live completa e il
collaudo Teams restano da confermare come indicato sopra. Gli export nativi
1.0.0.18 sotto restano invariati e non includono questa modifica.

- Il vecchio `MessaggioAttesa` del principale mantiene lo schema ma e' disattivato
  e non contiene piu' un trigger OnActivity o messaggi: nessuna attesa automatica
  basata sulle cinque parole.
- Il Coach ha un topic esplicito `MessaggioAttesa` che richiede ReadyToResearch
  e una ricerca non vuota. Prima dei chiarimenti non va chiamato; se mancano ruolo
  o dati essenziali, il Coach pone subito una sola domanda.
- La deduplicazione usa l'identificatore supportato
  `System.Recognizer.TriggeringMessage.Id`, non il testo della domanda o
  un inesistente `System.Activity.Id`. Lo stesso messaggio genera al massimo
  un avviso; un nuovo messaggio con lo stesso testo puo' generarne uno nuovo.
  Senza un ID affidabile restituisce WaitingMessageSent=false e non mostra
  l'avviso opzionale. La ricerca puo' proseguire.
- Il fallback di ricerca richiama lo stesso topic immediatamente prima del
  recupero delle fonti; il suo avviso nativo e' disabilitato per non raddoppiare
  il messaggio. Il motore knowledge e le fonti configurate non sono riscritti.
- Per le richieste di coaching il principale non raccoglie prima il ruolo:
  chiarimenti e risposta appartengono al Coach. Il riscontro implicito distingue
  userMessageSent, awaitingUser, interactionSummary e openQuestions.
  Una domanda gia' posta richiede di attendere l'utente, non di ripeterla.
  Non sono stati aggiunti output strutturati fittizi al connected agent.
- L'attesa specifica dei pulsanti delle card di comunicazione rimane nel principale,
  invariata. L'avviso del Coach non interrompe la ricerca e non e' una risposta finale.

Le istruzioni dei quattro agenti rispettano il budget di 8.000 caratteri.
Quelle dei Coach sono state compattate conservando i confini, le regole sulle
fonti, il feedback al parent e i vincoli di integrita'. La suite conta 23 test.
I test locali verificano formule Power Fx, readiness, query vuota, ID assente,
richiami ripetuti e messaggi successivi, oltre a sintassi e semantica SDK.
La scelta del topic da parte del modello e l'assenza del duplicato in Teams
richiedono comunque una prova live: le sole istruzioni non costituiscono una
dimostrazione del comportamento generativo.

Per la verifica dopo import e pubblicazione: usare la domanda dello screenshot
con ruolo sconosciuto (una domanda, nessuna attesa), rispondere con il ruolo
(nessuna nuova richiesta dello stesso dato), poi richiedere un caso d'uso con
contesto completo (al massimo un'attesa prima della ricerca). Ripetere IT/EN,
saluti/risposte rapide e follow-up sulle card. Consultare l'activity map per
distinguere messaggi del Coach e riscontro al principale.
Riferimento: [progettazione dei subagenti senza duplicati](https://learn.microsoft.com/microsoft-copilot-studio/guidance/generative-orchestration-subagents).

## Archivio export nativi precedenti: 1.0.0.18 (app difettose)

Le due soluzioni sono state importate nell'ambiente di sviluppo **adopta-v2**
ed esportate nativamente da Power Platform in entrambi i formati:

| Edizione | Managed | Unmanaged |
|---|---|---|
| IT, UniqueName `Adopta` | [Adopta_IT_1_0_0_18_managed.zip](../dist/Adopta_IT_1_0_0_18_managed.zip) | [Adopta_IT_1_0_0_18_unmanaged.zip](../dist/Adopta_IT_1_0_0_18_unmanaged.zip) |
| EN, UniqueName `AdoptaEN` | [Adopta_EN_1_0_0_18_managed.zip](../dist/Adopta_EN_1_0_0_18_managed.zip) | [Adopta_EN_1_0_0_18_unmanaged.zip](../dist/Adopta_EN_1_0_0_18_unmanaged.zip) |

I quattro ZIP in `dist` sono copie byte-per-byte degli export nativi, non
conversioni da unmanaged a managed. Ogni ZIP ha il proprio `.sha256`;
[provenienza e verifiche](../dist/Adopta_1_0_0_18_native.json) sono registrate
separatamente. Gli unmanaged nativi sostituiscono le precedenti bozze locali
con lo stesso nome.

Verifiche effettuate: manifest e flag managed, pack/unpack della coppia nativa,
45 payload YAML e 160 XML per edizione nel formato Both, sei tabelle, due agenti,
cinque flow, due app e due ruoli per soluzione. I 58 payload funzionali confrontati
sono identici tra managed e unmanaged della stessa edizione. Lingue primarie
1040 per entrambi gli agenti IT, 1033 per entrambi gli agenti EN. Nessun valore
d'ambiente esportato e nessun nome di connessione fisica nei payload dei flow.
Identita' di esecuzione dei connettori e tabelle referenziate sono coerenti con
i sorgenti.

I cinque flow EN risultano ora **Activated**, dopo il salvataggio nell'editor
nativo. Anche il dispatcher EN e' attivo, come confermato esplicitamente
dall'utente. L'assistente non ha invocato flow o effettuato invii di prova.

Restano da collaudare un import managed in un ambiente di destinazione pulito,
pubblicazione e conversazioni in Teams, rendering e invio end-to-end.
**Non importare i managed sopra le omonime soluzioni unmanaged dell'ambiente
di sviluppo:** usare un ambiente di destinazione separato, senza eliminare dati
per tentare un cambio di tipo.

## Sorgenti e build locali di authoring

Le istruzioni dalla sezione 1.0.0.17 in poi documentano la baseline storica.

- [src](../src/): italiano, UniqueName `Adopta` e identita' esistenti conservate.
- [src-en](../src-en/): nuova bozza indipendente inglese, UniqueName `AdoptaEN`.
- [editions.json](editions.json): profili fissi di compilazione. Gli appId EN
  locali restano `null`: il contesto CLI di sviluppo non e' stato riallineato
  agli app importati; non vengono inventati identificatori.
- [english-identities.json](english-identities.json): mappa stabile delle
  identita' locali EN; non dimostra che i componenti esistano sulla piattaforma.
- [Piano e stato](PLAN-IT-EN.md): requisiti, migrazione e collaudo ancora necessari.

Entrambe le coppie di agenti sono monolingue nei sorgenti: nessuna scelta della
lingua da messaggio, profilo o fonti, nessun input linguistico nella delega.
Le due app mantengono IT/EN, ma ogni build usa soltanto il proprio backend.
Le nuove card e `vm_language` alla pianificazione sono fissati all'edizione.
Le card gia' pianificate conservano il payload; i vecchi pulsanti IT/EN restano
riconoscibili come protocollo, senza cambiare la lingua della risposta.

### Costruzione e verifiche senza accesso all'ambiente

Prerequisiti: Node.js con TypeScript nativo (22.18+ o LTS successiva), PowerShell 7,
PAC CLI con SDK di authoring. Ripristinare anche le dipendenze dei due progetti
frontend quando non sono presenti.

```powershell
npm ci --ignore-scripts
npm test
.\deploy\Build-Solution.ps1 -Edition it -SkipTests
.\deploy\Build-Solution.ps1 -Edition en -SkipTests
```

Le build ricompilano entrambe le app per l'edizione scelta, incorporano i nuovi
bundle in una copia temporanea dei sorgenti, verificano payload e metadati,
eseguono pack/unpack e validano anche il risultato estratto.

Output di authoring, **unmanaged e non qualificati per installazione cliente**,
separati dagli export nativi per impedirne la sovrascrittura:

- `dist/local/Adopta_IT_1_0_0_19_unmanaged.zip` e relativo SHA-256;
- `dist/local/Adopta_EN_1_0_0_19_unmanaged.zip` e relativo SHA-256;
- settings IT in [deploymentSettings.json](deploymentSettings.json);
- settings EN generati dallo ZIP tramite `pac solution create-settings`, senza
  connessioni o valori cliente precompilati.

Gli script di build locale non eseguono login, import, export, creazione agenti
o pubblicazione. `-PackageType Managed` continua a fallire esplicitamente:
per i managed si usano gli export nativi, senza riciclare vecchie baseline
o sovrascrivere l'export con contenuti locali non sincronizzati.

La suite copre 92 payload YAML e 286 XML di authoring, isolamento degli schemi e dei GUID,
binding SDK, query effettive Power Fx e card. La semantica dei topic principali
e dei due Coach e' verificata con l'SDK locale. L'inizializzazione autenticata
richiede schemi di runtime non disponibili nel BotEntity locale: i suoi contratti
profilo/branding/classificazione sono controllati separatamente con tipi dichiarati,
non presentati come collaudo del canale autenticato.

### Passaggi residui di collaudo

1. Verificare prompt AI Builder, knowledge, autenticazione e pubblicazione
   Coach-principale per entrambe le edizioni in Copilot Studio.
2. Riallineare i contesti CLI delle app agli appId di sviluppo prima di nuovi
   push; non usare il `power.config.json` IT per EN. Il setup blocca tale riuso.
3. Eseguire import managed affiancati in un ambiente pulito, nei due ordini,
   aggiornamento indipendente e verifica dei privilegi reali.
4. Completare prove delle quattro app, Teams e consegna end-to-end.

L'import unmanaged e l'export nativo sono verificati. Non equivalgono a un
collaudo completo di produzione.

### Recupero dell'import EN: metadati e primo salvataggio

Nel primo import i flow potevano segnalare `GetMetadataForGetEntity*` o
`GetMetadataForPatchEntity` con Entity ID inesistente. La verifica nell'ambiente
ha poi trovato tutte e sei le tabelle, inclusi esattamente i quattro ID segnalati:
non erano GUID codificati nello ZIP da sostituire.

Sono state pubblicate le personalizzazioni. Il solo `Enable-AdminFlow`
restituiva `409 CannotStartUnpublishedSolutionFlow`: per il primo salvataggio
serviva aprire il flow nell'editor, verificare le connessioni e salvare.
Dopo il salvataggio nativo, DeliverCommunication, ApplySettings e
ManageCommunication risultano attivi. Il figlio va salvato prima del parent;
il dispatcher si abilita soltanto quando si desiderano davvero gli invii.

Non cancellare e ricreare tabelle per questo errore e non aggiungere al pacchetto
gli ID di metadati specifici dell'ambiente.

## Baseline managed 1.0.0.17 e storia dei rilasci

Per installare il pacchetto managed presso un cliente, passo passo: [INSTALL.md](INSTALL.md). Questo file raccoglie i dettagli tecnici e la storia delle versioni.

Pacchetti:
- `dist/Adopta_1_0_0_17_managed.zip` (**managed**): pacchetto managed ricostruito localmente dalla baseline managed 1.0.0.16.
- `dist/Adopta_1_0_0_17.zip` (unmanaged): generato dai sorgenti aggiornati con `pac solution pack`.
- `dist/Adopta_1_0_0_17.sha256`: hash dei due pacchetti.

### 1.0.0.17: correzione degli errori di authoring

- L'output dell'azione interna `ResolveCommunication` dichiara esplicitamente le colonne restituite dalla FetchXML: ID consegna, data di invio, ID, titolo, corpo e link della comunicazione. La precedente tabella generica dichiarava solo `dynamicProperties`, quindi il designer non riconosceva i campi usati dal resolver.
- La card finale costruisce l'elenco vuoto dei pulsanti con `FirstN(..., 0)`, non con un `Filter(..., false)` che il validatore di authoring segnalava come predicato costante.
- I test includono ora il controllo statico sulle colonne dichiarate e la validazione semantica Microsoft tra i componenti. Il test negativo riproduce esattamente i 22 diagnostici del resolver e quello della card della 1.0.0.16; i sorgenti corretti ne producono zero sui due topic interessati.
- I pacchetti 1.0.0.16 restano disponibili come baseline, ma usare la 1.0.0.17 per questa funzionalità.

### 1.0.0.16: approfondimenti unificati

- I nuovi pulsanti *Dimmi di più* trasportano un riferimento stabile e versionato nel `messageBack`, lasciando invariata l'etichetta visibile. Non servono nuove tabelle, connessioni o app.
- Il resolver interno cerca soltanto consegne *Sent* all'identità autenticata. Supporta ID, ultimo invio e titolo esatto; le vecchie card usano titolo e link, anche quando il link manca. Più corrispondenze richiedono una scelta; gli elenchi sono paginati a dieci risultati senza scartare automaticamente i messaggi più vecchi.
- Card e chat passano dallo stesso topic di spiegazione e mostrano una sola card finale. URL assente/non HTTPS: nessun pulsante di apertura. Fonti insufficienti: limite esplicito e testo originale, non una spiegazione inventata.
- La comunicazione selezionata e la spiegazione restano nel contesto della sessione. Le spiegazioni successive rileggono quella comunicazione; esempi pratici e prompt vanno al Coach con contesto esplicito, senza dichiarare una nuova lettura.
- Il tool che legge soltanto l'ultimo invio resta per le domande sui dati dell'ultimo invio. Non viene usato per sostituire una card precedente.

**Verifiche locali, non validazione dell'ambiente:** i pacchetti sono costruiti senza interrogare o modificare Power Platform. I test verificano sintassi, tipi dichiarati e semantica dei due topic corretti con l'SDK Microsoft e le impostazioni locali predefinite, oltre a formule Power Fx effettive, costruzione delle card e riferimenti. Import, pubblicazione, instradamento generativo, risposta dei connettori e rendering Teams restano da verificare con la checklist di [INSTALL.md](INSTALL.md). Non considerare questi test locali un'approvazione per la produzione.

### Ricostruzione locale: script attuale

Prerequisiti: Node.js, PowerShell 7 e PAC CLI con SDK di authoring (testato con PAC 2.12.2). Dalla radice del repository:

```powershell
npm ci --ignore-scripts
npm test
.\deploy\Build-Solution.ps1
```

Lo script attuale costruisce la bozza unmanaged IT 1.0.0.18; aggiungere `-Edition en`
per EN. La vecchia procedura a overlay managed e' stata rimossa perche' non
copriva agenti, schema e bundle modificati da questa separazione. I pacchetti
storici 1.0.0.16 e 1.0.0.17 restano intatti. Non viene convertito unmanaged in managed.

### Provenienza della baseline 1.0.0.15

I pacchetti 1.0.0.15 sono del 2026-11-05 e contengono le modifiche 1.0.0.14 e 1.0.0.15 descritte dopo la 1.0.0.13. La 1.0.0.15 non è ancora stata importata in sviluppo, quindi la managed non viene da un export:
- è la managed 1.0.0.13, l'export managed dello sviluppo senza la vecchia variabile `vm_SendingEnabled`, la canvas e la model-driven;
- con i 12 file dei topic cambiati, presi da `src/`, e la versione 1.0.0.15.

Rispetto alla managed 1.0.0.13 cambiano solo quei file e `solution.xml`. Le code app sono quelle della 1.0.0.12.

La procedura storica prevedeva un nuovo import/export della 1.0.0.15. Per questa modifica si usano invece i pacchetti locali esistenti, senza accesso all'ambiente.

In `dist/` restano i pacchetti 1.0.0.12 e 1.0.0.13. `dist/Adopta_1_0_0_14.zip` ha solo la correzione della lingua ed è superato.

I due pacchetti hanno gli stessi componenti: le code app *Adopta Communications (code app)* e *Adopta Admin (code app)*, gli agenti *Adopta* e *Adopta - Adoption Coach*, e tabelle, flow, ruoli, variabili e connection reference. Un ambiente che ha già la soluzione unmanaged non può passare al managed con un aggiornamento: va importato in un ambiente pulito, oppure va prima eliminata la soluzione unmanaged con i suoi componenti.
Impostazioni di deploy: `deploy/deploymentSettings.json`.

## 1. Prerequisiti nell'ambiente di destinazione

- Ambiente con Dataverse, Copilot Studio e crediti AI Builder/Copilot (il prompt *ClassifyDepartment* classifica il reparto dell'utente).
- Per le code app (vedi [code-app/README.md](../code-app/README.md) e [admin-app/README.md](../admin-app/README.md)):
  - funzionalità **Power Apps code apps** abilitata nell'ambiente (Power Platform admin center → *Impostazioni* → *Prodotto* → *Funzionalità*);
  - utenti con licenza Power Apps Premium.
- Connessioni create in anticipo (Power Automate → Connessioni), con un account di servizio:

| Connection reference | Connettore | Uso |
|---|---|---|
| `vm_adoptadataverse` | Microsoft Dataverse | Flow di pianificazione, gestione, invio e applicazione delle impostazioni |
| `vm_adoptaoffice365groups` | Office 365 Groups | Lettura dei membri dei gruppi Entra (Graph) |
| `vm_adoptateams` | Microsoft Teams | Invio della card dal bot Adopta |
| `vm_Adopta.shared_commondataserviceforapps…` | Microsoft Dataverse | Tool "Get My Recent Communications" dell'agente |
| `vm_Adopta.shared_office365users…` | Office 365 Users | Lettura del profilo (reparto) dell'utente |

Le due reference Dataverse possono usare la stessa connessione. L'account della connessione `vm_adoptadataverse` deve avere il ruolo **System Customizer** (o System Administrator), perché *AdoptaApplySettings* scrive le variabili d'ambiente.

## 2. Compilare `deploymentSettings.json`

- `ConnectionId` di ogni connection reference: `pac connection list --environment <url>`.
- Le variabili d'ambiente sono facoltative: il flow *AdoptaApplySettings* le scrive comunque quando l'admin salva le impostazioni in *Adopta Admin (code app)* (sezione 5).
  - Conviene compilare `vm_AdoptaDataverseUrl` con l'URL dell'ambiente, senza slash finale (per esempio `https://contoso.crm4.dynamics.com`). Gli agenti si pubblicano già all'import, e con la variabile compilata i loro strumenti Dataverse funzionano da subito.
  - `vm_AdoptaCoachKnowledgeUrl` si può lasciare vuota e impostare dopo in *Adopta Admin*.

## 3. Import

```powershell
pac solution import --environment https://<org>.crm4.dynamics.com `
  --path dist\Adopta_1_0_0_17_managed.zip `
  --settings-file deploy\deploymentSettings.json `
  --activate-plugins --publish-changes
```

In alternativa si può importare dal portale maker: la procedura guidata chiede solo le connessioni.

Se al termine compare l'avviso che uno o più flow non si sono attivati, accendili a mano in quest'ordine: prima *AdoptaDeliverCommunication* (flow figlio), poi *AdoptaDispatchScheduled*, *AdoptaScheduleCommunication*, *AdoptaManageCommunication* e *AdoptaApplySettings*. L'errore `ChildFlowNeverPublished` su *AdoptaDispatchScheduled* è solo la conseguenza di *AdoptaDeliverCommunication* spento.

Se l'attivazione fallisce con `GetMetadataForPatchEntity` / `GetMetadataForGetEntity` e "Entity With Id = … does not exist":
- L'ID nell'errore non viene dalla soluzione: è un ID di tabella che il servizio dei flow ha in cache per quell'ambiente e che non esiste più. Succede di solito quando un import precedente nello stesso ambiente è fallito o è stato annullato, oppure quando le tabelle sono state eliminate e ricreate.
- Esegui *Pubblica tutte le personalizzazioni*, aspetta 15-30 minuti e riaccendi i flow nell'ordine sopra.
- Se l'errore resta, controlla che l'ID non corrisponda a nessuna tabella: in Power Apps esegui la FetchXML `<fetch><entity name='entity'><attribute name='logicalname'/><filter><condition attribute='entityid' operator='eq' value='<ID>'/></filter></entity></fetch>` (ad esempio con `pac org fetch`). Se non restituisce righe è la cache: con una soluzione unmanaged apri il flow, riseleziona la tabella nelle azioni indicate, salva e riaccendilo.

### Migrazione dalla versione precedente

Dalla 1.0.0.4 la soluzione ha un nuovo nome univoco (`Adopta`), una nuova tabella per la personalizzazione (*Adopta Setting*) e nuovi nomi interni per tabelle, agenti, flow, app, ruolo, variabili d'ambiente e connection reference. L'import crea quindi componenti **nuovi** e non aggiorna quelli della soluzione precedente (`BuddyCommunications`, fino alla 1.0.0.3):

- i dati delle vecchie tabelle non vengono migrati;
- l'agente è un bot diverso: va pubblicato e approvato di nuovo in Teams;
- le due soluzioni possono convivere nello stesso ambiente.

Per rimuovere la vecchia versione, elimina i suoi componenti (flow, app, agenti, tabelle, ruolo, variabili, connection reference) e poi la soluzione. Una soluzione unmanaged eliminata da sola non rimuove i componenti.

La 1.0.0.5 aggiunge alla 1.0.0.4:
- l'app model-driven *Adopta Admin*;
- la colonna *Logo* in *Adopta Setting*;
- le etichette dei gruppi destinatari;
- i privilegi del ruolo *Adopta Administrator* sui gruppi destinatari.

Si importa sopra la 1.0.0.4 come aggiornamento.

La 1.0.0.6 aggiunge la code app *Adopta Communications (code app)*. La canvas *Adopta Communications* resta nella soluzione, quindi le due app sono disponibili insieme.

La 1.0.0.7:
- aggiunge la variabile `vm_AdoptaCoachKnowledgeUrl` per la knowledge SharePoint del Coach;
- sostituisce nella card il pulsante con il link con i pulsanti *Visualizza link* e *Ignora*. Le comunicazioni già pianificate mantengono la card precedente. Il campo *Testo del pulsante* non è più usato: la code app non lo mostra, la canvas lo mostra ancora ma il flow lo ignora;
- dichiara nella code app la dipendenza dalla connessione Dataverse dei flow;
- sposta la configurazione in *Adopta Admin* → **Impostazioni**, con le nuove colonne *Coach knowledge URL*, *Sending enabled*, *Apply status* e *Applied on*:
  - il nuovo flow *AdoptaApplySettings* scrive le variabili `vm_AdoptaDataverseUrl` (ricavata dall'ambiente) e `vm_AdoptaCoachKnowledgeUrl`;
  - le due variabili non sono più obbligatorie all'import;
  - l'interruttore degli invii è la colonna *Sending enabled*: la variabile `vm_SendingEnabled` esce dalla soluzione. Negli ambienti aggiornati resta come componente unmanaged inutilizzato e si può eliminare.

Aggiornando dalla 1.0.0.6:
1. Apri il record in *Adopta Admin* → **Impostazioni**.
2. Compila *Coach knowledge URL* e salva, così *AdoptaApplySettings* applica la configurazione.
3. Se gli invii erano abilitati, imposta *Sending enabled* = Yes: la nuova colonna parte da No, quindi dopo l'aggiornamento gli invii sono bloccati.

La 1.0.0.9 (la 1.0.0.8 è stata solo una versione di sviluppo) cambia l'agente *Adopta*:
- istruzioni riscritte in forma più compatta, con le stesse regole su Adoption Coach, comunicazioni e pulsanti delle card;
- il ruolo dell'utente è il reparto restituito dal prompt *ClassifyDepartment*, che ne riconosce 12, invece dei soli HR, Sales, Legal e IT.

Aggiornando dalla 1.0.0.7 si importa come aggiornamento e poi si ripubblica *Adopta* in Copilot Studio.

La 1.0.0.10:
- sostituisce nella card il pulsante *Visualizza link* con **Dimmi di più**, che compare sempre:
  - il clic invia all'agente "Dimmi di più sulla comunicazione «titolo»: link";
  - il nuovo topic *Dimmi di più* risponde con una card con il titolo e il pulsante **Apri il contenuto**, solo se il link è `https://`;
  - poi l'agente recupera la comunicazione e fa spiegare il contenuto all'Adoption Coach;
  - le comunicazioni già pianificate mantengono la card precedente;
- riprende gli agenti dall'ambiente di sviluppo, con le modifiche di Vincenzo:
  - istruzioni di *Adopta* aggiornate per *Dimmi di più*;
  - ricerca web disattivata;
  - nessun messaggio di benvenuto all'avvio della conversazione;
  - istruzioni di *Adopta - Adoption Coach* riviste;
  - nuova knowledge SharePoint del Coach, *Adopta*. Legge l'URL da `vm_AdoptaCoachKnowledgeUrl`, quindi da *Coach knowledge URL* in *Impostazioni*. Ora la soluzione collega la knowledge alla variabile, come fa Copilot Studio quando si sceglie una variabile dal selettore {x};
  - un messaggio di debug con il ruolo dell'utente nel topic *InizializzazioneProfilo*;
- aggiunge la code app **Adopta Admin (code app)** per impostazioni e gruppi destinatari (vedi [admin-app/README.md](../admin-app/README.md)). La model-driven *Adopta Admin* resta disponibile.

Aggiornando dalla 1.0.0.9:
1. Con un pacchetto unmanaged la vecchia knowledge del Coach, *Enterprise Copilot Adoption Library*, resta nell'ambiente: eliminala in Copilot Studio (*Adopta - Adoption Coach* → Knowledge).
2. Ripubblica *Adopta - Adoption Coach* e poi *Adopta*.

La 1.0.0.11 toglie dalla soluzione l'app canvas *Adopta Communications* e l'app model-driven *Adopta Admin*, con la sua mappa del sito. Le sostituiscono le code app *Adopta Communications (code app)* e *Adopta Admin (code app)*. Agenti, tabelle, flow, ruoli e variabili non cambiano.

Aggiornando dalla 1.0.0.10:
1. Prima dell'aggiornamento condividi le due code app con chi usava la canvas e la model-driven.
2. Con il pacchetto managed importa come *upgrade*: è l'opzione predefinita del portale, oppure `pac solution import` con `--stage-and-upgrade`. Così la canvas e la model-driven vengono eliminate. Con *update*, o con `pac solution import` senza quell'opzione, restano nell'ambiente.
3. Con il pacchetto unmanaged l'import non elimina niente: togli le due app dalla soluzione ed eliminale a mano (Power Apps → *App*).

La 1.0.0.12:
- **Italiano e inglese**:
  - *Adopta Setting* ha la nuova colonna *Default language* (`vm_defaultlanguage`, `it` o `en`). Si imposta in *Adopta Admin (code app)* → **Impostazioni** → *Lingua*.
  - Ogni comunicazione ha la colonna *Language* (`vm_language`): chi compone sceglie la *Lingua della card*. I pulsanti della card sono *Dimmi di più* e *Ignora* in italiano, *Tell me more* e *Ignore* in inglese. Le comunicazioni create prima, senza lingua, sono in italiano.
  - L'agente *Adopta* risponde nella lingua del messaggio, in italiano o in inglese.
  - Per i testi fissi dei topic (errori, saluti, conferme) l'agente usa la lingua preferita del profilo Microsoft 365 dell'utente. Se il profilo non è né in italiano né in inglese usa *Default language*; se manca anche questa, l'italiano.
  - Il topic *Dimmi di più* riconosce anche il pulsante inglese e risponde con *Open the content*.
  - Le due code app hanno il selettore **IT / EN**: nella barra laterale di *Adopta Communications*, in alto a destra in *Adopta Admin*. Senza una scelta usano la lingua del browser, poi *Default language*.
  - I flow scrivono i messaggi in italiano; in inglese le app li mostrano tradotti.
- **Utenti senza l'agente installato**:
  - Se Teams rifiuta la card perché il destinatario non ha installato l'agente, la consegna ha il nuovo stato *Not installed* ("Agente non installato") invece di *Unknown* ("Da verificare").
  - La comunicazione li conta nella nuova colonna *Not installed count*.
  - Lo storico della code app mostra il contatore e spiega cosa fare: distribuire l'app Teams a quegli utenti con un criterio di configurazione app.
  - Il flow riconosce il caso dal testo dell'errore di Teams, quando contiene "install" o "roster". Gli altri errori restano *Da verificare*.
- **Icona dell'agente**: *Adopta* ha l'icona predefinita di Copilot Studio al posto del robot, e la stessa icona compare in Teams (sezione 5).
- **Variabili d'ambiente**: descrizioni in inglese e valori facoltativi in `deploymentSettings.json` (sezione 2).

Aggiornando dalla 1.0.0.11:
1. Importa come aggiornamento.
2. Ripubblica *Adopta - Adoption Coach* e poi *Adopta* in Copilot Studio.
3. In *Adopta Admin (code app)* → **Impostazioni** scegli la *Lingua predefinita* e salva.
4. Le comunicazioni già pianificate mantengono la card che avevano, in italiano.

La 1.0.0.13 dà un segnale di attesa mentre l'agente lavora. Teams non mostra un indicatore per tutta la durata della risposta, quindi i segnali sono due:
- il topic *Indicatore di scrittura* (priorità -10, prima di *InizializzazioneProfilo*) invia l'attività *Typing* a ogni messaggio. In Teams l'indicatore "sta scrivendo" resta visibile solo per pochi secondi;
- il topic *Messaggio di attesa* (priorità 10, dopo *InizializzazioneProfilo*) risponde "Un attimo, sto preparando la risposta…" o "One moment, I'm preparing your answer…", secondo la lingua dell'utente, poi rinvia *Typing*. Parte solo per i messaggi di almeno cinque parole e non per i pulsanti delle card: *Dimmi di più* ha già la sua card immediata e *Ignora* ha una risposta breve.

Tutti i topic `OnActivity` girano prima dell'orchestrazione e non la sostituiscono: dopo il messaggio di attesa arriva la risposta dell'agente o del Coach.

La 1.0.0.14 corregge un errore che il designer di Copilot Studio mostra nei messaggi bilingui: "Incompatible type comparison in expression 'If(Global.UserLanguage = "en", …)'". `Global.UserLanguage` viene impostata solo in *InizializzazioneProfilo*, e negli altri topic il designer non ne deduce il tipo, quindi non la confronta con un testo. I 26 confronti nei 10 topic di sistema e in *Messaggio di attesa* ora sono `Text(Global.UserLanguage) = "en"`, che funziona sia se il tipo è testo sia se è dinamico. Il comportamento non cambia. Se aggiungi un topic che legge la lingua, usa la stessa forma.

Con la 1.0.0.15, *Dimmi di più* risponde con un'unica card invece di card più messaggio del Coach:
1. Il topic (priorità 5, dopo *InizializzazioneProfilo*) estrae titolo e link dal testo del pulsante, come prima.
2. Invia "Un attimo, sto preparando la risposta…" (o il testo inglese) e *Typing*: la ricerca richiede qualche secondo.
3. Un nodo *Risposte generative* (`SearchAndSummarizeContent`) cerca su learn.microsoft.com, support.microsoft.com e blogs.microsoft.com:
   - parte da titolo e link della comunicazione;
   - non usa la cronologia, la conoscenza generale del modello o i file;
   - non invia subito la risposta, che resta in `Topic.Answer` (`FullResponse`);
   - le istruzioni del nodo chiedono la lingua della domanda, nessun dato inventato, nessun link e una formattazione adatta alla card.
4. Se c'è una risposta, invia una sola card:
   - "Ottima scelta! Ecco il contenuto" e il titolo;
   - la risposta, con i rimandi [1], [2];
   - *Fonti consultate*, numerate come i rimandi;
   - una nota che la risposta è generata con l'AI;
   - il pulsante *Apri il contenuto*.

   Poi *Termina tutti gli argomenti* (`CancelAllDialogs`, *activityProcessed* predefinito) chiude il turno, così l'orchestratore non chiama anche il Coach.
5. Se non c'è una risposta, invia la card di prima e lascia continuare l'orchestratore: l'approfondimento resta del Coach, come descritto nelle istruzioni dell'agente.

Limiti:
- Il nodo non vede la knowledge del Coach: non usa la libreria SharePoint di `vm_AdoptaCoachKnowledgeUrl` né il corpo della comunicazione. Con un titolo vago la ricerca si basa sul link.
- La card mostra solo il markdown delle Adaptive Card (grassetto, elenchi, link), senza blocchi di codice né le citazioni native.

## 4. Dopo l'import

1. **Impostazioni (prima di tutto)**
   - Assegna all'admin *Basic User* + **Adopta Administrator**, condividi con l'admin la code app *Adopta Admin (code app)* e configura **Impostazioni** come descritto nella sezione 5.
   - Controlla che *Apply status* dica "Configurazione applicata".
2. **Agenti (Copilot Studio)**
   - Dopo che *Apply status* conferma l'applicazione, pubblica prima *Adopta - Adoption Coach*, poi *Adopta*.
   - Gli agenti leggono le variabili al momento della pubblicazione: ogni volta che *Apply status* dice "Variabili aggiornate", ripubblica. Pubblicare non modifica i componenti, quindi si può fare anche con il pacchetto managed.
   - In *Adopta* → Strumenti → *Get My Recent Communications* l'input *Environment* deve mostrare la variabile `vm_AdoptaDataverseUrl`.
   - La knowledge SharePoint del Coach, *Adopta*, legge l'URL da `vm_AdoptaCoachKnowledgeUrl`: non va modificata in Copilot Studio. Se la variabile è vuota il Coach non ha la knowledge, quindi compila prima *Coach knowledge URL* nelle impostazioni. Gli utenti devono avere accesso in lettura alla libreria.
3. **Canali**
   - Pubblica Adopta su Teams e Microsoft 365 Copilot (*Opzioni di disponibilità* → *Mostra a tutti nell'organizzazione*) e fai approvare l'app nel Teams admin center. Nome e icona dell'app sono quelli del pacchetto (sezione 5).
   - Il flow di invio fallisce verso gli utenti che non hanno l'app installata, quindi distribuiscila al pubblico destinatario con un criterio di configurazione app (Teams admin center → *App Teams* → *Criteri di configurazione*). Nello storico della code app questi destinatari hanno l'esito *Agente non installato*.
4. **Utenti delle code app**
   - Assegna i ruoli *Basic User* + **Adopta Communications Manager** e condividi con loro *Adopta Communications (code app)*.
   - Al primo avvio la code app chiede il consenso alla connessione Dataverse: i flow *AdoptaScheduleCommunication* e *AdoptaManageCommunication* eseguono le azioni Dataverse con l'identità dell'utente (impersonazione), quindi l'app deve passare loro la connessione dell'utente. Dalla 1.0.0.7 la code app dichiara questa dipendenza. Senza, la lettura dello stato invii fallisce con "Failed to acquire access token … Unable to find api with id".
   - Agli admin che configurano nomi, logo e gruppi destinatari assegna *Basic User* + **Adopta Administrator** e condividi con loro *Adopta Admin (code app)*. Le code app non si associano ai ruoli: vanno sempre condivise.
   - L'interruttore degli invii nelle app scrive *Sending enabled* in *Adopta Setting*: funziona solo per chi ha anche **Adopta Administrator**. Con il solo *Communications Manager* l'app mostra lo stato ma non lo cambia.
5. **Gruppi destinatari**
   - In *Adopta Admin (code app)* → **Gruppi destinatari** → **Nuovo gruppo** aggiungi ogni gruppo Entra che può ricevere comunicazioni. Compila:
     - *Nome*: il nome mostrato a chi compone;
     - *ID gruppo Entra*: l'object ID del gruppo, da Entra admin center → *Gruppi* → *Panoramica*;
     - *Tipo*;
     - *Attivo*.
   - Lo stesso ID non può essere inserito due volte. Nella composizione compaiono solo i gruppi attivi.
   - L'account della connessione Office 365 Groups deve poter leggere i membri del gruppo.
6. **Test**
   - In Teams chiedi "Qual è l'ultima comunicazione che ho ricevuto da Adopta?".
   - Invia una comunicazione di prova a un gruppo ristretto dopo aver abilitato gli invii in *Adopta Admin (code app)* → **Impostazioni** → *Invii in Teams*, oppure con l'interruttore di *Adopta Communications (code app)*.
   - Nella card ricevuta prova i pulsanti, che inviano un messaggio all'agente al posto dell'utente (`messageBack`):
     - con *Dimmi di più* in chat appare "Dimmi di più". Il resolver verifica la comunicazione e il topic comune risponde con una sola card con spiegazione e fonti; il pulsante *Apri il contenuto* compare solo per un link HTTPS. Non deve seguire una seconda spiegazione del Coach;
     - con *Ignora* l'agente risponde con una breve conferma.
   - Ripeti con *Lingua della card* = English: i pulsanti sono *Tell me more* e *Ignore*, e l'agente risponde in inglese.
   - Includi nel gruppo di prova un utente che non ha l'app Teams di Adopta: nello storico deve risultare *Agente non installato*, non *Da verificare*. Se risulta *Da verificare*, apri la diagnostica del destinatario e segnala il testo dell'errore: il flow va adeguato.

## 5. Configurare Adopta (Adopta Admin (code app) → Impostazioni)

Dopo l'import l'admin configura tutto dalla code app *Adopta Admin (code app)*, senza modificare app, flow e agenti. Con un pacchetto managed è importante: una modifica fatta in Power Apps Studio, Power Automate o Copilot Studio crea un livello unmanaged sopra i componenti, e gli aggiornamenti successivi della soluzione non avrebbero più effetto su di essi.

1. Assegna all'admin i ruoli *Basic User* + **Adopta Administrator** e condividi con l'admin *Adopta Admin (code app)*.
2. Apri *Adopta Admin (code app)* → **Impostazioni**. Basta un solo record di *Adopta Setting*: app, agente e flow usano il primo attivo per data di creazione. Se non esiste, l'app lo crea con **Crea configurazione**.
3. Compila:
   - *Titolo dell'app*, *Nome dell'agente* e *Nome della configurazione*;
   - *Lingua predefinita* in *Lingua*: italiano o inglese;
   - *URL della libreria SharePoint* in *Knowledge dell'Adoption Coach*: la cartella o libreria SharePoint del Coach, ad esempio `https://contoso.sharepoint.com/sites/Adopta/Shared%20Documents/Libreria`;
   - *Invii in Teams*: lascia gli invii bloccati fino alla fine dei test.
4. **Salva**. L'app attende per circa 40 secondi l'esito di *AdoptaApplySettings* e lo mostra in *Applicazione all'ambiente*; **Aggiorna stato** lo rilegge. L'URL dell'ambiente Dataverse non si inserisce, perché il flow lo ricava da solo.
5. Se l'esito dice "Variabili aggiornate", l'app chiede di ripubblicare gli agenti: ripubblica *Adopta - Adoption Coach* e poi *Adopta* in Copilot Studio.
6. Per il logo, dopo aver creato la configurazione, usa **Carica immagine** in *Nomi e logo* con un PNG o JPG quadrato. Il logo si salva subito.

*AdoptaApplySettings* parte quando si crea il record, quando lo si attiva o disattiva, e quando cambiano nome della configurazione, titolo dell'app, nome dell'agente o URL della knowledge (colonne *Name*, *App title*, *Agent name* e *Coach knowledge URL*). Per riapplicare senza modifiche, cambia uno di questi campi e salva. Se *Coach knowledge URL* è vuoto, la variabile del Coach resta com'è.

| Cosa | Da dove viene | Quando si aggiorna |
|---|---|---|
| Titolo e logo nell'app *Adopta Communications* | *Adopta Setting* | Alla successiva apertura dell'app |
| Knowledge SharePoint del Coach | *Adopta Setting* (*Coach knowledge URL*) → `vm_AdoptaCoachKnowledgeUrl` | Dopo la ripubblicazione degli agenti |
| Invii abilitati | *Adopta Setting* (*Sending enabled*) | Alla successiva esecuzione di *AdoptaDeliverCommunication* |
| Nome con cui l'agente si presenta in chat | *Adopta Setting* (*Agent name*) | Dalla sessione successiva: dopo circa 30 minuti di inattività o dopo "ricomincia" |
| Lingua delle nuove comunicazioni, delle app e dei testi fissi dell'agente | *Adopta Setting* (*Default language*), dopo la scelta dell'utente nelle app e la lingua del suo profilo per l'agente | Nelle app alla successiva apertura, nell'agente dalla sessione successiva |
| Nome e icona dell'agente in Teams e Microsoft 365 Copilot | Fissi nel pacchetto: *Adopta* con l'icona standard di Copilot Studio. Chi installa usa solo i portali e non modifica il pacchetto dell'app Teams | — |
| Nome e icona delle app nell'elenco di Power Apps | Fissi nel pacchetto | — |

Note:

- L'agente legge il nome con la propria connessione Dataverse: gli utenti di Teams non hanno bisogno di ruoli Dataverse.
- Senza configurazione l'agente usa "Adopta", l'app usa "Adopta Communications" e nessun logo.
- L'icona dell'agente non si prende da *Adopta Setting*: in Teams e Microsoft 365 Copilot l'app si chiama *Adopta* e ha l'icona standard. *Nome dell'agente* cambia solo il nome con cui l'agente si presenta nella conversazione.
- Le card inviate dai flow arrivano dal bot, quindi mostrano il nome e l'icona dell'app Teams.
- Il ruolo *Adopta Communications Manager* legge la configurazione ma non può modificarla.

## Note

- Una soluzione unmanaged non si converte in managed cambiando il flag. Per la 1.0.0.17 si riutilizza la struttura della baseline managed già presente in `dist/` e si applica l'overlay locale descritto sopra. Per nuovi export dall'ambiente, verificare che non rientrino la vecchia variabile `vm_SendingEnabled`, la canvas e la model-driven, componenti già rimossi dalle baseline locali.
- L'ambiente di sviluppo `prod-emea-cef2bf21` contiene ancora la soluzione precedente (1.0.0.2): il rename in Adopta è solo in `src/`.
- La code app si aggiorna con `npx pa app push --solution-id`, seguito da export e unpack in `src/` (vedi [code-app/README.md](../code-app/README.md)).
- Prima di esportare dall'ambiente di sviluppo, importaci le modifiche fatte in `src/`: l'unpack con `--allowDelete` sostituisce `src/` con il contenuto dell'ambiente.
- Ambiente di sviluppo: `prod-emea-a30e74af` (`bf52ea84-0d16-ec35-a4f2-526860910754`). Al 2026-11-04 contiene la 1.0.0.12 (unmanaged), le due code app pubblicate, i flow attivi e i due agenti pubblicati. `vm_SendingEnabled`, la canvas *Adopta Communications* e la model-driven *Adopta Admin* sono ancora nella soluzione: vanno rimosse dal portale, altrimenti il prossimo export le riporta in `src/`. Finché ci sono, l'export va riportato in `src/` senza di loro e il pacchetto managed va ripulito come descritto sopra.
- `pac copilot publish` e `pac copilot status` (CLI 2.12.2) falliscono con "'bot' entity doesn't contain attribute with Name = 'componentstate_Property'". Per pubblicare un agente senza il portale si può chiamare l'azione Dataverse `PvaPublish` sul bot (`POST /api/data/v9.2/bots(<botid>)/Microsoft.Dynamics.CRM.PvaPublish`, corpo `{}`), per esempio con un token di `az account get-access-token --resource <url-ambiente>`. L'esito si legge in `bot.synchronizationstatus` (`lastFinishedPublishOperation.status`).
