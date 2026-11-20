# Installing Adopta IT and EN

This guide covers version **1.0.0.20**. You can install either edition on its own
or both in the same Power Platform environment.

| Edition | Managed: destination environments | Unmanaged: development |
|---|---|---|
| Italian | [Download](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_IT_1_0_0_20_managed.zip) | [Download](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_IT_1_0_0_20_unmanaged.zip) |
| English | [Download](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_EN_1_0_0_20_managed.zip) | [Download](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_EN_1_0_0_20_unmanaged.zip) |

Download the matching `.sha256` file from the
[release assets](https://github.com/MarcoZama/Adopta/releases/tag/v1.0.0.20).
To verify a ZIP in PowerShell:

```powershell
Get-FileHash .\Adopta_IT_1_0_0_20_managed.zip -Algorithm SHA256
```

Compare the resulting hash with the first value in its `.sha256` file.

> Keep sending blocked throughout setup. Do not edit and save managed component
> definitions to configure the product: this can introduce unmanaged layers.
> Use the Admin app for application settings.

## 1. Prerequisites

- A Power Platform environment with a Dataverse database.
- Copilot Studio and Power Apps code apps available and enabled.
- Appropriate Power Apps, Copilot Studio/AI Builder, and Microsoft 365/Teams
  licenses and capacity for the intended users and workload. Confirm these
  with your tenant administrator.
- An environment administrator able to import solutions, manage connections,
  assign security roles, and publish agents.
- A Teams administrator for app approval and distribution.
- A dedicated service account with the required connector permissions and
  licenses, including access to the recipient groups.
- A small test recipient group. Do not start with organization-wide groups.

If installing both editions, repeat configuration, role assignment, app sharing,
and agent publication for each. The two editions have separate tables and settings.

## 2. Create and verify connections

In [Power Automate](https://make.powerautomate.com), select the destination
environment and create or verify connections for:

| Connector | Purpose |
|---|---|
| Microsoft Dataverse | Read/write application data and read agent context |
| Office 365 Groups | Resolve recipient group membership |
| Microsoft Teams | Deliver communication cards |
| Office 365 Users | Read the authenticated user's profile |

Each edition has **five connection references**: two Dataverse references plus
one for each other connector. A Dataverse connection can be selected for both
references where the ownership and permissions allow it.
All selected connections must be authenticated and show a healthy status.

## 3. Import the solution

1. Open [Power Apps](https://make.powerapps.com) and select the correct environment.
2. Go to **Solutions > Import solution** and choose the edition's managed ZIP.
   Use unmanaged only in a development environment.
3. Map all five connection references to the connections prepared above.
4. If prompted for environment variables:
   - Set the **Dataverse environment URL** to the destination organization's
     HTTPS URL, without a trailing slash.
   - The **Coach knowledge URL** can be configured later in the Admin app.
5. Complete the import and inspect its history and any warnings.
6. Confirm the solution name: **Adopta IT** (`Adopta`) or **Adopta EN** (`AdoptaEN`).
7. Publish the Dataverse customizations.

Do not import managed over an existing unmanaged solution with the same unique
name. Use a separate destination environment instead; do not delete data-bearing
solutions to change package types.

## 4. Check flows before enabling delivery

Each edition includes the following flows:

| Purpose | Italian | English |
|---|---|---|
| Delivery child | `AdoptaDeliverCommunication` | `AdoptaENDeliverCommunication` |
| Apply settings | `AdoptaApplySettings` | `AdoptaENApplySettings` |
| Manage communications | `AdoptaManageCommunication` | `AdoptaENManageCommunication` |
| Schedule communications | `AdoptaScheduleCommunication` | `AdoptaENScheduleCommunication` |
| Scheduled dispatcher | `AdoptaDispatchScheduled` | `AdoptaENDispatchScheduled` |

Use the solution's native **Turn on** command to activate the delivery child
first, followed by Apply Settings, Manage, and Schedule. Confirm each operation
succeeds; an import success message alone is not sufficient.

The delivery child must be active before activating its dispatcher. Keep the
dispatcher off until you are ready for a controlled delivery test, and keep the
application sending switch blocked.

If activation fails, follow the troubleshooting section below. Do not open and
save a managed flow definition as a workaround. Check that the component remains
**Managed: Yes / Customized: No** after operational activation.

## 5. Assign roles and share the apps

Users of the code apps need both the correct Dataverse permissions and access
to the app itself.

| User | Permissions and access |
|---|---|
| Application administrator | Basic User and the edition's Administrator role; share its Admin app |
| Communications manager | Basic User and the edition's Communications Manager role; share its Communications app |
| Administrator who also creates communications | Both application roles and access to both apps |

Use the roles belonging to the selected edition; the English roles do not grant
access to Italian application data, or vice versa.

Assign roles to users or appropriate Entra-backed Dataverse group teams.
In **Power Apps > Apps > Share**, share the corresponding code apps with those
users or groups. Users may need to consent to their Dataverse connection on
first launch.

The account used by Apply Settings must also have the permissions needed to
update the environment-variable values. Have the administrator verify those
permissions if settings are saved but not applied.

## 6. Configure the edition in Admin

Open the edition's **Admin** app and go to **Settings**:

1. Set the configuration name, application title, and agent display name.
2. Choose the default app interface language. This does **not** change the
   fixed language of the edition's agents or newly scheduled cards.
3. Enter the Coach's SharePoint knowledge URL, if used. Verify access for the
   intended users.
4. Leave **Sending in Teams** blocked.
5. Create or save the configuration and wait for **Applied to the environment**
   to report success. Investigate failures in Apply Settings run history.
6. Upload a logo if required.
7. In **Recipient groups**, add the test group's display name, Entra object ID,
   type, and active status.

Maintain one active configuration record per edition. Do not create additional
active records to represent languages or audiences.
When the app reports that environment variables changed, republish the agents.

## 7. Publish agents and distribute in Teams

For each installed edition:

1. Open [Copilot Studio](https://copilotstudio.microsoft.com) in the destination
   environment.
2. Verify the configured knowledge and connection access.
3. Publish the **Adoption Coach**, then the **main agent**, waiting for confirmed
   success each time. Publishing Dataverse customizations does not replace this.
4. Open the main agent's **Teams and Microsoft 365 Copilot** channel and follow
   the tenant's approval and availability process.
5. Ask the Teams administrator to approve and install the correct edition's
   agent app for the test recipients.

Recipients need the corresponding agent installed for proactive Teams delivery.
Installing the Italian agent does not install the English agent.

## 8. Acceptance checks and go-live

Before enabling regular delivery:

- Open both code apps for every installed edition; confirm they show their UI,
  load data, and use the correct edition's settings.
- Check that the UI language switch does not change the agents' fixed language.
- Ask the Coach a question with a missing role or goal: it should clarify once,
  without a premature waiting message or a duplicate question from the parent.
- Answer the clarification and verify that the conversation resumes correctly.
- With complete context, verify at most one waiting notice before research.
- Test authorized communication lookup and card follow-ups; another user's
  communications must not be disclosed.
- With explicit approval, activate the dispatcher and enable sending for a
  controlled test to the small test group. Schedule a communication, verify its
  Teams card and follow-up buttons, and inspect delivery history.
- Repeat for the other edition if installed. New IT cards stay Italian and new
  EN cards stay English, regardless of the app interface language.
- Block sending again after the test until go-live is approved.

At go-live, verify recipient installation, active groups, flow readiness, and
settings before enabling the dispatcher and sending switch for each edition.
Blocking new sends does not recall messages or cancel work already in progress.

## Upgrading to 1.0.0.20

Back up the environment and import the corresponding 1.0.0.20 package using
the existing package type. Do not uninstall the solution or delete application
data. Follow the platform's update/upgrade guidance for your installed version.

Version 1.0.0.20 corrects the code app launch defect in 1.0.0.18/19. Close and
reopen the player after updating; it should display the app, not diagnostic JSON.
Recheck connections, flow activation, configuration, and agent publication.
Existing communications retain their stored card payloads.

## Troubleshooting

| Symptom | Action |
|---|---|
| Flow activation reports `GetMetadataForGetEntity`, `GetMetadataForPatchEntity`, or an entity ID not found | Verify all six tables for the edition exist, publish customizations, and confirm the connections. The reported GUID may be target-generated metadata, not an ID to replace in the ZIP. If needed, reimport the same managed package with sending blocked and retry native activation. |
| `ChildFlowNeverPublished` | Activate the delivery child successfully before its dispatcher. If the error persists, retain the log and resolve it before proceeding; do not save managed definitions as a workaround. |
| App shows JSON instead of its interface | Check that 1.0.0.20 is installed and reopen the player. Do not use the defective 1.0.0.18/19 app packages. |
| App opens but data access or save fails | Check the edition-specific roles, app sharing, connection consent, and the signed-in user's permissions. |
| Settings save but are not applied | Inspect Apply Settings run history and the connection account's permission to update environment variables. |
| Coach cannot use knowledge or updated branding | Check the saved URLs, source access, and publication of Coach followed by the main agent. |
| Recipient is reported as agent not installed | Deploy the correct edition's Teams agent app and allow tenant distribution to complete. |
| No configuration or sending is blocked | Create the edition's configuration in Admin. Enable sending only after the controlled checks above. |

### Verification scope

The 1.0.0.20 managed update and initial loading of all four code apps were
verified in a destination environment. The Italian import activation issue was
recovered using native child-before-parent activation without saving managed
definitions. This is not a guarantee of warning-free first import in every
environment, complete live agent publication, or end-to-end Teams delivery.
Complete the acceptance checks for your tenant before production use.

[Back to the project README](../README.md)
