# Configurare il rilascio GitHub

La pipeline [Build and release Adopta](../.github/workflows/release.yml) usa
un ambiente Dataverse dedicato per generare export **nativi** delle due edizioni.
Ogni esecuzione aggiorna il target scelto con la configurazione seguente:
deve essere l'ambiente CI, mai quello di sviluppo o produzione.

## 1. Preparare l'ambiente CI

Un amministratore deve predisporre un ambiente **dedicato**, con Dataverse,
Copilot Studio, code app e dipendenze della soluzione abilitate e licenziate.
Non utilizzare un ambiente che contiene comunicazioni, configurazioni reali
o connessioni destinate agli invii di produzione.

Prima del primo rilascio:

1. Importare una volta le due soluzioni **unmanaged** `Adopta` e `AdoptaEN`.
   Si possono ottenere da una build locale con `Build-Solution.ps1`.
2. Creare le connessioni di test richieste dalle cinque connection reference
   di ciascuna edizione e verificarle nel portale. Non usare connessioni Teams
   di produzione. Completare gli eventuali passi iniziali di import/autorizzazione
   senza salvare impostazioni applicative.
3. Lasciare vuote le tabelle Setting, Communication e Delivery di entrambe le
   edizioni. La pipeline verifica questo vincolo **prima e dopo** gli import;
   se trova dati si ferma senza cancellarli o disabilitarli.
4. Riservare questo ambiente alla pipeline: niente authoring manuale,
   personalizzazioni aggiuntive o invii. Gli import aggiornano i componenti,
   ma non eliminano automaticamente quelli rimossi dai sorgenti. In caso di
   rimozioni, riallineare la baseline nell'ambiente CI prima del rilascio.

La pipeline non crea l'ambiente, non elimina soluzioni e non attiva
intenzionalmente i dispatcher. Il controllo dei dati non sostituisce
l'isolamento dell'ambiente e delle connessioni.

## 2. Identita' Entra senza client secret

Creare un'app registration per la CI e il relativo application user
nell'ambiente Dataverse di build. Assegnare le autorizzazioni per importare,
pubblicare ed esportare le soluzioni e leggere le tabelle applicative.
Per il bootstrap si puo' usare il ruolo System Administrator, **solo
nell'ambiente CI isolato**; rivedere poi i privilegi secondo le policy del tenant.
L'identita' deve poter usare le connection reference configurate.

Nell'app registration creare una credenziale federata:

| Campo | Valore |
|---|---|
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject | `repo:MarcoZama/Adopta:environment:power-platform-build` |
| Audience | `api://AzureADTokenExchange` |

Se il repository viene trasferito o rinominato, aggiornare il subject.
La pipeline usa `pac auth create --githubFederated`, non password o token
personali. [Riferimento Microsoft](https://learn.microsoft.com/power-platform/developer/cli/reference/auth#pac-auth-create).

## 3. GitHub Environment

In **Settings > Environments** del repository creare `power-platform-build`.
Limitare i deployment a `main`; impostare eventuali approvazioni secondo
le policy del progetto. Ogni approvazione richiesta introduce una pausa
prima degli import, quindi il rilascio non sara' completamente automatico.

Configurare queste **environment variables**:

| Nome | Contenuto |
|---|---|
| `PP_BUILD_ENVIRONMENT_URL` | URL HTTPS dell'organizzazione Dataverse CI, senza percorsi |
| `PP_BUILD_ENVIRONMENT_ID` | GUID dell'ambiente CI, verificato anche con `pac org who` |
| `PP_TENANT_ID` | Tenant ID dell'app registration |
| `PP_CLIENT_ID` | Application/client ID dell'app registration |

Configurare questi **environment secrets**:

| Nome | Contenuto |
|---|---|
| `PP_BUILD_SETTINGS_IT` | JSON completo delle impostazioni di import IT |
| `PP_BUILD_SETTINGS_EN` | JSON completo delle impostazioni di import EN |

Per creare i due JSON partire dai modelli
[IT](deploymentSettings.json) e [EN](deploymentSettings.en.json), su copie
`*.local.json` escluse da Git. Compilare i cinque `ConnectionId` con le connessioni
**del solo ambiente CI**, mantenendo `LogicalName` e `ConnectorId`.
Lasciare vuoti tutti i `Value` delle variabili d'ambiente: gli agenti non vengono
eseguiti o pubblicati in Teams durante una build.
Caricare i JSON nei secret tramite l'interfaccia GitHub; non committarli.
I file temporanei sono rimossi a fine job e non vengono caricati come artefatti.

In **Settings > Actions > General** consentire l'esecuzione delle GitHub Actions
ufficiali usate nel workflow. Il job di pubblicazione richiede `contents: write`
per creare tag e Release; i controlli PR non ricevono questo permesso, secret
o accesso OIDC a Dataverse.

## 4. Esecuzione e download

- **PR verso main:** test e quattro build, piu' packaging dei due candidati
  unmanaged. L'artefatto `adopta-import-candidates` resta per 7 giorni ed e'
  solo un input di build, non il rilascio nativo.
- **Merge/push su main:** stessi controlli, import in CI, pubblicazione delle
  personalizzazioni Dataverse ed export nativo dei quattro ZIP. Le esecuzioni
  su main sono serializzate per non importare contemporaneamente nell'ambiente.
- **Avvio manuale:** Actions > Build and release Adopta > Run workflow > `main`.
- **Download:** pagina **Releases**, asset della versione pubblicata. Sono
  disponibili quattro ZIP, `SHA256SUMS.txt` e `release.json`. L'artefatto
  `adopta-native-release` in Actions resta anche per 30 giorni.

La versione e' `major.minor.run_number.run_attempt`, con major/minor comuni
letti dai manifest IT/EN, per esempio `1.0.12.1`. I componenti devono rimanere
entro `0..65535`. Non vengono modificati o committati i manifest sorgente.
Una Release rimane draft finche' tutti gli asset non sono caricati.
In caso di errore usare **Re-run all jobs**, non solo i job falliti, per avere
una nuova versione ed evitare collisioni con eventuali draft precedenti.
Un amministratore puo' rimuovere successivamente i draft non pubblicati.

Proteggere `main` imponendo PR e controllo **Test and package IT / EN**.
Non inserire secret in workflow eseguiti su codice PR e non usare
`pull_request_target` per compilare il contenuto delle PR.

## Controlli e limiti

Il rilascio fallisce su configurazione mancante, ambiente errato/non preparato,
dati applicativi presenti, errori PAC, versione o tipo di pacchetto errati,
app senza HTML iniziale, asset mancanti/diversi dalla build, diagnostici
pubblicati, valori d'ambiente o connessioni fisiche esportati.
I file nativi non vengono modificati per simulare il flag managed.

Il bootstrap e le identita'/connessioni devono essere configurati dal tenant
administrator: aggiungere il solo workflow non li crea. Le verifiche locali
non dimostrano che l'identita' CI abbia tali permessi.
L'export non certifica la pubblicazione degli agenti, il funzionamento dei flow
in un altro ambiente o l'esito di una conversazione/consegna Teams.
Eseguire il collaudo descritto nella [guida di installazione](INSTALL.md).
