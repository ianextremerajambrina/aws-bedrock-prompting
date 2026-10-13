import { fileURLToPath } from "node:url";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { config } from "dotenv";
config({ path: ".env/project_variables.env" });

// Send a prompt to Amazon Bedrock using the Converse API.

// We define the limits of each option, validating user input

// TODO: **Magic numbers** (e.g., temperature range 0–1, top‑p, top‑k defaults) should be represented with descriptive constants or enums.
const NUMERIC_OPTIONS = {
  "--temperature": { key: "temperature", min: 0, max: 1 },
  "--top-p": { key: "topP", min: 0, max: 1 },
  "--top-k": { key: "topK", min: 1, integer: true },
  "--max-tokens": { key: "maxTokens", min: 1, integer: true },
};

// TODO: **Configuration constants** (`DEFAULT_AWS_REGION`, `DEFAULT_MODEL_ID`, temperature/topP ranges) are scattered in the file. Centralise them in a `config.js` or environment‑based config.
// Defining global variables for the AWS region, model ID, prompt, and generation parameters.
//  These will be set based on command-line arguments or environment variables.

let awsRegion = process.env.DEFAULT_AWS_REGION;
let modelId = process.env.DEFAULT_MODEL_ID;
let temperature = Number(process.env.DEFAULT_TEMPERATURE);
let topP = Number(process.env.DEFAULT_TOP_P);
let topK = Number(process.env.DEFAULT_TOP_K);
let maxTokens = Number(process.env.DEFAULT_MAX_TOKENS);

// TODO: **Argument parsing** is tightly coupled with command‑line logic. Extract into a dedicated `parseArguments` module and expose it for unit testing.
const parseArguments = (args) => {
  
  const generation = {
    temperature,
    topP,
    topK,
    maxTokens
  };

  let index = 0;

  while (index < args.length) {
    const option = args[index];
    if (option === "--") {
      index += 1;
      break;
    }
    if (!option.startsWith("--")) break;

    // TODO: **Error handling** uses generic `Error`. Define custom CLI error types to differentiate parsing errors from runtime errors.
    if (
      option !== "--aws-region" &&
      option !== "--model-id" &&
      !NUMERIC_OPTIONS[option]
    ) {
      throw new Error(`Unknown option: ${option}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${option}`);
    }

    if (option === "--aws-region") awsRegion = value;
    else if (option === "--model-id") modelId = value;
    else {
      const { key, min, max, integer } = NUMERIC_OPTIONS[option];
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        number < min ||
        (max !== undefined && number > max) ||
        (integer && !Number.isInteger(number))
      ) {
        throw new Error(`Invalid value for ${option}: ${value}`);
      }
      generation[key] = number;
    }
    index += 2;
  }

  const prompt = args.slice(index).join(" ");
  if (!prompt.trim()) {
    throw new Error(
      `Prompt is required. Usage: node prompting.js [--aws-region REGION] [--model-id MODEL_ID] [--temperature 0-1] [--top-p 0-1] [--top-k INTEGER] [--max-tokens INTEGER] <prompt>\nIf no parameters specified, defaults will be used from the .env/project_variables.env file.`,
    );
  }

  return { awsRegion, modelId, prompt, generation };
};

const hello = async () => {
  let prompt;
  let generation;

  try {
    ({ awsRegion, modelId, prompt, generation } = parseArguments(
      process.argv.slice(2),
      console.log(process.argv.slice(2))
    ));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  // TODO: **Console output** is interleaved with business logic. Introduce a lightweight logger service that can be swapped out for tests.
  console.log(`Model: ${modelId}\n`);

  // Create a new Bedrock Runtime client instance.

  // TODO: **AWS client creation** is embedded in the script. Provide a factory function (`createBedrockClient`) so clients can be reused or mocked.
  const client = new BedrockRuntimeClient({ region: awsRegion });

  // Create the command with the model ID, the user message, and a basic configuration.

  const command = new ConverseCommand({
    modelId,
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      temperature: generation.temperature,
      topP: generation.topP,
      ...(generation.maxTokens === undefined
        ? {}
        : { maxTokens: generation.maxTokens }),
    },
    ...(generation.topK === undefined
      ? {}
      : { additionalModelRequestFields: { top_k: generation.topK } }),
  });

  // Send the command to the model and wait for the response.
  try {
    const response = await client.send(command);

    // Extract and print the response text.
    const responseText = response.output.message.content[0].text;
    console.log(`Response: ${responseText}`);
  } catch (caught) {
    if (
      caught instanceof Error &&
      caught.name === "BedrockRuntimeServiceException"
    ) {
      console.error(
        `ERROR: Can't invoke '${modelId}'. Reason: ${caught.message}`,
      );
      throw caught;
    }
    throw caught;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await hello();
}