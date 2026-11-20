# Piano: Adopta IT e Adopta EN

Baseline esaminata: soluzione 1.0.0.17. Data: 9 novembre 2026.

## Aggiornamento nativo 1.0.0.20

Corretto il packaging delle quattro code app: `index.html` e' il primo asset,
`edition.json` resta un diagnostico di build e non viene pubblicato.
I pacchetti 1.0.0.18/19 sono superati per il difetto di avvio delle app.
Sono disponibili i quattro export nativi 1.0.0.20, verificati con manifest,
SHA-256, SDK e 24 test. Le due managed sono installate in Adopta-V3:
le quattro app mostrano l'interfaccia corretta e leggono lo stato iniziale
senza creare configurazioni o comunicazioni. Invii bloccati.
Restano il collaudo Teams, la pubblicazione live completa e la verifica di
una nuova installazione pulita senza warning. La guida di installazione
descrive il recupero dei flow senza salvare definizioni managed.

## Aggiornamento nativo 1.0.0.19

L'attesa generica del principale e' ritirata. Il Coach gestisce l'avviso
esplicito prima della ricerca con contesto sufficiente e deduplicazione sul
messaggio originario. Chiarimenti solo al Coach, riscontro implicito esplicito
al principale e attesa delle card invariata. Le modifiche IT/EN sono importate
in sviluppo e i quattro export nativi 1.0.0.19 sono in `dist`. I 23 test,
le dimensioni delle istruzioni e le definizioni esportate sono verificati.
La CLI non ha confermato la pubblicazione live di tutti gli agenti: restano
controllo in Copilot Studio e prova Teams, compreso il caso della domanda
duplicata. Gli export nativi 1.0.0.18 restano immutati.

## Stato dopo import ed export nativi

Sono disponibili sorgenti IT/EN separati, agenti monolingue, backend e binding
distinti e app condivise compilabili nelle due edizioni. La politica delle
nuove card fisse per edizione e' stata adottata.

Dopo la prima fase solo locale, l'utente ha importato entrambe le soluzioni
in **adopta-v2** e autorizzato diagnosi e pubblicazione delle personalizzazioni.
Il primo salvataggio dei flow EN e' stato completato nell'editor nativo:
la verifica Dataverse conferma tutti e cinque attivi. Il dispatcher attivo
e' stato confermato esplicitamente dall'utente; l'assistente non ha invocato flow.

Sono ora presenti in `dist` i quattro export nativi 1.0.0.18 managed/unmanaged,
con hash verificati. Le lingue primarie esportate sono 1040 per i due agenti IT
e 1033 per i due EN. Le build locali di authoring scrivono invece in `dist/local`,
senza sovrascrivere gli export. Non vengono simulati managed da sorgenti unmanaged.

Restano il riallineamento dei contesti CLI di sviluppo delle app, le verifiche
del prompt/knowledge, un nuovo import managed e il collaudo in Teams.
Vedi [guida aggiornata](README.md) per pacchetti, prove effettuate e limiti.

Il resto del documento conserva analisi e piano iniziali sulla baseline 1.0.0.17.

## 1. Decisioni confermate

- Due soluzioni distinte: una italiana e una inglese.
- Le due soluzioni devono poter convivere nello stesso ambiente Power Platform.
- Sono installazioni autonome, con dati, configurazioni e invii separati.
- Le app mantengono l'interfaccia multilingue IT/EN.
- Gli agenti sono creati nella rispettiva lingua e funzionano in una sola lingua:
  nessuna selezione, rilevazione o commutazione della lingua durante la conversazione.

**Architettura proposta: due prodotti installabili indipendentemente, un solo
repository, codice delle app condiviso, sorgenti degli agenti separati.**
Non serve una terza soluzione comune da installare.

### Risultato nel medesimo ambiente

| Componente | Adopta IT | Adopta EN |
|---|---|---|
| Agente principale | Adopta, solo italiano | Adopta EN, solo inglese |
| Adoption Coach | Solo italiano | Solo inglese |
| App Communications | Istanza IT, interfaccia IT/EN | Istanza EN, interfaccia IT/EN |
| App Admin | Istanza IT, interfaccia IT/EN | Istanza EN, interfaccia IT/EN |
| Tabelle | Le 6 attuali | 6 nuove tabelle indipendenti |
| Flow | I 5 attuali aggiornati | 5 nuovi flow indipendenti |
| Configurazione e knowledge | Proprie | Proprie |
| Ruoli | I 2 attuali | 2 nuovi ruoli |
| Distribuzione Teams | Identita' IT | Identita' EN distinta |

