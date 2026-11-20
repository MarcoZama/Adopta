# Offline PAC packaging and GitHub releases

The [workflow](../.github/workflows/release.yml) builds the checked-in source
with **PAC CLI**, without signing in to Power Platform.
No Dataverse build environment, tenant ID, client ID, connection JSON, or
Power Platform secret is required.

## What changed

The former cloud export job required `PP_BUILD_ENVIRONMENT_URL` and related
configuration. That job has been removed, not bypassed with fake credentials.
Retrying an old workflow run still executes the old workflow: commit the updated
files and start a new run instead.

The repository now includes genuine **Both-format source metadata** from the
paired native 1.0.0.20 exports: the dual-format solution manifests and managed
form variants. Their provenance is recorded in [native-metadata.json](native-metadata.json).
PAC uses these files to produce both package types; the build does not turn an
unmanaged ZIP into a managed one by editing its flag.

Keep both form variants in source when changing forms. New or changed components
must have valid managed/unmanaged metadata; obtain missing variants through a
native paired export and `pac solution unpack --packagetype Both`. Do not
fabricate missing metadata. Incomplete pairs fail validation before packaging.

## Execution

- **PR to main:** install locked dependencies, run tests, build all four apps,
  and call `pac solution pack --packagetype Both` for IT and EN.
- **Merge/push to main:** perform the same checks, then publish the four ZIPs,
  `SHA256SUMS.txt`, and `release.json` in a GitHub Release.
- **Manual run:** Actions > Build and release Adopta > Run workflow > `main`.
- **Download:** Release assets, or the `adopta-solutions` Actions artifact
  retained for 30 days.

The version is `major.minor.run_number.run_attempt`, taking major/minor from
the matching IT/EN source versions. Source manifests are not modified by CI
versioning. Each version component must stay within `0..65535`.
A release remains a draft until its six assets have been uploaded.
Use **Re-run all jobs** after a failed release to obtain a new revision.

GitHub Actions must be enabled. Only the publication job receives
`contents: write`, using the built-in `GITHUB_TOKEN` to create the tag and Release.
PR builds have read-only repository access. Protect `main` with PR reviews and
the **Test and package IT / EN** check. No GitHub Environment is required.

## Local equivalent

With Node.js 24, PowerShell 7, .NET 10, and PAC 2.12.2 installed:

```powershell
npm ci
npm --prefix .\admin-app ci
npm --prefix .\code-app ci
npm test
.\deploy\Build-Solution.ps1 -Edition it -PackageType Both
.\deploy\Build-Solution.ps1 -Edition en -PackageType Both
```

Outputs are written to `dist/local`, with individual SHA-256 files.
The build checks both manifest flags, functional payloads and edition identity,
then unpacks the pair and validates XML, YAML, references and authoring semantics
with the Microsoft SDK. HTML must be the first app asset and build diagnostics
must not be deployed.

The installer supplies their own connections and environment-variable values
at import/configuration time. Templates remain empty, not filled with fake
customer data.

Offline packaging does not certify target import, agent publication or Teams
delivery. Complete the [installation acceptance checks](../installation/README.md)
before production use.
