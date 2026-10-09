import { fileURLToPath } from "node:url";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";


// Send a prompt to Amazon Bedrock using the Converse API.

const DEFAULT_AWS_REGION = "eu-central-1";
const DEFAULT_MODEL_ID = "nvidia.nemotron-super-3-120b";
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_TOP_P = 0.2;

const NUMERIC_OPTIONS = {
  "--temperature": { key: "temperature", min: 0, max: 1 },
  "--top-p": { key: "topP", min: 0, max: 1 },
  "--top-k": { key: "topK", min: 1, integer: true },
  "--max-tokens": { key: "maxTokens", min: 1, integer: true },
};

const parseArguments = (args) => {
  let awsRegion = DEFAULT_AWS_REGION;
  let modelId = DEFAULT_MODEL_ID;
  const generation = {
    temperature: DEFAULT_TEMPERATURE,
    topP: DEFAULT_TOP_P,
  };
  let index = 0;

  while (index < args.length) {
    const option = args[index];
    if (option === "--") {
      index += 1;
      break;
    }
    if (!option.startsWith("--")) break;

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
      "Prompt is required. Usage: node prompting.js [--aws-region REGION] [--model-id MODEL_ID] [--temperature 0-1] [--top-p 0-1] [--top-k INTEGER] [--max-tokens INTEGER] <prompt>",
    );
  }

  return { awsRegion, modelId, prompt, generation };
};

const hello = async () => {
  let awsRegion;
  let modelId;
  let prompt;
  let generation;

  try {
    ({ awsRegion, modelId, prompt, generation } = parseArguments(
      process.argv.slice(2),
    ));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Model: ${modelId}\n`);

  // Create a new Bedrock Runtime client instance.
  
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