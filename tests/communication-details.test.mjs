import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { readComponent, root, runSdk, validateSolution, walk } from "../deploy/validate-solution.mjs";
import { evaluateWorkflow } from "./workflow-expression.mjs";

const cardTopic = readComponent("vm_Adopta.topic.DimmiDiPiu");
const chatTopic = readComponent("vm_Adopta.topic.ApprofondisciComunicazione");
const resolver = readComponent("vm_Adopta.topic.RisolviComunicazione");
const explanation = readComponent("vm_Adopta.topic.SpiegaComunicazione");
const lookup = readComponent("vm_Adopta.action.ResolveCommunication");
const action = (topic, id) => walk(topic).find((node) => node.id === id);
const idA = "12345678-1234-1234-1234-123456789abc";
const idB = "87654321-4321-4321-4321-cba987654321";
const baseGlobal = {
  UserLanguage: "it",
  CommunicationSelectedId: "",
  CommunicationLookupMode: "id",
  CommunicationLookupId: idA,
  CommunicationLookupTitle: "",
  CommunicationLookupLink: "",
  CommunicationLookupMatchLink: false,
  CommunicationLookupPage: 1,
};
const baseSystem = { User: { IsLoggedIn: true, PrincipalName: "person@example.test" }, Activity: { Text: "" } };
const cases = [];
function evaluate(name, expression, variables, check) {
  cases.push({ name, expression, variables, check });
}
function cardCase(name, text, expected) {
  const steps = cardTopic.beginDialog.actions.filter((node) => node.kind === "SetVariable");
  const topic = {};
  const variables = { Global: baseGlobal, System: { ...baseSystem, Activity: { Text: text } }, Topic: topic };
  for (const step of steps) {
    cases.push({
      name: `${name}/${step.id}`,
      expression: step.value,
      variables: structuredClone(variables),
      populate: step.variable.split(".")[1],
      sequence: name,
    });
  }
  cases.push({
    name,
    expression: action(cardTopic, "validCard").condition,
    variables: structuredClone(variables),
    sequence: name,
    check: (value) => assert.equal(value, expected, name),
  });
  if (expected) {
    const binding = action(cardTopic, "resolveCard").input.binding;
    cases.push({
      name: `${name}/resolver inputs`,
      expression: `={${Object.entries(binding).map(([key, value]) => `${key}: ${value.slice(1)}`).join(", ")}}`,
      variables: structuredClone(variables),
      sequence: name,
      check: (value) => {
        const versioned = text.startsWith("Adopta.Communication.v2|");
        assert.equal(value.Mode, versioned ? "id" : "title");
        assert.equal(value.English, text.includes("|en|") || text.startsWith("Tell me more"));
        assert.equal(value.MatchLink, !versioned);
        assert.equal(value.ConfirmLatest, false);
        if (versioned) assert.equal(value.CommunicationId, text.split("|")[2]);
        else {
          assert.equal(value.Title, "Excel");
          assert.equal(value.Link, text.includes("https://") ? "https://learn.microsoft.com/excel" : "");
        }
      },
    });
  }
}

test("solution JSON, XML, YAML, references and Microsoft SDK authoring syntax are valid", () => {
  const counts = validateSolution();
  assert.ok(counts.yaml >= 45);
  assert.ok(counts.xml >= 140);
});

