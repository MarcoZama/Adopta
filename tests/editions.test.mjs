import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import profiles from "../deploy/editions.json" with { type: "json" };
import { bindQuery, bindRecord, canonicalRecord, getEdition, nativeName } from "../shared/edition.ts";
import { bindSources, tableService } from "../shared/power-apps.ts";
import { filesUnder, readComponent, root, runSdk, validateSolution, walk } from "../deploy/validate-solution.mjs";
import { evaluateWorkflow } from "./workflow-expression.mjs";
import { codeAppAssets } from "../deploy/prepare-solution.mjs";

const id = "12345678-1234-1234-1234-123456789abc";
const guidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const identityMap = JSON.parse(fs.readFileSync(path.join(root, "deploy", "english-identities.json"), "utf8"));

test("code app HTML is always the launch asset and build diagnostics never enter the package", () => {
  const parent = path.join(root, ".solution-build");
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent, "codeapp-assets-"));
  try {
    fs.mkdirSync(path.join(fixture, "assets"));
    fs.writeFileSync(path.join(fixture, "edition.json"), '{"edition":"it","schema":"test"}');
    fs.writeFileSync(path.join(fixture, "index.html"), '<html><script type="module" src="./assets/app.js"></script></html>');
    fs.writeFileSync(path.join(fixture, "assets", "app.js"), "export {};");
    fs.writeFileSync(path.join(fixture, "assets", "app.css"), "body{}");
    assert.deepEqual(codeAppAssets(fixture),
      ["index.html", path.join("assets", "app.css"), path.join("assets", "app.js")]);
    fs.unlinkSync(path.join(fixture, "index.html"));
    assert.throws(() => codeAppAssets(fixture), /Missing code app entry point/);
  } finally { fs.rmSync(fixture, { recursive: true }); }
});

test("English syntax, XML, references and targeted Microsoft authoring semantics are valid", () => {
  assert.deepEqual(validateSolution("en"), { yaml: 46, xml: 161 });
});

test("all four agent instruction blocks fit the documented 8000-character budget", () => {
  for (const [edition, profile] of Object.entries(profiles)) {
    for (const bot of [profile.agent, profile.coach]) {
      const instructions = readComponent(`${bot}.gpt.default`, edition).instructions;
      assert.ok(instructions.length <= 8000, `${bot}: ${instructions.length} characters`);
    }
  }
});

test("application component identities do not overlap; Italian identities remain unchanged", () => {
  const contents = Object.fromEntries(Object.entries(profiles).map(([edition, profile]) => [
    edition, filesUnder(path.join(root, profile.source)).filter((file) => !file.includes("_CodeAppPackages"))
      .map((file) => fs.readFileSync(file, "utf8")).join("\n"),
  ]));
  const shared = new Set(identityMap.sharedPlatformIds);
  const original = new Set(contents.it.match(guidPattern).map((value) => value.toLowerCase()));
  const english = new Set(contents.en.match(guidPattern).map((value) => value.toLowerCase()));
  assert.deepEqual([...original].filter((value) => english.has(value) && !shared.has(value)), []);
  for (const [oldId, newId] of Object.entries(identityMap.ids)) {
    assert.notEqual(newId, oldId);
    assert.equal(english.has(oldId), false, `Old application identity in EN: ${oldId}`);
  }
  assert.equal(profiles.it.solution, "Adopta");
  assert.equal(profiles.it.agent, "vm_Adopta");
  assert.equal(profiles.it.apps.communications.appId, "dbcfaf8d-0436-4734-b8ad-724eeb1f6841");
  assert.equal(profiles.en.apps.communications.appId, null, "Do not invent a provisioned English app ID");
});