Con entrambe installate ci saranno quindi **4 agenti, 4 code app, 10 flow e
12 tabelle applicative**. Non quattro progetti frontend da mantenere: i progetti
rimangono Admin e Communications, ognuno pubblicato in due istanze.

Le stesse persone possono utilizzare entrambe le versioni. Non ci sara' routing
automatico per lingua, traduzione delle comunicazioni o sincronizzazione dei dati.
Le connessioni fisiche possono eventualmente usare lo stesso account di servizio,
ma i componenti connection reference delle due soluzioni devono restare distinti.
Le normali dipendenze di piattaforma e il publisher possono essere comuni.

## 2. Cosa emerge dalla soluzione attuale

| Superficie riletta | Situazione e impatto |
|---|---|
| [Manifest della soluzione](../src/Other/Solution.xml) | UniqueName `Adopta`, versione 1.0.0.17. Cambiare soltanto il nome dello ZIP non crea una soluzione indipendente. |
| [Agente principale](../src/bots/vm_Adopta/bot.xml) e [Coach](../src/bots/vm_AdoptaAdoptionCoach/bot.xml) | Entrambi hanno lingua primaria `1040`, italiano. |
| [Istruzioni del principale](../src/botcomponents/vm_Adopta.gpt.default/data) e [del Coach](../src/botcomponents/vm_AdoptaAdoptionCoach.gpt.default/data) | Scelgono la lingua dalla richiesta e dal contesto trasferito: entrambe vanno riscritte in forma monolingue. |
| [Inizializzazione profilo](../src/botcomponents/vm_Adopta.topic.InizializzazioneProfilo/data) | Calcola `Global.UserLanguage` da `preferredLanguage` e `vm_defaultlanguage`. Legge anche ruolo e branding, che vanno conservati. |
| [Topic degli agenti](../src/botcomponents/) | 45 payload complessivi, inclusi topic, azioni, istruzioni e knowledge. Il principale contiene risposte condizionate IT/EN; vari topic di sistema del Coach sono ancora soltanto italiani. |
| [Percorso della card](../src/botcomponents/vm_Adopta.topic.DimmiDiPiu/data), [ingresso chat](../src/botcomponents/vm_Adopta.topic.ApprofondisciComunicazione/data), [resolver](../src/botcomponents/vm_Adopta.topic.RisolviComunicazione/data) e [spiegazione](../src/botcomponents/vm_Adopta.topic.SpiegaComunicazione/data) | La lingua passa attraverso payload, input `Language`/`English` e `Global.CommunicationEnglish`. Non basta tradurre il prompt principale. |
| [Flow](../src/Workflows/) | La pianificazione localizza i pulsanti con `vm_language`; il delivery invia esplicitamente dal bot `vm_Adopta`; il dispatcher richiama il flow figlio tramite GUID. |
| [Configurazione Admin](../admin-app/src/data/admin.ts) | Tutto usa il primo record attivo. Due record nella stessa tabella non darebbero due installazioni indipendenti. |
| [Binding Communications](../code-app/src/data/generated.ts), [repository](../code-app/src/data/repository.ts), [binding Admin](../admin-app/src/data/admin.ts) | Servizi, nomi tabella, colonne ID, lookup e flow sono legati allo schema attuale. Occorre un binding per edizione, non solo un nome diverso nell'interfaccia. |
| [Configurazione Communications](../code-app/power.config.json) e [Admin](../admin-app/power.config.json) | Contengono appId, sorgenti dati e riferimenti ai flow. Riutilizzarle senza separazione rischia di aggiornare l'app sbagliata. |
| [Esiti Admin](../admin-app/src/components/SettingsView.tsx) e [traduzioni dei flow](../code-app/src/i18n/messages.ts) | Alcuni esiti sono classificati tramite prefissi italiani. Tradurre indiscriminatamente i flow romperebbe il contratto con le app. |
| [Build](Build-Solution.ps1) | L'overlay managed attuale aggiorna payload, parte dei metadati dei botcomponent e JSON dei flow. Non aggiorna integralmente agenti, schema, ruoli e app; verifica inoltre che i bundle delle app siano invariati. |
| [Validazione](validate-solution.mjs), [SDK locale](Test-Agent.ps1) e [test](../tests/communication-details.test.mjs) | Percorsi e schemi sono fissati su `src` e `vm_Adopta`; la validazione semantica mirata copre due topic del principale, non tutte le funzionalita' dei due agenti. |

