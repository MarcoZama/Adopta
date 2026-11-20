# Installare Adopta IT / EN

> Guida corrente in inglese per la 1.0.0.20:
> [Installation README](../installation/README.md).
> Questo documento conserva anche le istruzioni storiche della baseline 1.0.0.17;
> per una nuova installazione seguire la guida corrente.

## Aggiornamento nativo 1.0.0.20

Importare i pacchetti **1.0.0.20** della rispettiva edizione, senza disinstallare
la soluzione o cancellare dati. Le 1.0.0.18/19 hanno un errore di packaging:
il player puo' mostrare `edition.json` anziche' l'app. La 1.0.0.20 ripristina
`index.html` come primo asset ed esclude quel diagnostico dal pacchetto.
Chiudere e riaprire il player dopo l'aggiornamento.

Le due managed sono installate in Adopta-V3; avvio e lettura iniziale delle
quattro app sono verificati. Le Admin non hanno configurazione e gli invii
rimangono bloccati. Non sono stati collaudati salvataggi o consegne Teams.
Il figlio e il dispatcher IT che avevano causato il warning sono stati attivati
con successo dall'elenco nativo, nell'ordine figlio-parent, senza salvare
definizioni e senza creare livelli unmanaged.

### Modifiche agli agenti introdotte nella 1.0.0.19

La modifica dell'attesa e dei chiarimenti del Coach e' disponibile nei sorgenti,
nelle build locali e negli export nativi managed/unmanaged 1.0.0.20.
E' stata importata in sviluppo e le personalizzazioni Dataverse sono pubblicate.
La CLI non ha confermato la pubblicazione di tutti gli agenti: controllarla
in Copilot Studio, nell'ordine Coach-principale per entrambe le edizioni.

Dopo l'import di sviluppo e la pubblicazione Coach-principale verificare:

- richiesta di caso d'uso con ruolo mancante: una sola domanda del Coach,
  nessun avviso di attesa e nessuna copia della domanda dal principale;
- risposta al chiarimento: ripresa della richiesta originale con il ruolo fornito;
- contesto completo e ricerca: al massimo un avviso del Coach per messaggio;
- saluti o risposte immediate: nessun avviso;
- card comunicazioni: attesa e pipeline esistenti invariate;
- stesse verifiche in inglese e controllo dei messaggi nell'activity map.

Il topic di attesa del principale e' ritirato ma mantiene la propria identita'
per gli aggiornamenti. Restano da verificare pubblicazione live completa
e regressione Teams.

## Installazione dei pacchetti nativi

