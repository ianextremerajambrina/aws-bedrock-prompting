
import { fileURLToPath } from "node:url";

import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";

import dotenv from "dotenv";
dotenv.config({ path: './env/project_variables.env' });

const REGION = process.env.DEFAULT_AWS_REGION || 'eu-central-1';
const client = new BedrockClient({ region: REGION });

export const main = async () => {

  const data = await listFoundationModels();
  const models = data.modelSummaries;

  console.log("Listing the available Bedrock foundation models:");

  // TODO: **Logging** logic repeats for each model property. Create a formatter helper that builds the formatted string.
  for (const model of models) {
    console.log("=".repeat(42));
    console.log(` Model: ${model.modelId}\n\t${model.modelName}\n\t${model.modelArn}`);
    console.log("-".repeat(42));
  }

  // TODO: Only display active models (filter before printing)
  const active = models.filter(
    (m) => m.modelLifecycle.status === "ACTIVE",
  ).length;
  console.log(
    `There are ${active} active foundation models.`,
  );
};

async function listFoundationModels() {
  try {
    const models = new ListFoundationModelsCommand({});
    return await client.send(models);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

// Invoke main function if this file was run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