La vecchia canvas in [canvas-src](../canvas-src/) e gli archivi storici non sono
la base delle nuove app: il rilascio attuale contiene le due code app.

### Vincolo Copilot Studio

Microsoft documenta che la lingua primaria viene scelta alla creazione e non si
puo' successivamente cambiare; si puo' cambiare soltanto la regione della stessa
lingua, dove disponibile.

Di conseguenza:

- gli agenti italiani attuali possono mantenere la loro identita';
- i due agenti inglesi vanno creati come **nuovi agenti con lingua primaria inglese**;
- modificare a mano `1040` in `1033` nel pacchetto non costituisce una procedura
  supportata di conversione.

Fonte: [Language support - Microsoft Learn](https://learn.microsoft.com/microsoft-copilot-studio/authoring-language-support).

## 3. Identita' e compatibilita'

### Proposta di nomenclatura

| Oggetto | Italiano | Inglese |
|---|---|---|
| Nome visibile soluzione | Adopta IT | Adopta EN |
| UniqueName soluzione | `Adopta`, conservato | `AdoptaEN`, nuovo |
| Schema agente principale | `vm_Adopta`, conservato | Nuovo schema, ad esempio `vm_AdoptaEN` |
| Schema Coach | `vm_AdoptaAdoptionCoach`, conservato | Nuovo schema, ad esempio `vm_AdoptaENAdoptionCoach` |
| Tabelle | Schemi esistenti | Nuovi schemi, ad esempio `vm_adoptaencommunication` |
| Flow | Identita' esistenti | Nomi e GUID nuovi, ad esempio `AdoptaENScheduleCommunication` |
| Variabili ambiente | Le 2 attuali | 2 nuove, ad esempio `vm_AdoptaENDataverseUrl` e `vm_AdoptaENCoachKnowledgeUrl` |
| Connection reference | Le 5 attuali | 5 nuove reference |
| Prompt ClassifyDepartment | Identita' attuale | Copia indipendente con nuova identita' |
| Ruoli, app e pacchetto Teams | Identita' esistenti | Identita' nuove |

Gli esempi EN vanno verificati e consolidati con gli identificatori effettivamente
creati dalla piattaforma. Non rigenerare gli ID a ogni build.

**Per l'italiano non rinominare gli schemi per aggiungere IT:** preservare gli
identificatori consente di aggiornare le installazioni esistenti, mantenendo dati,
associazioni e storico. La denominazione commerciale puo' diventare Adopta IT
senza cambiare il UniqueName tecnico.

Per EN serve una separazione completa anche di relazioni, chiavi alternative,
viste, form, privilegi, riferimenti ai prompt e asset di dipendenza. Attributi
locali alle tabelle possono conservare gli stessi nomi quando consentito:
non serve rinominare ogni `vm_title`; serve evitare identita' condivise tra i
componenti applicativi delle due soluzioni.

## 4. Contratto linguistico

### Agenti

- Principale IT e Coach IT: istruzioni, topic e risposte esclusivamente italiani.
- Principale EN e Coach EN: istruzioni, topic e risposte esclusivamente inglesi.
- Nessuna lingua secondaria configurata; nessun selettore o topic di cambio lingua.
- La lingua del profilo, del browser, della domanda o della fonte non cambia
  la lingua della risposta.
- Anche una richiesta esplicita di cambiare lingua riceve una risposta nella
  lingua fissa dell'agente.
- Rimuovere `Global.UserLanguage`, `Global.CommunicationEnglish`, gli input
  linguistici e i relativi rami, non limitarli a un valore costante.
- La delega principale-Coach conserva domanda e contesto, ma non negozia la lingua.
- Titoli originali delle fonti, nomi di prodotto, codice, citazioni e testo delle
  comunicazioni rimangono dati: non vanno tradotti automaticamente.

La separazione dei sorgenti degli agenti non deve diventare un motore di
localizzazione a runtime. Le correzioni funzionali comuni vanno applicate a
entrambe le famiglie e verificate con gli stessi scenari.

### App e card: proposta operativa

**Mantenere libera la lingua dell'interfaccia, fissare quella delle nuove card
all'edizione installata.**

Esempi:

- Communications IT aperta in inglese continua a inviare card con pulsanti italiani.
- Communications EN aperta in italiano continua a inviare card con pulsanti inglesi.
- Cambiare lingua nell'app non cambia bot, archivio, destinatari o configurazione.

Questa politica sulle card e' adottata nell'implementazione locale:
evita di promettere risposte inglesi da un agente italiano o viceversa.

Con questa politica:

- sostituire il selettore "Lingua della card" con l'indicazione della lingua fissa;
- scrivere `vm_language` coerentemente con l'edizione per i nuovi record;
- conservare la colonna e i valori storici, senza cancellazioni di schema;
- conservare `vm_defaultlanguage` soltanto come preferenza/fallback delle app,
  aggiornando etichette, descrizioni e documentazione;
- non usare queste colonne per scegliere la lingua degli agenti o dei nuovi pulsanti;
- in assenza di preferenze, usare come ultimo fallback delle app la loro edizione,
  evitando che l'istanza EN ricada sull'italiano per una costante tecnica.

Il testo libero delle comunicazioni resta responsabilita' di chi compone:
nessuna traduzione automatica del contenuto.

## 5. Piano di esecuzione

### Fase 0 - Baseline e inventario delle identita'

1. Conservare i pacchetti 1.0.0.17 e i relativi hash come baseline storica.
2. Registrare la mappa completa dei componenti IT e dei nuovi componenti EN,
   distinguendo identita' di authoring, importazione e pubblicazione Teams.
3. Confermare la politica delle card descritta sopra e il locale inglese di creazione.
4. Definire profili di build IT/EN con valori vincolati, non un'impostazione utente.
5. Preparare un ambiente di sviluppo/collaudo; nessuna modifica diretta ai
   componenti managed dei clienti.

**Uscita:** inventario e contratti fissati, senza cambiamenti ai dati esistenti.

### Fase 1 - Creare la base EN e provare subito la coesistenza

1. Creare la soluzione EN nello sviluppo con i due nuovi agenti, entrambi inglesi.
2. Creare le sei tabelle EN e i componenti dipendenti con nuove identita'.
3. Creare ruoli, variabili, reference e prompt EN indipendenti.
4. Esportare/unpack tramite gli strumenti supportati per acquisire metadati reali.
5. Provare un'importazione preliminare affiancata alla soluzione IT.

Non clonare lo ZIP cambiando soltanto nome e lingua: i componenti condividerebbero
identita' e livelli di soluzione, invece di costituire due installazioni autonome.

**Uscita:** base EN realmente distinta; nessun aggiornamento o riuso accidentale
dei componenti IT.

### Fase 2 - Rendere monolingue le due coppie di agenti

1. Separare i sorgenti completi IT ed EN, compresi XML, configurazioni e dipendenze.
2. Riscrivere istruzioni principali, Coach, descrizioni dei tool e istruzioni
   dei nodi generativi nella rispettiva lingua.
3. Localizzare tutti i topic: saluti, fallback, errori, autenticazione, escalation,
   reset, CSAT, conferme, attese, disambiguazione e avvio conversazione.
4. Localizzare trigger, conversation starter, testo/speak, scelte delle entita',
   messaggi delle card e suggerimenti della piattaforma configurabili.
5. Eliminare propagazione e selezione della lingua nei quattro topic della
   pipeline comunicazioni e nei topic di servizio.
6. Mantenere inizializzazione del ruolo e branding; smettere di usare
   `preferredLanguage` per il comportamento dell'agente.
7. Eliminare il messaggio visibile di debug del ruolo dall'inizializzazione:
   non fa parte delle risposte di produzione. Le categorie tecniche del prompt
   possono restare codici interni comuni, senza essere localizzate come identificatori.
8. Collegare principale IT soltanto al Coach IT e principale EN soltanto al Coach EN,
   aggiornando anche `dependencies.json` e gli asset di associazione.
9. Collegare la knowledge di ciascun Coach alla propria variabile. Predisporre
   contenuti editoriali IT/EN e verificarne accesso e pertinenza; non aggiungere
   filtri linguistici dinamici nell'agente.

Preservare la pipeline autenticata e la singola risposta finale. Non cambiare
modello, regole sulle fonti, limiti o funzionalita' non richieste.

**Uscita:** due coppie monolingue complete, non due prompt tradotti sopra topic misti.

### Fase 3 - Separare tutti i flussi e le letture dati

Per ciascuno dei cinque flow EN:

- usare soltanto tabelle, impostazioni, reference e variabili EN;
- aggiornare trigger, nomi entity set, lookup, bind OData, FetchXML e ID;
- aggiornare il GUID del delivery figlio richiamato dal dispatcher EN;
- impostare il bot EN nell'azione Teams `body/bot`;
- usare impostazioni, gruppi e flag invii soltanto della propria installazione.

Nei tool degli agenti aggiornare sia query sia schemi di output dichiarati,
inclusi ID di consegna e alias. Non affidarsi soltanto a dati simulati nei test.

Per le nuove card usare pulsanti fissi per edizione. Il formato versionato attuale
puo' restare: il token IT/EN viene scritto come costante dell'edizione e non
seleziona la lingua della risposta. Non e' necessario introdurre un nuovo
protocollo solo per questa separazione.

Conservare claim, chiavi di deduplicazione, controllo proprietario, gestione
degli esiti incerti e assenza di retry automatico sugli invii. La deduplicazione
resta interna alla singola installazione, non tra prodotti diversi.

**Uscita:** nessun flow o tool EN legge o scrive componenti applicativi IT, e viceversa.

### Fase 4 - Un solo codice per app, due binding e due pubblicazioni

1. Conservare i due progetti frontend e i dizionari IT/EN esistenti.
2. Introdurre profili di build distinti per binding, configurazioni Power Apps,
   servizi generati, identificatori dei flow e appId.
3. Riutilizzare i data layer esistenti come punto di adattamento: mappare ID e
   nomi differenti con binding tipizzati, senza sostituzioni di stringhe sparse
   nei componenti React e senza duplicare l'intera interfaccia.
4. Adeguare anche il data layer Admin, che oggi importa direttamente i servizi
   generati e non usa il resolver di Communications.
5. Separare i contesti di setup/push: gli script attuali non inizializzano una
   nuova app se trovano gia' la configurazione precedente.
6. Applicare la politica concordata su lingua card e fallback delle app.
7. Mostrare chiaramente l'edizione nelle due istanze, indipendentemente dalla
   lingua dell'interfaccia e dal branding personalizzabile.
8. Preservare il contratto degli esiti dei flow. Se vengono tradotti i testi
   memorizzati da EN, aggiornare contestualmente classificazione Admin e
   traduzioni di Communications, normalizzando l'esito nel data layer:
   un successo inglese non deve essere interpretato come errore perche' manca
   il prefisso italiano.

Il profilo e' scelto prima di compilare/pubblicare: nessun selettore nell'app
deve permettere di passare dall'archivio IT a quello EN.
I servizi mancanti o i binding incoerenti devono produrre un errore esplicito,
mai un ripiego automatico sui servizi IT.

**Uscita:** quattro istanze pubblicate da due basi di codice, ognuna vincolata
al proprio backend. Build e type-check riusciti per tutte e quattro.

### Fase 5 - Rifare il packaging per due linee di rilascio

Struttura suggerita, da mantenere semplice:

- conservare `src` per l'italiano, evitando una riorganizzazione non necessaria;
- aggiungere una radice completa dei sorgenti EN, ad esempio `src-en`;
- mantenere condivisi i progetti delle app, con contesti di generazione e build separati;
- separare settings di deploy, baseline managed e output di rilascio per edizione.

Estendere gli strumenti di build e validazione con un profilo IT/EN che definisca
radice sorgenti, UniqueName, agenti, componenti semantici, bundle e baseline attesi.

**Prima baseline EN:** deve provenire da authoring ed export managed della nuova
soluzione in sviluppo. L'attuale baseline managed IT non e' una baseline EN.

**Prima release IT separata:** acquisire una baseline managed che includa davvero
modifiche ai bot, alle app e ai metadati; non riutilizzare senza estensioni
l'overlay limitato attuale.

La build dovra' verificare:

- payload e metadati degli agenti, comprese lingua primaria e associazioni;
- tutte le coppie JSON/XML dei flow, non soltanto il flow di pianificazione;
- schema, ruoli, asset e dipendenze della rispettiva edizione;
- bundle delle app ricompilati e collegati agli appId corretti;
- versione, flag managed/unmanaged, round-trip e hash;
- assenza di valori d'ambiente esportati e di dipendenze applicative dall'altra soluzione.

Produrre due managed installabili, i corrispondenti unmanaged di sviluppo e hash
separati. Il nome file puo' esplicitare IT anche se il UniqueName legacy resta
`Adopta`. Conservare stabili gli identificatori e aggiornare ogni soluzione sulla
propria linea di versione.

**Uscita:** entrambi i pacchetti si installano da soli, senza l'altra soluzione.

### Fase 6 - Migrazione, installazione e documentazione

#### Installazioni italiane esistenti

1. Fare backup e sospendere i nuovi invii durante il passaggio controllato.
2. Aggiornare in place la soluzione `Adopta`, senza ricreare tabelle o agenti.
3. Conservare configurazione, gruppi, storico e card gia' pianificate/inviate.
4. Mantenere il riconoscimento dei vecchi pulsanti IT e EN come compatibilita'
   del formato di input, non come selezione della lingua della risposta.
5. Segnalare il cambiamento: le vecchie card inglesi continuano a identificare
   la comunicazione, ma l'agente IT risponde ora in italiano.
6. Per eventuali card inglesi ancora pianificate decidere esplicitamente se
   mantenerle o annullare/ripianificare; non rigenerarle e non reinviarle automaticamente.
7. Pubblicare prima il Coach IT e poi il principale IT.

#### Installazione inglese

- Installazione nuova, anche accanto a IT: nessuna migrazione automatica dei dati.
- Configurazione, knowledge, destinatari e invii EN partono indipendenti.
- Se in futuro serviranno copie di dati, pianificare una migrazione dedicata
  con mappatura delle relazioni; mai copiare uno stato Scheduled attivando invii
  involontari o trasformare lo storico in nuovi messaggi.
- Pubblicare prima il Coach EN e poi il principale EN.

#### Teams, permessi e operativita'

- App Teams e bot distinti; preservare l'identita' esistente IT quando possibile.
- Approvare e distribuire EN separatamente, con un nome riconoscibile.
- Verificare che un destinatario abbia installato il bot corretto:
  avere IT non equivale ad avere EN.
- Assegnare e condividere separatamente ruoli e app delle due edizioni.
- Lo stesso gruppo Entra puo' essere registrato in entrambe, intenzionalmente:
  in questo caso potra' ricevere comunicazioni da entrambi i bot.
- Documentare che il blocco invii vale solo per la propria installazione e non
  interrompe le run gia' avviate.

Le tabelle separate non sono un confine assoluto di sicurezza: amministratori
e account con privilegi estesi nell'ambiente possono accedere a entrambe.
Verificare i permessi reali, non soltanto l'assenza di pulsanti nell'interfaccia.

Aggiornare le [istruzioni di rilascio](README.md), la [guida installazione](INSTALL.md),
i [dettagli Communications](../code-app/README.md) e i
[dettagli Admin](../admin-app/README.md), con procedure distinte IT/EN,
checklist di coesistenza e note di migrazione.

Per il recupero da problemi: backup, blocco dei nuovi invii dell'edizione coinvolta
e piano di ripristino/correzione. Non assumere che un pacchetto managed precedente
possa essere reimportato come downgrade, e non disinstallare soluzioni contenenti
dati di produzione come procedura di rollback.

## 6. Verifiche e criteri di accettazione

### Baseline verificata durante questa rilettura

Comando eseguito dalla radice:

```powershell
node --test tests\communication-details.test.mjs
```

Risultato: **8 test superati, 0 falliti**. Il test negativo riproduce 22 diagnostici
del vecchio resolver e uno della vecchia card; i due topic corretti non producono
quei diagnostici.

Questo verifica la baseline locale, non import, pubblicazione, authoring completo,
connettori o funzionamento Teams. Non sono state eseguite operazioni sull'ambiente.

### Matrice per il nuovo rilascio

| Ambito | Criterio verificabile |
|---|---|
| Agenti monolingue | Per ciascuno dei 4 agenti verificare domanda IT, EN, mista, profilo opposto e richiesta esplicita di cambio lingua: la risposta resta nella lingua dell'agente. |
| Assenza gestione multilingua | Nei sorgenti degli agenti non rimangono variabili/input di scelta lingua, rami IT/EN o lingue secondarie. Il parser legacy puo' riconoscere vecchi payload senza influenzare la risposta. |
| Authoring | Parametrizzare i test per radice e schemi; verificare principale e Coach di entrambe le edizioni. Nessun errore di authoring nei componenti modificati; controllare anche il designer della piattaforma. |
| Regressioni comunicazioni | Conservare query autenticata, escaping XML, selezione per ID/titolo/ultimo invio, conferma quando necessaria e paginazione oltre 10 risultati. |
| Spiegazione e Coach | Una sola risposta finale; fonti realmente recuperate; limiti espliciti quando mancano; follow-up sulla stessa comunicazione e delega soltanto al Coach corretto. |
| Isolamento dei dati | Con titoli uguali e utenti destinatari comuni, IT non recupera comunicazioni EN e viceversa. Provare anche un ID valido dell'altra edizione e un account non destinatario. |
| Impostazioni | Cambiare logo, knowledge o blocco invii in IT non modifica EN, e viceversa. Verificare separatamente errori e avvisi di ripubblicazione. |
| App | Compilare e type-checkare Admin e Communications per IT ed EN. In ogni istanza cambiare lingua UI e verificare che backend e bot rimangano invariati. |
| Card | Verificare anteprima, payload e rendering Teams nella lingua fissa dell'edizione, anche con UI opposta; verificare link assente/non HTTPS e soglia dimensione della card esistente. |
| Compatibilita' | Le card IT e EN legacy della vecchia installazione identificano ancora il messaggio corretto, ma ricevono risposta nella lingua fissa IT. |
| Invii | Due dispatcher attivi lavorano soltanto sul proprio archivio. Verificare claim, annullamento, invio incerto e nessun reinvio automatico; duplicati non introdotti dentro la stessa installazione. |
| Installazione bot | Un utente con solo IT installato non viene considerato abilitato a ricevere EN; verificare l'esito NotInstalled dell'edizione corretta. |
| Pacchetti | Installare IT da sola, EN da sola, IT poi EN ed EN poi IT. Nessuna dipendenza applicativa incrociata o sovrascrittura di componenti. |
| Ciclo di vita | Aggiornare una soluzione senza modificare l'altra. In un ambiente usa-e-getta verificare anche la rimozione di una senza danni all'altra; la rimozione puo' cancellare i dati della soluzione rimossa. |
| Ruoli | Utenti con soli ruoli IT non ottengono privilegi EN per errore, e viceversa; gli utenti autorizzati a entrambe usano entrambe esplicitamente. |

Le verifiche statiche devono leggere gli artefatti realmente impacchettati.
I test locali non sostituiscono le prove affiancate nell'ambiente e in Teams.

## 7. Ordine e dipendenze

| Fase | Dipende da | Risultato |
|---|---|---|
| 0. Baseline e contratti | Nessuna | Inventario e politica linguistica definiti |
| 1. Base EN e coesistenza | 0 | Identita' indipendenti provate sulla piattaforma |
| 2. Agenti monolingue | 1 | Quattro agenti coerenti |
| 3. Flow e accesso dati | 1 | Due backend senza riferimenti incrociati |
| 4. Profili delle app | 1 e 3 | Due app sorgenti, quattro istanze |
| 5. Packaging | 2, 3 e 4 | Due linee di pacchetti complete |
| 6. Migrazione e rilascio | 5 e matrice di collaudo superata | Coesistenza verificata e guide aggiornate |

Le fasi 2 e 3 possono avanzare indipendentemente dopo la creazione delle identita'.
Il primo obiettivo tecnico e' una piccola installazione EN affiancata a IT,
non la traduzione massiva: dimostra subito che lingua primaria, identita',
binding e distribuzione possono convivere.

**Definizione di completamento:** due soluzioni installabili e aggiornabili
indipendentemente, quattro agenti realmente monolingue, app ancora IT/EN,
nessuna interferenza tra configurazioni/dati/invii e compatibilita' italiana
verificata sulla baseline esistente.