test("bindings map schema identifiers, never user text or OData string literals", () => {
  const en = getEdition("en");
  const it = getEdition("it");
  assert.throws(() => getEdition("fr"), /Unknown/);
  assert.equal(nativeName("vm_adoptacommunicationid", en), "vm_adoptaencommunicationid");
  assert.equal(nativeName("vm_title", en), "vm_title");
  assert.equal(nativeName("vm_adoptacommunicationid", it), "vm_adoptacommunicationid");
  assert.equal(bindQuery("vm_adoptacommunicationid eq 'vm_adoptacommunicationid' and vm_title eq 'O''Brien'", en),
    "vm_adoptaencommunicationid eq 'vm_adoptacommunicationid' and vm_title eq 'O''Brien'");
  assert.deepEqual(bindRecord({
    vm_title: "vm_adoptacommunications",
    "vm_Communication@odata.bind": `/vm_adoptacommunications(${id})`,
  }, en), {
    vm_title: "vm_adoptacommunications",
    "vm_Communication@odata.bind": `/vm_adoptaencommunications(${id})`,
  });
  assert.deepEqual(canonicalRecord({ vm_adoptaencommunicationid: id, vm_body: "vm_adoptaencommunicationid" }, en),
    { vm_adoptacommunicationid: id, vm_body: "vm_adoptaencommunicationid" });
});

test("the shared SDK adapter performs CRUD only against the selected edition and preserves errors", async () => {
  for (const edition of ["it", "en"]) {
    const profile = getEdition(edition);
    const calls = [];
    const key = nativeName("vm_adoptasettingid", profile);
    const client = {
      retrieveMultipleRecordsAsync: async (...args) => {
        calls.push(args);
        return { success: true, data: [{ [key]: id }], skipToken: "page2" };
      },
      createRecordAsync: async (...args) => { calls.push(args); return { success: true, data: { [key]: id } }; },
      updateRecordAsync: async (...args) => { calls.push(args); return { success: true, data: { [key]: id } }; },
      retrieveRecordAsync: async (...args) => { calls.push(args); return { success: true, data: { [key]: id } }; },
      deleteRecordAsync: async (...args) => { calls.push(args); return { success: true, data: undefined }; },
    };
    const service = tableService(client, "vm_adoptasettings", profile);
    const result = await service.getAll({ select: ["vm_adoptasettingid", "vm_name"], filter: "statecode eq 0" });
    assert.deepEqual(result.data, [{ vm_adoptasettingid: id }]);
    assert.equal(result.skipToken, "page2");
    assert.deepEqual((await service.create({ vm_name: "Example" })).data, { vm_adoptasettingid: id });
    await service.update(id, { vm_name: "Updated" });
    await service.get(id);
    await service.delete(id);
    assert.ok(calls.every(([table]) => table === nativeName("vm_adoptasettings", profile)));
    assert.deepEqual(calls[0][1].select, [key, "vm_name"]);
    const failure = { success: false, data: undefined, error: { message: "Denied" } };
    client.retrieveMultipleRecordsAsync = async () => failure;
    assert.strictEqual(await service.getAll(), failure);
  }
});

test("SDK metadata and flow aliases are bound once to the build edition", () => {
  const bound = bindSources({
    vm_adoptasettings: { primaryKey: "vm_adoptasettingid", dataSourceType: "Dataverse", apis: {} },
    adoptaschedulecommunication: { primaryKey: "", dataSourceType: "Connector", apis: {} },
  }, getEdition("en"));
  assert.deepEqual(Object.keys(bound), ["vm_adoptaensettings", "adoptaenschedulecommunication"]);
  assert.equal(bound.vm_adoptaensettings.primaryKey, "vm_adoptaensettingid");
});

test("scheduled card language is fixed by edition even for conflicting or absent record language", () => {
  for (const [edition, profile] of Object.entries(profiles)) {
    const file = filesUnder(path.join(root, profile.source, "Workflows"))
      .find((file) => file.endsWith(".json") && path.basename(file).startsWith(`${profile.flowPrefix}ScheduleCommunication-`));
    const nodes = walk(JSON.parse(fs.readFileSync(file, "utf8")));
    const find = (name) => nodes.find((node) => Object.hasOwn(node, name))[name];
    assert.equal(find("Mark_scheduled").inputs.parameters["item/vm_language"], edition);
    for (const language of ["it", "en", null, " EN "]) {
      const context = { body: { Get_communication: {
        [nativeName("vm_adoptacommunicationid", getEdition(edition))]: id,
        vm_title: "Original", vm_body: "Message", vm_cardmessage: "", vm_language: language,
      } }, outputs: {} };
      for (const action of ["Card_texts", "Card_reference", "Build_card"]) {
        context.outputs[action] = evaluateWorkflow(find(action).inputs, context);
      }
      const buttons = context.outputs.Build_card.body.find((item) => item.type === "ActionSet").actions;
      assert.equal(buttons[0].title, edition === "en" ? "Tell me more" : "Dimmi di più");
      assert.equal(buttons[0].data.msteams.text, `Adopta.Communication.v2|${edition}|${id}`);
    }
  }
});

