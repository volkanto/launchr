import { createInterface } from "node:readline/promises";
import { stdin as defaultInput, stdout as defaultOutput } from "node:process";
import { ValidationError } from "./errors.mjs";

export function createPrompter(options = {}) {
  const input = options.input ?? defaultInput;
  const output = options.output ?? defaultOutput;
  const rl = createInterface({ input, output });

  let isClosed = false;

  return {
    async ask(question) {
      if (isClosed) {
        throw new ValidationError("Prompt session is closed");
      }
      try {
        const answer = await rl.question(question);
        return answer.trim();
      } catch (error) {
        throw new ValidationError("Prompt interrupted");
      }
    },
    close() {
      if (!isClosed) {
        isClosed = true;
        rl.close();
      }
    },
    write(text) {
      output.write(text);
    },
  };
}

export async function promptYesNo(question, options = {}) {
  const prompter = createPrompter(options);
  try {
    while (true) {
      const answer = (await prompter.ask(`${question} `)).toLowerCase();
      if (answer === "yes" || answer === "y") {
        return true;
      }
      if (answer === "no" || answer === "n") {
        return false;
      }
      if (answer === "") {
        continue;
      }
      options.output?.write?.("Please answer yes or no.\n");
    }
  } finally {
    prompter.close();
  }
}