Usare gli [export nativi managed/unmanaged](README.md) della rispettiva edizione.
I quattro pacchetti IT/EN managed e unmanaged 1.0.0.20 sono scaricabili dalla
[release dedicata](https://github.com/MarcoZama/Adopta/releases/tag/v1.0.0.20).
Pacchetti, hash e manifest in `dist` sono artefatti locali esclusi da Git:
un clone del repository non li contiene. Procurarsi separatamente gli export
nativi verificati; gli ZIP in `dist/local` sono invece bozze locali di authoring.

1. Preparare un ambiente di destinazione con Dataverse, Copilot Studio,
   connessioni e code app abilitate, con i prerequisiti descritti sotto.
2. Importare il managed IT, EN o entrambi, selezionando le cinque connessioni
   della relativa soluzione. **Non importare managed sopra l'omonima unmanaged
   usata in sviluppo.** Non eliminare soluzioni contenenti dati per cambiare tipo.
3. Verificare le sei tabelle di ciascuna edizione e pubblicare le personalizzazioni.
   Se un flow fallisce sui metadati, controllare che le tabelle esistano prima
   di modificare i componenti o sostituire ID. Un GUID citato da
   `GetMetadataForGetEntity` puo' essere l'ID metadata generato nel target,
   non un riferimento da sostituire nello ZIP. Se presente ma non ancora risolto
   dal connettore, pubblicare e reimportare lo stesso managed con le connessioni
   corrette, mantenendo gli invii bloccati.
4. Per ogni edizione verificare nell'ordine DeliverCommunication, ApplySettings,
   ManageCommunication e ScheduleCommunication. Usare **Attiva / Turn on**
   nell'elenco della soluzione e verificare il successo effettivo, non soltanto
   l'esito dell'import. Il figlio DeliverCommunication deve essere attivo prima
   del parent DispatchScheduled, altrimenti si ottiene `ChildFlowNeverPublished`.
   **Non salvare la definizione di un flow managed nell'editor:** creerebbe un
   livello unmanaged. Se l'attivazione continua a fallire, conservare il log e
   interrompere il collaudo; non dichiarare l'installazione pronta. Verificare
   anche `Personalizzato / Customized: No`. Lasciare DispatchScheduled spento
   fino al collaudo.
5. Configurare separatamente impostazioni, knowledge e gruppi nelle due app Admin,
   mantenendo il flag Invii bloccato. Pubblicare prima il Coach e poi il principale
   di ciascuna edizione, e distribuire le due app Teams corrette.
6. Collaudare app, autorizzazioni, card, selezione delle comunicazioni e conversazioni.
   Il selettore IT/EN riguarda solo l'interfaccia: agenti e nuove card rimangono
   nella lingua fissa dell'edizione. Le vecchie card conservano il payload,
   ma la risposta segue sempre la lingua fissa dell'agente.
7. Abilitare dispatcher e flag Invii solo quando si vuole avviare la consegna.
   Le run gia' avviate non vengono richiamate disabilitando il flag.

L'aggiornamento managed e l'avvio delle quattro app sono verificati in Adopta-V3.
Questo non dimostra l'assenza dei warning su una nuova installazione pulita:
verificare sempre metadati, connessioni e attivazione figlio-parent.
Le prove end-to-end in Teams restano da collaudare.

## Guida storica della baseline 1.0.0.17

Questa guida installa la soluzione **managed** *Adopta Agents and App* in un ambiente Power Platform, dalla preparazione fino al primo invio di prova. Si fa tutto dai portali web (Power Platform admin center, Power Apps, Power Automate, Copilot Studio, Teams admin center), senza strumenti da riga di comando.

Il pacchetto contiene:

| Componente | Nome |
|---|---|
| Agenti Copilot Studio | *Adopta* (agente principale) e *Adopta - Adoption Coach* |
| Code app | *Adopta Communications (code app)*: chi comunica compone, pianifica e controlla gli invii<br>*Adopta Admin (code app)*: l'amministratore configura nomi, logo, lingua, knowledge e gruppi destinatari |
| Flow | *AdoptaScheduleCommunication*, *AdoptaManageCommunication*, *AdoptaDispatchScheduled*, *AdoptaDeliverCommunication*, *AdoptaApplySettings* |
| Tabelle | *Adopta Setting*, *Adopta Communication*, *Adopta Communication Group*, *Adopta Audience Group*, *Adopta Delivery*, *Adopta Dispatch Claim* |
| Ruoli di sicurezza | *Adopta Administrator*, *Adopta Communications Manager* |
| Altro | prompt *ClassifyDepartment*, variabili d'ambiente `vm_AdoptaDataverseUrl` e `vm_AdoptaCoachKnowledgeUrl`, 5 connection reference |

Serve solo il pacchetto `Adopta_1_0_0_17_managed.zip` (nel repository in `dist/`).

> **Stato della 1.0.0.17:** corregge i 22 errori di authoring di *Resolve communication* e quello di *Explain verified communication* della 1.0.0.16, riprodotti con il validatore semantico Microsoft locale e assenti sui sorgenti corretti. I pacchetti sono ricostruiti localmente senza accesso all'ambiente. Import, pubblicazione e comportamento in Teams non sono stati verificati da questa build. Eseguire i test del passo 11 in un ambiente di prova prima della produzione.

> **Non modificare i componenti.** La soluzione è managed: se si apre e si salva un'app, un flow o un agente in Power Apps, Power Automate o Copilot Studio, si crea un livello unmanaged e gli aggiornamenti futuri non avranno più effetto su quel componente. Tutto ciò che il cliente personalizza si imposta in *Adopta Admin (code app)*. Pubblicare gli agenti in Copilot Studio invece è previsto e non crea livelli.

---

## Passo 0. Chi deve partecipare

| Ruolo | Serve per |
|---|---|
| **System Administrator** dell'ambiente | Import, ruoli, condivisione delle app, pubblicazione degli agenti |
| **Power Platform administrator** (o admin dell'ambiente nel Power Platform admin center) | Abilitare le code app nell'ambiente |
| **Teams administrator** | Approvare l'app dell'agente e distribuirla agli utenti |
| Chi gestisce **Microsoft Entra ID** | Gruppi destinatari e, se si usano, gruppi per i ruoli |

---

## Passo 1. Preparare l'ambiente

1. Scegli o crea un ambiente con **Dataverse**. Per la produzione usa un ambiente di tipo *Production*.
2. Verifica che l'ambiente abbia capacità per **Copilot Studio** e per i prompt **AI Builder**, cioè crediti Copilot o AI Builder: il prompt *ClassifyDepartment* gira a ogni nuova conversazione.
3. Abilita le **code app**: Power Platform admin center → *Ambienti* → l'ambiente → *Impostazioni* → *Prodotto* → *Funzionalità* → **Power Apps code apps** = attivo → *Salva*.
4. Licenze:
   - chi usa le due code app: **Power Apps Premium** (le app usano Dataverse);
   - chi chatta con l'agente in Teams non ha bisogno di licenze Power Apps né di ruoli Dataverse.

---

## Passo 2. Account di servizio e gruppi

1. **Account di servizio**: un utente dedicato (per esempio `svc-adopta@contoso.com`) con licenza Microsoft 365 che includa Teams. È il proprietario delle connessioni dei flow e dell'agente.
   - Aggiungilo all'ambiente con il ruolo **System Customizer** (oppure System Administrator): il flow *AdoptaApplySettings* scrive le variabili d'ambiente.
   - Deve poter leggere i membri dei gruppi Entra destinatari.
2. **Gruppi destinatari**: individua i gruppi Microsoft Entra (di sicurezza o Microsoft 365) che riceveranno le comunicazioni e annota il loro **Object ID** (Entra admin center → *Gruppi* → gruppo → *Panoramica*).
3. **Gruppi per i ruoli** (consigliato): crea due gruppi di sicurezza, per esempio *Adopta - Amministratori* e *Adopta - Comunicazione*. Al passo 7 li userai per assegnare i ruoli e condividere le app.

---

## Passo 3. Creare le connessioni

Con l'account di servizio, in Power Automate (selezionando l'ambiente giusto) → *Connessioni* → **Nuova connessione**, crea:

| Connettore | Usata da (connection reference) |
|---|---|
| **Microsoft Dataverse** | `vm_adoptadataverse` (flow) e `vm_Adopta.shared_commondataserviceforapps…` (agente). Può essere la stessa connessione |
| **Office 365 Groups** | `vm_adoptaoffice365groups`: legge i membri dei gruppi destinatari |
| **Microsoft Teams** | `vm_adoptateams`: invia la card dall'agente |
| **Office 365 Users** | `vm_Adopta.shared_office365users…`: legge reparto e lingua del profilo dell'utente |

---

## Passo 4. Importare la soluzione

1. Apri [make.powerapps.com](https://make.powerapps.com) e seleziona l'ambiente in alto a destra.
2. *Soluzioni* → **Importa soluzione** → *Sfoglia* → `Adopta_1_0_0_17_managed.zip` → *Avanti*.
3. **Connessioni**: per ogni connection reference scegli la connessione creata al passo 3.
4. **Variabili d'ambiente**:
   - `Adopta - Dataverse environment URL`: l'URL dell'ambiente **senza slash finale**, per esempio `https://contoso.crm4.dynamics.com`. È in Power Platform admin center → ambiente → *URL ambiente*. Compilarla adesso fa funzionare l'agente da subito.
   - `Adopta - Coach SharePoint knowledge URL`: lasciala vuota, si imposta al passo 8.
5. **Importa** e attendi la fine, di solito qualche minuto. Lo stato è visibile nella barra in alto e in *Soluzioni* → *Cronologia*.
6. Al termine la soluzione **Adopta Agents and App** compare nell'elenco, con l'etichetta *Gestita*.

---

## Passo 5. Verificare i flow

1. make.powerapps.com → *Soluzioni* → **Adopta Agents and App** → *Flussi cloud*.
2. Tutti e cinque i flow devono essere **Attivati**.
3. Se qualcuno è spento, accendili in quest'ordine:
   1. *AdoptaDeliverCommunication* (è il flow figlio: va acceso per primo);
   2. *AdoptaDispatchScheduled*;
   3. *AdoptaScheduleCommunication*;
   4. *AdoptaManageCommunication*;
   5. *AdoptaApplySettings*.

   L'errore `ChildFlowNeverPublished` su *AdoptaDispatchScheduled* significa solo che *AdoptaDeliverCommunication* è ancora spento.

---

## Passo 6. Pubblicare gli agenti

L'import prova a pubblicare gli agenti da solo. Pubblicali comunque, nell'ordine indicato, per essere sicuri che leggano le variabili d'ambiente.

1. Apri [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com) sull'ambiente.
2. Apri **Adopta - Adoption Coach** → **Pubblica**. Attendi la conferma.
3. Apri **Adopta** → **Pubblica**.
4. Controllo: in *Adopta* → *Strumenti* → **Get My Recent Communications**, l'input *Environment* deve mostrare la variabile `vm_AdoptaDataverseUrl`. Guarda soltanto, senza salvare.

---

## Passo 7. Ruoli e condivisione delle app

Le code app non si associano ai ruoli di sicurezza: servono **entrambe** le cose, cioè il ruolo in Dataverse e la condivisione dell'app.

| Profilo | Ruoli Dataverse | App da condividere |
|---|---|---|
| Amministratore di Adopta | *Basic User* + **Adopta Administrator** (+ *Adopta Communications Manager* se compone anche comunicazioni) | *Adopta Admin (code app)* (e *Adopta Communications (code app)* se compone) |
| Chi compone e invia le comunicazioni | *Basic User* + **Adopta Communications Manager** | *Adopta Communications (code app)* |
| Utenti che ricevono le comunicazioni | nessuno | nessuna: usano l'agente in Teams |

### 7.1 Assegnare i ruoli

**Con i gruppi Entra (consigliato).** Chi entra o esce dal gruppo ottiene o perde i ruoli da solo. Per ognuno dei due gruppi del passo 2:

1. Power Platform admin center → *Ambienti* → l'ambiente → *Impostazioni* → *Utenti e autorizzazioni* → **Team**.
2. **Crea team** e compila:
   - *Nome del team*: per esempio *Adopta - Comunicazione*;
   - *Business unit*: quella principale dell'ambiente;
   - *Tipo di team*: **Gruppo di sicurezza Microsoft Entra ID** (o *Gruppo di Office* per un gruppo Microsoft 365);
   - *Nome gruppo*: cerca e scegli il gruppo Entra;
   - *Tipo di appartenenza*: **Membri e guest**.
3. *Avanti* → seleziona i ruoli del profilo, cioè la colonna *Ruoli Dataverse* della tabella sopra → *Salva*.

I ruoli di un team si cambiano da *Team* → team → **Gestisci ruoli di sicurezza**.

**Per singoli utenti.** Power Platform admin center → ambiente → *Impostazioni* → *Utenti e autorizzazioni* → *Utenti* → utente → **Gestisci ruoli di sicurezza**. Se l'utente non è nell'elenco, aggiungilo prima con **Aggiungi utente**.

### 7.2 Condividere le code app

1. make.powerapps.com → *App* → **Adopta Communications (code app)** → **…** → **Condividi**.
2. Aggiungi il gruppo (o gli utenti) di chi compone le comunicazioni → *Condividi*.
3. Ripeti per **Adopta Admin (code app)** con il gruppo degli amministratori.

Al primo avvio ogni utente vede la richiesta di consenso alla connessione Dataverse: deve accettarla, perché i flow di pianificazione e gestione agiscono con la sua identità.

---

## Passo 8. Configurare Adopta

Con un utente amministratore apri **Adopta Admin (code app)** → scheda **Impostazioni**.

1. Compila:
   - **Titolo dell'app**: il nome che vedono gli utenti di *Adopta Communications*;
   - **Nome dell'agente**: il nome con cui l'agente si presenta nella conversazione;
   - **Nome della configurazione**: solo un'etichetta;
   - **Lingua predefinita** (*Italiano* o *English*): lingua iniziale delle nuove comunicazioni e delle app, e lingua dei messaggi fissi dell'agente per gli utenti il cui profilo non è né in italiano né in inglese;
   - **URL della libreria SharePoint** (*Knowledge dell'Adoption Coach*): la cartella o libreria con i materiali del Coach, per esempio `https://contoso.sharepoint.com/sites/Adopta/Shared%20Documents/Libreria`. Tutti gli utenti dell'agente devono poterla leggere;
   - **Invii in Teams**: lascialo **bloccato** fino alla fine dei test.
2. **Crea configurazione** (o **Salva**). L'app attende circa 40 secondi l'esito del flow *AdoptaApplySettings* e lo mostra in **Applicazione all'ambiente**.
3. L'esito deve iniziare con "Configurazione applicata". Se dice anche "Variabili aggiornate", **ripubblica gli agenti** come al passo 6, prima il Coach e poi Adopta: leggono le variabili solo quando vengono pubblicati.
4. **Logo** (facoltativo): in *Nomi e logo* → **Carica immagine**, un PNG o JPG quadrato. Si salva subito.

> Esiste un solo record di configurazione: app, agente e flow usano il primo attivo. Se l'app segnala più configurazioni attive, disattiva quelle in più.

---

## Passo 9. Gruppi destinatari

In **Adopta Admin (code app)** → scheda **Gruppi destinatari** → **Nuovo gruppo**, per ogni gruppo del passo 2:

- **Nome**: quello che vede chi compone;
- **ID gruppo Entra**: l'Object ID;
- **Tipo**: *Sicurezza* o *Microsoft 365*;
- **Attivo**: acceso.

Chi compone può scegliere solo i gruppi attivi. Per non usare più un gruppo, disattivalo invece di eliminarlo.

---

## Passo 10. Pubblicare l'agente in Teams e Microsoft 365 Copilot

1. In Copilot Studio apri **Adopta** → *Canali* → **Teams e Microsoft 365 Copilot**. I canali sono già attivi nel pacchetto: non modificare i dettagli dell'app.
2. *Opzioni di disponibilità* → **Mostra a tutti nell'organizzazione** → invia per l'approvazione.
3. Il **Teams administrator** approva l'app in Teams admin center → *App Teams* → *Gestisci app*.
4. **Installa l'app per i destinatari (importante).** Teams consegna le comunicazioni solo a chi ha l'agente installato. Teams admin center → *App Teams* → **Criteri di configurazione** → modifica il criterio globale (o creane uno per i gruppi destinatari) → *App installate* → **Aggiungi app** → l'agente. La distribuzione può richiedere fino a 24 ore.

   Gli utenti che non hanno ancora l'agente compaiono nello storico di *Adopta Communications* con l'esito **Agente non installato**.

In Teams e Microsoft 365 Copilot l'app si chiama *Adopta* e ha l'icona standard di Copilot Studio. Le card delle comunicazioni arrivano con questo nome e questa icona. Il nome con cui l'agente si presenta nella conversazione è invece il *Nome dell'agente* del passo 8.

---

## Passo 11. Test

Usa un gruppo destinatari ristretto, con almeno un utente di prova che **non** ha ancora l'app installata.

- [ ] In Teams, chat con l'agente: "Qual è l'ultima comunicazione che ho ricevuto?". Subito dopo l'invio compare per qualche secondo l'indicatore "sta scrivendo" e arriva "Un attimo, sto preparando la risposta…". Poi l'agente risponde, presentandosi con il *Nome dell'agente*.
- [ ] Con un messaggio breve, per esempio "grazie", il messaggio di attesa non compare.
- [ ] In *Adopta Communications (code app)* il titolo e il logo sono quelli configurati, e il selettore **IT / EN** cambia la lingua dell'interfaccia.
- [ ] Abilita temporaneamente gli invii, con l'interruttore *Invii in Teams* nella barra laterale o in *Adopta Admin*.
- [ ] Crea una comunicazione con **Lingua della card = Italiano**, un link `https://` e data tra qualche minuto, poi **Salva bozza** → **Pianifica invio**.
- [ ] Alla scadenza la card arriva in Teams con i pulsanti *Dimmi di più* e *Ignora*:
  - *Dimmi di più* → l'agente risponde "Un attimo, sto preparando la risposta…" e poi con un'unica card: titolo, spiegazione, fonti consultate e pulsante **Apri il contenuto**. Non deve seguire un secondo messaggio con la stessa spiegazione;
  - *Ignora* → breve conferma.
- [ ] Ripeti con **Lingua della card = English**: pulsanti *Tell me more* / *Ignore*, risposta in inglese e pulsante *Open the content*.
- [ ] Invia A, poi B, quindi premi *Dimmi di più* sulla card A: l'approfondimento deve riguardare A, non B. Ripeti su una card pianificata prima dell'aggiornamento.
- [ ] Chiedi in chat "Spiegami l'ultima comunicazione": deve usare lo stesso tipo di card, senza una seconda spiegazione. Senza un riferimento chiaro e senza una selezione precedente, "dimmi di più sulla comunicazione" deve proporre una conferma.
- [ ] Prova una comunicazione senza link: l'approfondimento deve funzionare senza mostrare *Apri il contenuto*.
- [ ] Con due comunicazioni aventi stesso titolo e link, la vecchia card deve chiedere quale si intende. Oltre dieci corrispondenze deve permettere di passare alle pagine successive e precedenti, senza sceglierne una automaticamente.
- [ ] Dopo la spiegazione chiedi "quali sono i prerequisiti?": deve restare sulla stessa comunicazione. Poi chiedi "fammi un esempio per il mio lavoro": il Coach deve ricevere il contesto e non ripetere l'approfondimento.
- [ ] Se non vengono recuperate fonti sufficienti, deve comparire un limite esplicito insieme al messaggio originale. Un errore tecnico della ricerca non deve diventare una risposta apparentemente riuscita.
- [ ] Con un riferimento a una comunicazione non inviata all'utente autenticato, non deve essere restituito alcun contenuto. Non devono essere richiesti né accettati UPN alternativi.
- [ ] In *Storico e risultati* la comunicazione è *Completata* o *Parzialmente riuscita*, e l'utente senza app ha l'esito **Agente non installato**. Se invece ha *Da verificare*, apri la *Diagnostica* del destinatario e invia il testo dell'errore al fornitore della soluzione.
- [ ] Riporta gli invii su **bloccati** finché non si parte davvero.

---

## Passo 12. Messa in produzione

1. Verifica che l'app dell'agente sia installata per tutti i destinatari (passo 10.4).
2. In *Adopta Admin (code app)* → **Impostazioni** → *Invii in Teams* → **Invii abilitati** → *Salva*.
3. Da questo momento le comunicazioni pianificate partono all'ora prevista.

---

## Aggiornare un'installazione esistente

| Versione installata | Come aggiornare |
|---|---|
| **1.0.0.12–1.0.0.16 managed** | Importa `Adopta_1_0_0_17_managed.zip` come al passo 4. Nelle *Impostazioni avanzate* dell'importazione lascia l'azione predefinita, quella consigliata (*Upgrade*). Poi ripubblica prima il Coach e poi Adopta (passo 6). |
| **1.0.0.11 managed** | Come sopra. Poi ripubblica il Coach e Adopta (passo 6) e scegli la **Lingua predefinita** in *Adopta Admin* (passo 8). |
| **1.0.0.10 managed o precedente** | Prima condividi le due code app con chi usava la vecchia app canvas e la model-driven (passo 7.2). Poi importa come sopra, con l'azione consigliata (*Upgrade*): così le vecchie app vengono eliminate. Con *Update* resterebbero nell'ambiente. Poi passi 6 e 8. |
| **Unmanaged** (qualsiasi versione) | Non si può passare a managed con un aggiornamento: usa un ambiente pulito, oppure elimina prima la soluzione unmanaged e i suoi componenti. |
| *BuddyCommunications* (1.0.0.3 o precedente) | È una soluzione diversa: Adopta si installa accanto, da zero, e i dati non vengono migrati. |

Le comunicazioni già pianificate prima dell'aggiornamento mantengono la card che avevano. Il nuovo resolver riconosce i vecchi pulsanti tramite titolo e link, verificando comunque l'invio all'utente autenticato. Se il contenuto è stato modificato o eliminato e non esiste più una corrispondenza, lo dichiara senza sostituire la comunicazione con l'ultima.

---

## Risoluzione dei problemi

| Sintomo | Causa e rimedio |
|---|---|
| Uno o più flow non si attivano dopo l'import | Accendili nell'ordine del passo 5. |
| Attivazione dei flow con errore `GetMetadataForPatchEntity` / "Entity With Id = … does not exist" | Cache del servizio dei flow dopo un import fallito. Esegui *Pubblica tutte le personalizzazioni*, attendi 15–30 minuti e riaccendi i flow nell'ordine del passo 5. |
| *Applicazione all'ambiente* non dice "Configurazione applicata" | Apri la cronologia di *AdoptaApplySettings*. Di solito l'account della connessione Dataverse non ha il ruolo *System Customizer*. |
| L'agente non trova le comunicazioni o non usa il nome configurato | `vm_AdoptaDataverseUrl` è vuota o gli agenti non sono stati ripubblicati: salva le impostazioni (passo 8) e ripubblica (passo 6). |
| Il Coach non usa i materiali SharePoint | URL della knowledge mancante o non leggibile dagli utenti. Correggilo nel passo 8 e ripubblica gli agenti. |
| Nella code app: "Failed to acquire access token … Unable to find api with id" | L'utente non ha accettato il consenso alla connessione Dataverse: riapri l'app e accetta. |
| La code app legge ma non salva, con un errore che cita `prv…` | All'utente manca il ruolo (*Adopta Communications Manager* o *Adopta Administrator*) o *Basic User*: vedi passo 7.1. |
| L'interruttore degli invii nella code app non cambia stato | Serve il ruolo *Adopta Administrator*. |
| Molti destinatari con **Agente non installato** | L'app non è ancora distribuita a quegli utenti: passo 10.4. |
| Il gruppo scelto non compare nella composizione | Il gruppo non è *Attivo* in *Adopta Admin* → *Gruppi destinatari*. |