test("each dispatcher, delivery and settings flow references only its own components", () => {
  for (const profile of Object.values(profiles)) {
    const flows = filesUnder(path.join(root, profile.source, "Workflows")).filter((name) => name.endsWith(".json"));
    const deliveryFile = flows.find((name) => path.basename(name).startsWith(`${profile.flowPrefix}DeliverCommunication-`));
    const deliveryId = path.basename(deliveryFile).match(guidPattern)[0].toLowerCase();
    const docs = flows.map((name) => JSON.parse(fs.readFileSync(name, "utf8")));
    const nodes = docs.flatMap(walk);
    assert.equal(nodes.find((node) => node.workflowReferenceName)?.workflowReferenceName, deliveryId);
    assert.equal(nodes.find((node) => node["body/bot"])?.["body/bot"], profile.agent);
    const source = JSON.stringify(docs);
    assert.ok(source.includes(`${profile.agent}DataverseUrl`));
    assert.ok(source.includes(`${profile.agent}CoachKnowledgeUrl`));
    assert.equal(nodes.some((node) => typeof node.entityName === "string" && !node.entityName.startsWith(profile.prefix) &&
      !["environmentvariabledefinitions", "environmentvariablevalues", "systemusers"].includes(node.entityName)), false);
  }
});

test("both pipelines retain authenticated queries, type declarations, a single final card and fixed-language prompts", () => {
  const requests = [];
  for (const [edition, profile] of Object.entries(profiles)) {
    const lookup = readComponent(`${profile.agent}.action.ResolveCommunication`, edition);
    const explanation = readComponent(`${profile.agent}.topic.SpiegaComunicazione`, edition);
    const resolver = readComponent(`${profile.agent}.topic.RisolviComunicazione`, edition);
    assert.equal(Object.hasOwn(resolver.inputType.properties, "English"), false);
    assert.equal(walk(explanation).filter((node) => node.kind === "SendActivity").length, 1);
    const query = lookup.inputs.find((input) => input.propertyName === "fetchXml").value;
    const card = walk(explanation).find((node) => node.id === "finalCard").activity.attachments[0].cardContent;
    requests.push({
      name: `${edition}/query`, expression: query,
      variables: {
        System: { User: { IsLoggedIn: true, PrincipalName: "person@example.test" } },
        Global: { CommunicationLookupTitle: "", CommunicationLookupLink: "", CommunicationLookupMode: "id",
          CommunicationLookupId: id, CommunicationLookupPage: 1, CommunicationLookupMatchLink: false },
      },
    }, {
      name: `${edition}/card`, expression: card,
      variables: { Global: { CommunicationSelectedTitle: "Original", CommunicationSelectedBody: "Body",
        CommunicationSelectedLink: "https://learn.microsoft.com", CommunicationLastAnswer: "Answer",
        CommunicationEnglish: edition !== "en" }, Topic: { SafeLink: true, Sources: "Source" } },
    });
    for (const bot of [profile.agent, profile.coach]) {
      const instructions = readComponent(`${bot}.gpt.default`, edition).instructions;
      assert.match(instructions, edition === "en" ? /Always respond only in English/i : /sempre e soltanto in italiano/i);
    }
  }
  const results = runSdk({ cases: requests }).results;
  for (let index = 0; index < results.length; index += 2) {
    const edition = index === 0 ? "it" : "en";
    assert.equal(results[index].success, true);
    assert.ok(results[index].value.includes(`name='vm_adopta${edition === "en" ? "en" : ""}delivery'`));
    assert.ok(results[index].value.includes("value='person@example.test'"));
    assert.ok(results[index].value.includes("value='100000002'"));
    const card = results[index + 1];
    assert.equal(card.success, true);
    assert.equal(card.value.actions[0].title, edition === "en" ? "Open the content" : "Apri il contenuto");
  }
});