test("new scheduled cards carry stable references and preserve localized labels and Ignore", () => {
  const flow = JSON.parse(fs.readFileSync(path.join(root, "src", "Workflows",
    "AdoptaScheduleCommunication-046919BC-1AE2-40FE-A68F-51000EBCC08E.json"), "utf8"));
  const nodes = walk(flow);
  const find = (name) => nodes.find((node) => Object.hasOwn(node, name))?.[name];
  for (const language of ["it", "en", null, " EN "]) {
    const record = {
      vm_adoptacommunicationid: idA,
      vm_title: 'Excel «test»: & <details> "quoted"',
      vm_body: "A message\nwith details",
      vm_link: null,
      vm_cardmessage: "Closing text",
      vm_language: language,
    };
    const context = { body: { Get_communication: record }, outputs: {} };
    for (const name of ["Card_texts", "Card_reference", "Build_card"]) {
      context.outputs[name] = evaluateWorkflow(find(name).inputs, context);
    }
    const card = context.outputs.Build_card;
    const buttons = card.body.find((item) => item.type === "ActionSet").actions;
    const english = language?.trim().toLowerCase() === "en";
    assert.equal(card.body[0].text, record.vm_title);
    assert.equal(card.body[1].text, record.vm_body);
    assert.equal(card.body.at(-1).text, record.vm_cardmessage);
    assert.equal(buttons[0].title, english ? "Tell me more" : "Dimmi di più");
    assert.equal(buttons[0].data.msteams.displayText, buttons[0].title);
    assert.equal(buttons[0].data.msteams.text, `Adopta.Communication.v2|${english ? "en" : "it"}|${idA}`);
    assert.equal(buttons[1].title, english ? "Ignore" : "Ignora");
    assert.ok(buttons[1].data.msteams.text.includes(record.vm_title));
    assert.deepEqual(find("Build_card").runAfter, { Card_reference: ["Succeeded"] });
    context.outputs.Build_card = card;
    assert.equal(evaluateWorkflow(find("Check_card_size").expression, context), true);
    record.vm_body = "x".repeat(30000);
    context.outputs.Build_card = evaluateWorkflow(find("Build_card").inputs, context);
    assert.equal(evaluateWorkflow(find("Check_card_size").expression, context), false);
  }
});

test("card and chat converge on one resolver and one explanation, including missing sources", () => {
  assert.equal(action(cardTopic, "resolveCard").dialog, "vm_Adopta.topic.RisolviComunicazione");
  assert.equal(action(chatTopic, "resolveChat").dialog, "vm_Adopta.topic.RisolviComunicazione");
  assert.equal(action(resolver, "explain").dialog, "vm_Adopta.topic.SpiegaComunicazione");
  assert.equal(walk(explanation).filter((node) => node.kind === "SendActivity").length, 1);
  assert.equal(walk(explanation).filter((node) => node.kind === "SearchAndSummarizeContent").length, 1);
  assert.equal(action(explanation, "searchCommunication").autoSend, false);
  assert.equal(action(explanation, "searchCommunication").applyModelKnowledgeSetting, false);
  assert.equal(lookup.triggerCondition, false);
  assert.equal(cardTopic.beginDialog.actions.at(-1).kind, "CancelAllDialogs");
  assert.equal(chatTopic.beginDialog.actions.at(-1).kind, "CancelAllDialogs");
});

cardCase("new Italian card", `Adopta.Communication.v2|it|${idA}`, true);
cardCase("new English card", `Adopta.Communication.v2|en|${idB}`, true);
cardCase("bad GUID", "Adopta.Communication.v2|it|not-a-guid", false);
cardCase("extra payload", `Adopta.Communication.v2|it|${idA}|injected`, false);
cardCase("missing payload", "Adopta.Communication.v2|", false);
cardCase("unsupported card language", `Adopta.Communication.v2|fr|${idA}`, false);
cardCase("legacy Italian link", "Dimmi di più sulla comunicazione «Excel»: https://learn.microsoft.com/excel", true);
cardCase("legacy English no link", "Tell me more about the communication «Excel»", true);
cardCase("legacy empty title", "Dimmi di più sulla comunicazione «»", false);

