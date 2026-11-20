# Adopta

Adopta aiuta le organizzazioni a promuovere l'adozione di Microsoft 365 e Copilot
attraverso comunicazioni in Teams e un assistente conversazionale.
La soluzione usa Power Apps, Power Automate, Dataverse e Copilot Studio.

## Cosa fa

- **Adoption Coach**: risponde alle domande, chiarisce ruolo e obiettivo
  dell'utente e propone indicazioni pratiche basate sulle fonti configurate.
- **Agente principale**: gestisce l'ingresso alla conversazione, le richieste
  sulle comunicazioni e la delega al Coach.
- **Communications**: app per preparare bozze, selezionare i gruppi destinatari,
  pianificare le comunicazioni e consultarne stato e risultati.
- **Admin**: app per configurare nomi, logo, knowledge del Coach, gruppi e
  abilitazione degli invii.
- **Automazione**: i flow applicano le impostazioni, gestiscono la pianificazione
  e consegnano le card in Teams, registrando gli esiti in Dataverse.

Gli invii richiedono una configurazione esplicitamente abilitata. Installare
la soluzione non equivale ad autorizzare l'invio di comunicazioni.

## Due edizioni indipendenti

| | Adopta IT | Adopta EN |
|---|---|---|
| Nome tecnico della soluzione | `Adopta` | `AdoptaEN` |
| Agente principale e Coach | Solo italiano | Solo inglese |
| Interfaccia delle app | Italiano / inglese | Italiano / inglese |
| Tabelle, flow e impostazioni | Propri | Propri, separati da IT |

Le due edizioni possono convivere nello stesso ambiente senza condividere
configurazioni o dati applicativi. Il selettore della lingua nelle app cambia
l'interfaccia, non la lingua degli agenti o delle nuove card.
Ogni edizione comprende due agenti, due code app, cinque flow, sei tabelle
e due ruoli applicativi.

## Scaricare e installare

I pacchetti automatici sono pubblicati nelle
[GitHub Releases](https://github.com/MarcoZama/Adopta/releases), dopo aver
configurato la pipeline:

- `Adopta_IT_<versione>_managed.zip`
- `Adopta_IT_<versione>_unmanaged.zip`
- `Adopta_EN_<versione>_managed.zip`
- `Adopta_EN_<versione>_unmanaged.zip`
- `SHA256SUMS.txt` e `release.json`, con hash e commit di provenienza.

Usare **managed** negli ambienti di destinazione e **unmanaged** per lo sviluppo.
Non importare una managed sopra l'omonima unmanaged e non eliminare soluzioni
contenenti dati per cambiarne il tipo.

Servono un ambiente Dataverse con Copilot Studio e code app abilitate,
licenze adeguate, connessioni ai connettori richiesti e i ruoli applicativi.
La configurazione del tenant, la pubblicazione degli agenti e la distribuzione
in Teams restano passi dell'installazione:
[guida completa](deploy/INSTALL.md).

## Struttura del repository

| Percorso | Contenuto |
|---|---|
| [src](src/) | Soluzione e agenti italiani |
| [src-en](src-en/) | Soluzione e agenti inglesi |
| [admin-app](admin-app/) | Sorgenti React/TypeScript dell'app Admin |
| [code-app](code-app/) | Sorgenti React/TypeScript dell'app Communications |
| [shared](shared/) | Binding e adattatori comuni alle due edizioni |
| [deploy](deploy/) | Build, validazione e istruzioni di installazione/rilascio |
| [tests](tests/) | Test dei topic, dei flow e dell'isolamento tra edizioni |
| [.github/workflows/release.yml](.github/workflows/release.yml) | Pipeline di verifica e rilascio |

## Sviluppo locale

Prerequisiti: Node.js 24, PowerShell 7, .NET 10 e
[Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction)
2.12.2, inclusi gli assembly di authoring usati dai test.

```powershell
npm ci
npm --prefix .\admin-app ci
npm --prefix .\code-app ci
npm test

.\deploy\Build-Solution.ps1 -Edition it
.\deploy\Build-Solution.ps1 -Edition en
```

Le build locali producono unmanaged in `dist/local`. Non accedono a Dataverse
e **non possono generare managed autentiche**: per queste serve l'export nativo
eseguito dalla pipeline. Dipendenze, output e configurazioni locali non sono
versionati; schemi SDK, binding e asset richiesti dai sorgenti rimangono in Git.

## Pipeline dopo il merge

1. Una PR verso `main` esegue test, build delle quattro app e packaging unmanaged,
   senza accesso a Dataverse.
2. Il merge genera un push su `main`: la pipeline importa i pacchetti in un
   **ambiente CI dedicato**, quindi esporta nativamente managed e unmanaged.
3. Solo dopo le verifiche di tutti e quattro i pacchetti pubblica una GitHub
   Release scaricabile. Non distribuisce in produzione o in Teams.

I push diretti su `main` attivano lo stesso rilascio; proteggere il branch
richiedendo una PR. E' disponibile anche l'avvio manuale da Actions, su `main`.
La versione CI e' `major.minor.numero_run.tentativo`, per esempio `1.0.12.1`;
`major.minor` proviene dai manifest sorgente. Per riprovare un rilascio fallito,
usare **Re-run all jobs**, cosi' viene assegnata una nuova revisione.

**Configurazione iniziale obbligatoria**: ambiente Dataverse di build,
identita' Entra federata, variabili e secret GitHub.
Seguire [Configurare la pipeline](deploy/CI.md). Senza questi prerequisiti il
rilascio fallisce esplicitamente: non vengono pubblicati managed simulati.

La pipeline verifica il packaging e i sorgenti, non certifica conversazioni
generative, primo import senza warning in un ambiente vuoto o consegna Teams.
Per note sui rilasci precedenti e limiti noti: [documentazione tecnica](deploy/README.md).