test("profile initialization preserves the typed authenticated, branding and classification contracts without language state", () => {
  for (const [edition, profile] of Object.entries(profiles)) {
    const initialization = readComponent(`${profile.agent}.topic.InizializzazioneProfilo`, edition);
    const branding = readComponent(`${profile.agent}.action.MicrosoftDataverse-GetBranding`, edition);
    const classify = walk(initialization).find((node) => node.kind === "InvokeAIBuilderModelAction");
    const customizations = fs.readFileSync(path.join(root, profile.source, "Other", "Customizations.xml"), "utf8");
    assert.ok(customizations.includes(`<msdyn_aimodelid>{${classify.aIModelId}}</msdyn_aimodelid>`));
    const schema = {
      kind: "Record",
      properties: {
        System: { kind: "Record", properties: {
          User: { kind: "Record", properties: { IsLoggedIn: { type: "Boolean" }, PrincipalName: { type: "String" } } },
          Bot: { kind: "Record", properties: { Name: { type: "String" } } },
        } },
        Global: { kind: "Record", properties: { ProfileInitialized: { type: "Boolean" } } },
        Topic: { kind: "Record", properties: {
          BrandingRows: branding.action.dynamicOutputSchema.properties.value,
          ClassifyDepOutput: { kind: "Record", properties: { text: { type: "String" } } },
        } },
      },
    };
    const checks = [initialization.beginDialog.condition,
      walk(initialization).find((node) => node.id === "EW7BxL").value,
      walk(initialization).find((node) => node.id === "fnSZWG").value]
      .map((expression, index) => ({ name: `${edition}/profile/${index}`, expression, schema }));
    for (const result of runSdk({ typeChecks: checks }).typeChecks) {
      assert.equal(result.success, true, `${result.name}: ${result.errors.join("; ")}`);
    }
    assert.equal(walk(initialization).some((node) => node.id === "tTj8Gc"), false);
  }
});

test("the parent waiting component is retired without removing its identity or changing communication-card notices", () => {
  for (const [edition, profile] of Object.entries(profiles)) {
    const retired = readComponent(`${profile.agent}.topic.MessaggioAttesa`, edition);
    const metadata = fs.readFileSync(path.join(root, profile.source, "botcomponents",
      `${profile.agent}.topic.MessaggioAttesa`, "botcomponent.xml"), "utf8");
    assert.match(metadata, /<statecode>1<\/statecode>/);
    assert.match(metadata, /<statuscode>2<\/statuscode>/);
    assert.equal(retired.beginDialog.kind, "OnRedirect");
    assert.equal(walk(retired).some((node) => node.kind === "SendActivity"), false);
    assert.equal(Object.hasOwn(retired.beginDialog, "condition"), false);
    const card = readComponent(`${profile.agent}.topic.DimmiDiPiu`, edition);
    const notice = walk(card).find((node) => node.id === "waiting");
    assert.equal(notice.kind, "SendActivity");
    assert.equal(notice.activity, edition === "en"
      ? "One moment, I'm preparing your answer..."
      : "Un attimo, sto preparando la risposta...");
  }
});

