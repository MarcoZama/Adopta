# Installare Adopta IT e EN

[English](README.md) | **Italiano**

Questa guida riguarda la versione **1.0.0.20**. Puoi installare una sola edizione
oppure entrambe nello stesso ambiente Power Platform.

| Edizione | Managed: ambienti di destinazione | Unmanaged: sviluppo |
|---|---|---|
| Italiano | [Scarica](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_IT_1_0_0_20_managed.zip) | [Scarica](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_IT_1_0_0_20_unmanaged.zip) |
| Inglese | [Scarica](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_EN_1_0_0_20_managed.zip) | [Scarica](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_EN_1_0_0_20_unmanaged.zip) |

Scarica anche il file `.sha256` corrispondente dagli
[asset della release](https://github.com/MarcoZama/Adopta/releases/tag/v1.0.0.20).
Per verificare uno ZIP in PowerShell:

```powershell
Get-FileHash .\Adopta_IT_1_0_0_20_managed.zip -Algorithm SHA256
```

Confronta l'hash ottenuto con il primo valore del relativo file `.sha256`.

> Mantieni gli invii bloccati durante tutta la configurazione. Non modificare
> e salvare le definizioni dei componenti managed per configurare il prodotto:
> potresti creare livelli unmanaged. Usa l'app Admin per le impostazioni.

## 1. Prerequisiti

- Un ambiente Power Platform con database Dataverse.
- Copilot Studio e Power Apps code apps disponibili e abilitati.
- Licenze e capacita' Power Apps, Copilot Studio/AI Builder e Microsoft 365/Teams
  adeguate agli utenti e al carico previsti. Verificale con l'amministratore
  del tenant.
- Un amministratore dell'ambiente che possa importare soluzioni, gestire
  connessioni, assegnare ruoli di sicurezza e pubblicare gli agenti.
- Un amministratore Teams per approvare e distribuire le app.
- Un account di servizio dedicato con licenze e permessi per i connettori
  richiesti, incluso l'accesso ai gruppi destinatari.
- Un piccolo gruppo di destinatari di test. Non iniziare con gruppi aziendali
  estesi.

Se installi entrambe le edizioni, ripeti configurazione, assegnazione dei ruoli,
condivisione delle app e pubblicazione degli agenti per ciascuna. Le tabelle
e le impostazioni delle due edizioni sono separate.

## 2. Creare e verificare le connessioni

In [Power Automate](https://make.powerautomate.com), seleziona l'ambiente
di destinazione e crea o verifica le connessioni seguenti:

| Connettore | Scopo |
|---|---|
| Microsoft Dataverse | Leggere e scrivere i dati applicativi e leggere il contesto dell'agente |
| Office 365 Groups | Risolvere l'appartenenza ai gruppi destinatari |
| Microsoft Teams | Consegnare le card delle comunicazioni |
| Office 365 Users | Leggere il profilo dell'utente autenticato |

Ogni edizione ha **cinque connection reference**: due Dataverse e una per ciascuno
degli altri connettori. Puoi scegliere la stessa connessione Dataverse per
entrambi i riferimenti, se proprieta' e permessi lo consentono.
Tutte le connessioni selezionate devono essere autenticate e funzionanti.

## 3. Importare la soluzione

1. Apri [Power Apps](https://make.powerapps.com) e seleziona l'ambiente corretto.
2. Vai in **Soluzioni > Importa soluzione** e scegli lo ZIP managed dell'edizione.
   Usa unmanaged soltanto in un ambiente di sviluppo.
3. Associa tutte e cinque le connection reference alle connessioni preparate.
4. Se vengono richieste le variabili d'ambiente:
   - Imposta **Dataverse environment URL** con l'URL HTTPS dell'organizzazione
     di destinazione, senza slash finale.
   - Puoi configurare **Coach knowledge URL** in seguito dall'app Admin.
5. Completa l'importazione e controlla la cronologia e gli eventuali warning.
6. Verifica il nome: **Adopta IT** (`Adopta`) oppure **Adopta EN** (`AdoptaEN`).
7. Pubblica le personalizzazioni Dataverse.

Non importare una managed sopra una unmanaged con lo stesso nome tecnico.
Usa un ambiente di destinazione separato; non eliminare soluzioni contenenti
dati per cambiare tipo di pacchetto.

## 4. Controllare i flow prima di abilitare la consegna

Ogni edizione comprende questi flow:

| Scopo | Italiano | Inglese |
|---|---|---|
| Figlio di consegna | `AdoptaDeliverCommunication` | `AdoptaENDeliverCommunication` |
| Applicazione impostazioni | `AdoptaApplySettings` | `AdoptaENApplySettings` |
| Gestione comunicazioni | `AdoptaManageCommunication` | `AdoptaENManageCommunication` |
| Pianificazione comunicazioni | `AdoptaScheduleCommunication` | `AdoptaENScheduleCommunication` |
| Dispatcher pianificato | `AdoptaDispatchScheduled` | `AdoptaENDispatchScheduled` |

Usa il comando nativo **Attiva / Turn on** nell'elenco della soluzione:
prima il figlio di consegna, poi Apply Settings, Manage e Schedule.
Verifica che ogni operazione riesca: il solo successo dell'import non basta.

Il figlio deve essere attivo prima di attivare il dispatcher. Lascia il
dispatcher spento finche' non sei pronto per un test di consegna controllato
e mantieni bloccato l'interruttore applicativo degli invii.

Se l'attivazione fallisce, segui la sezione di risoluzione dei problemi.
Non aprire e salvare la definizione di un flow managed come soluzione temporanea.
Dopo l'attivazione operativa verifica **Gestita: Si' / Personalizzato: No**
oppure **Managed: Yes / Customized: No**.

## 5. Assegnare i ruoli e condividere le app

Gli utenti delle code app devono avere sia i permessi Dataverse corretti
sia l'accesso all'app.

| Utente | Permessi e accesso |
|---|---|
| Amministratore applicativo | Basic User e ruolo Administrator dell'edizione; condividere l'app Admin |
| Responsabile comunicazioni | Basic User e ruolo Communications Manager dell'edizione; condividere l'app Communications |
| Amministratore che compone anche comunicazioni | Entrambi i ruoli applicativi e accesso a entrambe le app |

Usa i ruoli dell'edizione selezionata: i ruoli inglesi non autorizzano l'accesso
ai dati italiani, e viceversa.

Assegna i ruoli agli utenti o a team di gruppo Dataverse associati a gruppi Entra
appropriati. In **Power Apps > App > Condividi**, condividi le code app
corrispondenti con tali utenti o gruppi. Al primo avvio potrebbe essere richiesto
il consenso alla connessione Dataverse dell'utente.

L'account usato da Apply Settings deve anche poter aggiornare i valori delle
variabili d'ambiente. Se le impostazioni vengono salvate ma non applicate,
fai verificare questi permessi all'amministratore.

## 6. Configurare l'edizione in Admin

Apri l'app **Admin** dell'edizione e vai in **Impostazioni / Settings**:

1. Imposta nome della configurazione, titolo dell'app e nome visualizzato
   dell'agente.
2. Scegli la lingua predefinita dell'interfaccia. Non cambia la lingua fissa
   degli agenti dell'edizione o delle nuove card pianificate.
3. Inserisci l'URL SharePoint della knowledge del Coach, se usata. Verifica
   l'accesso per gli utenti previsti.
4. Lascia **Invii in Teams / Sending in Teams** bloccato.
5. Crea o salva la configurazione e attendi il successo in
   **Applicazione all'ambiente / Applied to the environment**. In caso di errore,
   controlla la cronologia delle esecuzioni di Apply Settings.
6. Carica un logo, se necessario.
7. In **Gruppi destinatari / Recipient groups**, aggiungi nome visualizzato,
   Object ID Entra, tipo e stato attivo del gruppo di test.

Mantieni una sola configurazione attiva per edizione. Non creare altri record
attivi per rappresentare lingue o destinatari.
Quando l'app segnala una modifica alle variabili d'ambiente, ripubblica gli agenti.

## 7. Pubblicare gli agenti e distribuirli in Teams

Per ogni edizione installata:

1. Apri [Copilot Studio](https://copilotstudio.microsoft.com) nell'ambiente
   di destinazione.
2. Verifica knowledge configurata e accesso alle connessioni.
3. Pubblica prima l'**Adoption Coach** e poi l'**agente principale**, attendendo
   la conferma di successo di ciascuno. Pubblicare le personalizzazioni Dataverse
   non sostituisce questo passaggio.
4. Apri il canale **Teams e Microsoft 365 Copilot** dell'agente principale
   e segui il processo di approvazione e disponibilita' del tenant.
5. Chiedi all'amministratore Teams di approvare e installare l'app agente
   dell'edizione corretta per i destinatari di test.

Per ricevere invii proattivi in Teams i destinatari devono avere installato
l'agente corrispondente. Installare l'agente italiano non installa quello inglese.

## 8. Collaudo e messa in produzione

Prima di abilitare gli invii ordinari:

- Apri entrambe le code app per ogni edizione installata: devono mostrare
  l'interfaccia, caricare i dati e usare le impostazioni dell'edizione corretta.
- Verifica che il cambio di lingua dell'interfaccia non cambi la lingua fissa
  degli agenti.
- Poni al Coach una domanda senza indicare ruolo o obiettivo: deve chiedere
  il chiarimento una volta, senza attesa prematura o domanda duplicata dal parent.
- Rispondi e verifica che la conversazione riprenda correttamente.
- Con un contesto completo, verifica al massimo un avviso prima della ricerca.
- Prova la ricerca autorizzata delle comunicazioni e i follow-up delle card:
  le comunicazioni di altri utenti non devono essere divulgate.
- Con approvazione esplicita, attiva il dispatcher e abilita gli invii per
  un test controllato sul piccolo gruppo. Pianifica una comunicazione, verifica
  la card Teams e i pulsanti di approfondimento, poi controlla lo storico.
- Ripeti con l'altra edizione, se installata. Le nuove card IT restano italiane
  e quelle EN inglesi, indipendentemente dalla lingua dell'interfaccia.
- Dopo il test, blocca nuovamente gli invii fino all'approvazione del go-live.

Alla messa in produzione verifica installazione dell'agente per i destinatari,
gruppi attivi, flow pronti e impostazioni prima di abilitare dispatcher
e interruttore degli invii per ciascuna edizione.
Bloccare i nuovi invii non richiama messaggi o annulla attivita' gia' in corso.

## Aggiornare alla 1.0.0.20

Esegui il backup dell'ambiente e importa il pacchetto 1.0.0.20 corrispondente
mantenendo il tipo gia' installato. Non disinstallare la soluzione o eliminare
dati applicativi. Segui le indicazioni della piattaforma per update/upgrade
della versione installata.

La 1.0.0.20 corregge il difetto di avvio delle code app della 1.0.0.18/19.
Dopo l'aggiornamento chiudi e riapri il player: deve apparire l'app, non JSON
diagnostico. Ricontrolla connessioni, attivazione dei flow, configurazione
e pubblicazione degli agenti. Le comunicazioni esistenti conservano la card
gia' memorizzata.

## Risoluzione dei problemi

| Sintomo | Azione |
|---|---|
| L'attivazione cita `GetMetadataForGetEntity`, `GetMetadataForPatchEntity` o un ID entita' inesistente | Verifica le sei tabelle dell'edizione, pubblica le personalizzazioni e controlla le connessioni. Il GUID puo' essere un ID metadata generato nel target, non un valore da sostituire nello ZIP. Se necessario, reimporta la stessa managed con gli invii bloccati e riprova l'attivazione nativa. |
| `ChildFlowNeverPublished` | Attiva con successo il figlio di consegna prima del dispatcher. Se persiste, conserva il log e risolvi prima di procedere; non salvare le definizioni managed come soluzione temporanea. |
| L'app mostra JSON invece dell'interfaccia | Verifica che sia installata la 1.0.0.20 e riapri il player. Non usare i pacchetti app difettosi 1.0.0.18/19. |
| L'app si apre ma lettura o salvataggio falliscono | Controlla ruoli dell'edizione, condivisione, consenso alla connessione e permessi dell'utente autenticato. |
| Le impostazioni sono salvate ma non applicate | Controlla la cronologia di Apply Settings e i permessi dell'account di connessione sulle variabili d'ambiente. |
| Il Coach non usa knowledge o branding aggiornati | Controlla URL salvati, accesso alle fonti e pubblicazione prima del Coach e poi del principale. |
| Un destinatario risulta con agente non installato | Distribuisci l'app Teams dell'edizione corretta e attendi il completamento della distribuzione del tenant. |
| Configurazione assente o invii bloccati | Crea la configurazione dell'edizione in Admin. Abilita gli invii solo dopo il collaudo controllato. |

### Ambito delle verifiche

L'aggiornamento managed 1.0.0.20 e il caricamento iniziale delle quattro code app
sono stati verificati in un ambiente di destinazione. Il problema di attivazione
dell'import italiano e' stato recuperato con i comandi nativi, prima il figlio
e poi il parent, senza salvare definizioni managed.
Questo non garantisce un primo import senza warning in ogni ambiente,
la pubblicazione live completa degli agenti o la consegna Teams end-to-end.
Completa il collaudo nel tuo tenant prima dell'uso in produzione.

[Torna al README del progetto](../README.md)
