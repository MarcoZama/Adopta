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

The version preserves `major.minor.build` from the matching IT/EN source
manifests and increments only the fourth component, using existing GitHub tags
in that series. For example, with source `1.0.0.20` and tag `v1.0.0.20`,
the next release is `1.0.0.21`, followed by `1.0.0.22`. Tags are compared
numerically, not alphabetically; other version series are ignored.

The source revision is a minimum: with no matching tags the source version is
used unchanged, and explicitly raising it advances the next release to at least
that value. Source manifests are not modified. Every component must stay within
`0..65535`; when the revision is exhausted, advance the version series in both
manifests.

The publication job reserves the Git tag before creating a draft and uploading
its six assets. An existing tag is never overwritten. If publication fails,
**Re-run all jobs**: the reserved tag causes allocation of the next revision,
so failed releases can leave gaps. Rerunning only the publication job retains
the old version and cannot reuse its reserved tag. A release becomes public
only after all six assets have been uploaded.

The original `v1.0.0.20` release and its native exports remain unchanged.
Packages built with the former run-based scheme may have a higher Dataverse
version, such as `1.0.2.1`. If already installed, do not attempt to force a
downgrade to `1.0.0.x`; plan a higher series in both source manifests instead.

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