const fetchExpression = lookup.inputs.find((input) => input.propertyName === "fetchXml").value;
for (const mode of ["id", "title", "latest", "injected"]) {
  evaluate(`authenticated query/${mode}`, fetchExpression, {
    System: baseSystem, Global: { ...baseGlobal, CommunicationLookupMode: mode,
      CommunicationLookupTitle: "Excel", CommunicationLookupLink: "https://learn.microsoft.com/excel",
      CommunicationLookupMatchLink: true },
  }, (query) => {
    assert.ok(query.includes("attribute='vm_recipientupn' operator='eq' value='person@example.test'"));
    assert.ok(query.includes("attribute='vm_deliverystatus' operator='eq' value='100000002'"));
    if (mode === "id") assert.ok(query.includes(`attribute='vm_adoptacommunicationid' operator='eq' value='${idA}'`));
    if (mode === "title") assert.ok(query.includes("attribute='vm_title' operator='eq' value='Excel'"));
    if (mode === "title") assert.ok(query.startsWith("<fetch count='10' page='1'>"));
    if (mode === "latest") assert.ok(query.startsWith("<fetch top='1'>"));
    if (mode === "injected") assert.ok(query.includes("attribute='vm_adoptacommunicationid' operator='null'"));
  });
}
evaluate("no authenticated identity returns no data", fetchExpression, {
  System: { ...baseSystem, User: { IsLoggedIn: false, PrincipalName: "" } }, Global: baseGlobal,
}, (query) => assert.ok(query.includes("attribute='vm_adoptadeliveryid' operator='null'")));
evaluate("GUID query injection fails closed", fetchExpression, {
  System: baseSystem, Global: { ...baseGlobal, CommunicationLookupId: `${idA}'/><filter/>` },
}, (query) => {
  assert.ok(query.includes("attribute='vm_adoptacommunicationid' operator='null'"));
  assert.ok(!query.includes("<filter/>"));
});
evaluate("all XML metacharacters are escaped", fetchExpression, {
  System: { ...baseSystem, User: { IsLoggedIn: true, PrincipalName: 'a&<b>\'"@example.test' } },
  Global: { ...baseGlobal, CommunicationLookupMode: "title", CommunicationLookupTitle: 'A & <B> "\'',
    CommunicationLookupLink: "https://example.test/?x=1&y='", CommunicationLookupMatchLink: true },
}, (query) => {
  assert.ok(query.includes("a&amp;&lt;b&gt;&apos;&quot;@example.test"));
  assert.ok(query.includes("A &amp; &lt;B&gt; &quot;&apos;"));
  assert.ok(query.includes("?x=1&amp;y=&apos;"));
});
evaluate("legacy card without link matches empty archive URL", fetchExpression, {
  System: baseSystem, Global: { ...baseGlobal, CommunicationLookupMode: "title",
    CommunicationLookupTitle: "Excel", CommunicationLookupMatchLink: true },
}, (query) => assert.ok(query.includes("<condition attribute='vm_link' operator='null'/>")));

for (const [selection, title, priorId, expected] of [
  ["latest", "", idA, "latest"],
  ["selected", "", idA, "id"],
  ["unspecified", "", idA, "id"],
  ["unspecified", "", "", "latest"],
  ["title", "Excel", idA, "title"],
  ["title", "", idA, "title"],
  ["unspecified", "Different title", idA, "title"],
]) {
  evaluate(`chat selection/${selection}/${title}/${priorId}`, action(chatTopic, "selectionMode").value, {
    Topic: { Selection: selection, Title: title },
    Global: { ...baseGlobal, CommunicationSelectedId: priorId },
  }, (value) => assert.equal(value, expected));
}
for (const [link, expected] of [
  ["https://learn.microsoft.com/excel", true], ["HTTPS://learn.microsoft.com/excel", true],
  ["http://example.test", false], ["javascript:alert(1)", false], ["https://example.test/ bad", false],
  ["javascript:https://example.test", false], ["", false],
]) {
  evaluate(`open link/${link}`, action(explanation, "safeLink").value, {
    Global: { CommunicationSelectedLink: link },
  }, (value) => assert.equal(value, expected));
}

const row = { communicationid: idA, communicationtitle: "Excel", communicationbody: "Original text",
  communicationlink: "https://learn.microsoft.com/excel", vm_sentat: "2026-11-06T12:00:00Z" };
