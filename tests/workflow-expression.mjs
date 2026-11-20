import assert from "node:assert/strict";

export function evaluateWorkflow(expression, context) {
  if (typeof expression !== "string") return structuredClone(expression);
  let position = expression.startsWith("@") ? 1 : 0;
  const skip = () => { while (/\s/.test(expression[position] ?? "") && position < expression.length) position++; };
  function readString() {
    assert.equal(expression[position++], "'");
    let value = "";
    while (position < expression.length) {
      const character = expression[position++];
      if (character !== "'") value += character;
      else if (expression[position] === "'") { value += "'"; position++; }
      else return value;
    }
    throw new Error("Unterminated workflow string");
  }
  const functions = {
    body: (name) => context.body[name],
    outputs: (name) => context.outputs[name],
    json: JSON.parse,
    string: (value) => typeof value === "string" ? value : JSON.stringify(value),
    coalesce: (...values) => values.find((value) => value !== null && value !== undefined),
    trim: (value) => value.trim(),
    toLower: (value) => value.toLowerCase(),
    equals: (a, b) => a === b,
    empty: (value) => value === null || value === undefined || value.length === 0,
    if: (condition, yes, no) => condition ? yes : no,
    concat: (...values) => values.join(""),
    createArray: (...values) => values,
    union: (...arrays) => arrays.flat().filter((value, index, all) =>
      all.findIndex((other) => JSON.stringify(other) === JSON.stringify(value)) === index),
    addProperty: (record, name, value) => ({ ...record, [name]: value }),
    setProperty: (record, name, value) => ({ ...record, [name]: value }),
    base64: (value) => Buffer.from(value).toString("base64"),
    length: (value) => value.length,
    lessOrEquals: (a, b) => a <= b,
  };
  function readValue() {
    skip();
    let result;
    if (expression[position] === "'") result = readString();
    else {
      const match = /^[a-zA-Z0-9_]+/.exec(expression.slice(position));
      assert.ok(match, `Expected value at ${position}: ${expression.slice(position, position + 40)}`);
      position += match[0].length;
      skip();
      if (expression[position] === "(") {
        position++;
        const args = [];
        skip();
        while (expression[position] !== ")") {
          args.push(readValue());
          skip();
          if (expression[position] !== ",") break;
          position++;
        }
        assert.equal(expression[position++], ")", `Unbalanced function ${match[0]}`);
        assert.ok(functions[match[0]], `Unsupported workflow function ${match[0]}`);
        result = functions[match[0]](...args);
      } else result = Number(match[0]);
    }
    skip();
    while (expression.slice(position, position + 2) === "?[") {
      position += 2;
      const property = readString();
      assert.equal(expression[position++], "]");
      result = result?.[property];
      skip();
    }
    return result;
  }
  const result = readValue();
  skip();
  assert.equal(position, expression.length, `Unexpected workflow suffix: ${expression.slice(position)}`);
  return result;
}