test("the Coach waiting topic gates readiness and query, and deduplicates the actual activity rather than message length", () => {
  const cases = [];
  for (const [edition, profile] of Object.entries(profiles)) {
    const topic = readComponent(`${profile.coach}.topic.MessaggioAttesa`, edition);
    const actions = walk(topic);
    const predicate = actions.find((node) => node.id === "shouldNotify").condition;
    const remember = actions.find((node) => node.id === "rememberActivity").value;
    assert.equal(topic.beginDialog.kind, "OnRecognizedIntent");
    assert.ok(topic.inputs.every((input) => input.shouldPromptUser === false));
    assert.equal(topic.inputs.find((input) => input.propertyName === "ReadyToResearch").defaultValue, "=false");
    assert.equal(topic.outputType.properties.WaitingMessageSent.type, "Boolean");
    assert.equal(topic.beginDialog.actions[0].value, "=false");
    const branch = actions.find((node) => node.id === "shouldNotify").actions;
    assert.ok(branch.findIndex((node) => node.id === "rememberActivity") > branch.findIndex((node) => node.id === "waiting"));
    assert.equal(branch.at(-1).variable, "Topic.WaitingMessageSent");
    assert.equal(branch.at(-1).value, "=true");
    const messages = actions.filter((node) => node.kind === "SendActivity" && typeof node.activity === "string");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].activity, edition === "en"
      ? "One moment, I'm preparing your answer..."
      : "Un attimo, sto preparando la risposta...");
    assert.equal(actions.some((node) => ["Question", "CancelAllDialogs", "SearchAndSummarizeContent"].includes(node.kind)), false);
    assert.equal(topic.beginDialog.actions.at(-1).kind, "EndDialog");
    for (const [name, ready, query, activityId, previousId, expected] of [
      ["clarification, even with a long message", false, "Suggest a use case for my role", "turn1", "", false],
      ["immediate answer", false, "", "turn1", "", false],
      ["missing query", true, "", "turn1", "", false],
      ["whitespace query", true, "  ", "turn1", "", false],
      ["actual search, even a one-word query", true, "Copilot", "turn1", "", true],
      ["same activity repeated", true, "Copilot", "turn1", "turn1", false],
      ["another query in the same activity", true, "Excel", "turn1", "turn1", false],
      ["new activity", true, "Copilot", "turn2", "turn1", true],
      ["no reliable activity identity", true, "Copilot", "", "", false],
      ["initial blank state", true, "Copilot", "turn1", null, true],
    ]) {
      cases.push({
        name: `${edition}/${name}`, expression: predicate,
        variables: {
          Topic: { ReadyToResearch: ready, ResearchQuery: query },
          Global: { CoachWaitMessageId: previousId },
          System: { Recognizer: { TriggeringMessage: { Id: activityId } } },
        },
        expected,
      });
    }
    cases.push({
      name: `${edition}/remember actual activity`, expression: remember,
      variables: { System: { Recognizer: { TriggeringMessage: { Id: "turn2" } } } }, expected: "turn2",
    });
  }
  const results = runSdk({ cases }).results;
  for (let index = 0; index < results.length; index++) {
    assert.equal(results[index].success, true, `${results[index].name}: ${results[index].error}`);
    assert.equal(results[index].value, cases[index].expected, results[index].name);
  }
});

test("Coach fallback research invokes the same waiting topic immediately before searching without a second native notice", () => {
  for (const [edition, profile] of Object.entries(profiles)) {
    const search = readComponent(`${profile.coach}.topic.Search`, edition);
    const [prepare, research] = search.beginDialog.actions;
    assert.equal(search.beginDialog.kind, "OnUnknownIntent");
    assert.equal(prepare.kind, "BeginDialog");
    assert.equal(prepare.dialog, `${profile.coach}.topic.MessaggioAttesa`);
    assert.deepEqual(prepare.input.binding, { ReadyToResearch: "=true", ResearchQuery: "=System.Activity.Text" });
    assert.equal(research.kind, "SearchAndSummarizeContent");
    assert.equal(research.userInput, "=System.Activity.Text");
    assert.equal(research.latencyMessageSettings.allowLatencyMessage, false);
  }
});

test("coaching clarifications and delivered-message feedback have a single owner without fictitious connected-agent output bindings", () => {
  for (const [edition, profile] of Object.entries(profiles)) {
    const parent = readComponent(`${profile.agent}.gpt.default`, edition).instructions;
    const coach = readComponent(`${profile.coach}.gpt.default`, edition).instructions;
    const delegation = readComponent(`${profile.agent}.InvokeConnectedAgentTaskAction.Adopta-AdoptionCoach`, edition);
    assert.match(parent, edition === "en" ? /only the Coach collects role/i : /solo il Coach raccoglie ruolo/i);
    for (const field of ["userMessageSent", "awaitingUser", "interactionSummary", "openQuestions"]) {
      assert.ok(parent.includes(field));
      assert.ok(coach.includes(field));
      assert.ok(delegation.modelDescription.includes(field));
    }
    assert.ok(parent.includes("userMessageSent=true"));
    assert.ok(parent.includes("awaitingUser=true"));
    assert.ok(coach.includes("userMessageSent=true"));
    assert.ok(coach.includes("awaitingUser=true"));
    assert.ok(coach.includes("ReadyToResearch=true"));
    assert.ok(coach.includes("WaitingMessageSent=false"));
    assert.equal(delegation.action.historyType.kind, "NoHistory");
    assert.equal(Object.hasOwn(delegation, "outputs"), false);
    assert.equal(Object.hasOwn(delegation.action, "outputType"), false);
  }
});