for (const [name, rows, expected] of [
  ["selected original", [row], true],
  ["never substitute another communication", [{ ...row, communicationid: idB }], false],
  ["not silently select among duplicates", [row, { ...row, communicationid: idB }], false],
]) {
  evaluate(name, action(resolver, "selectedRow").condition, {
    Topic: { Rows: rows, CandidateId: idA },
  }, (value) => assert.equal(value, expected, name));
}
evaluate("ambiguous legacy choices retain IDs and UTC dates", action(resolver, "choices").value, {
  Topic: { Rows: [row, { ...row, communicationid: idB }] },
}, (value) => {
  assert.equal(value.length, 2);
  assert.equal(value[0].CommunicationId, idA);
  assert.equal(value[1].CommunicationId, idB);
  assert.ok(value.every((choice) => choice.DisplayName.includes("UTC")));
});
evaluate("full pages offer navigation rather than discarding older matches", action(resolver, "pageIsFull").condition, {
  Topic: { Rows: Array.from({ length: 10 }, () => row) },
}, (value) => assert.equal(value, true));
evaluate("legacy lookup can reach subsequent pages", fetchExpression, {
  System: baseSystem, Global: { ...baseGlobal, CommunicationLookupMode: "title",
    CommunicationLookupTitle: "Excel", CommunicationLookupPage: 2 },
}, (query) => assert.ok(query.startsWith("<fetch count='10' page='2'>")));
evaluate("single result on a subsequent page still requires a choice", action(resolver, "multipleRows").condition, {
  Topic: { Rows: [row] }, Global: { CommunicationLookupPage: 2 },
}, (value) => assert.equal(value, true));

for (const safeLink of [true, false]) {
  const cardExpression = action(explanation, "finalCard").activity.attachments[0].cardContent;
  evaluate(`final card/${safeLink}`, cardExpression, {
    Global: { CommunicationEnglish: true, CommunicationSelectedTitle: 'Excel "quoted"',
      CommunicationLastAnswer: "Verified explanation", CommunicationSelectedBody: "Original body",
      CommunicationSelectedLink: safeLink ? " https://learn.microsoft.com/excel " : "" },
    Topic: { SafeLink: safeLink, Sources: safeLink ? "1. Microsoft Learn" : "" },
  }, (card) => {
    assert.equal(card.type, "AdaptiveCard");
    assert.equal(card.body[0].text, 'Excel "quoted"');
    assert.equal(card.body[1].text, "Verified explanation");
    assert.equal(card.actions.length, safeLink ? 1 : 0);
    if (safeLink) assert.equal(card.actions[0].url, "https://learn.microsoft.com/excel");
    else assert.equal(card.body.find((item) => item.text === "Original body").isVisible, true);
  });
}
const citation = { Id: "1", Name: "Microsoft Learn", Url: "https://learn.microsoft.com/excel" };
evaluate("answer requires retrieved citations", action(explanation, "hasVerifiedAnswer").value, {
  Topic: { Answer: { Text: { Content: "Verified", CitationSources: [citation] } } },
}, (value) => assert.equal(value, true));
evaluate("uncited generated content is not verified",
  `=With({Topic: {Answer: {Text: {Content: "Generated but uncited", CitationSources: Filter(Table({Id: "1", Name: "Learn", Url: "https://learn.microsoft.com"}), false)}}}}, ${action(explanation, "hasVerifiedAnswer").value.slice(1)})`,
  {}, (value) => assert.equal(value, false));
evaluate("insufficient evidence is explicit", action(explanation, "answerText").value, {
  Topic: { HasAnswer: false, Answer: { Text: { Content: "Unsupported content" } } },
  Global: { CommunicationEnglish: true },
}, (value) => {
  assert.ok(value.includes("could not find sufficient"));
  assert.ok(!value.includes("Unsupported content"));
});

test("Power Fx regression cases execute the actual authored formulas in the installed Microsoft engine", () => {
  const results = runSdk({ cases }).results;
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    assert.equal(result.success, true, `${result.name}: ${result.error}`);
    cases[index].check?.(result.value);
  }
});
