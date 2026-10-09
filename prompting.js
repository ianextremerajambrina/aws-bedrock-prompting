import { fileURLToPath } from "node:url";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";


// Send a prompt to Amazon Bedrock using the Converse API.

const AWS_REGION = "eu-central-1";

// TODO: Send AWS_REGION, MODEL_ID, and PROMPT as command line arguments instead of hardcoding them in the script.
// TODO: Also include the ability of having default values for these arguments if they are not provided by the user (except prompt, which is required)

// Set the model ID, e.g., Claude Haiku.
// The "global." prefix enables cross-region inference, allowing the request
// to be routed to the nearest available region for the specified model.
const MODEL_ID = "nvidia.nemotron-super-3-120b";
const PROMPT = process.argv[2]; // Same functionality as Python sys.argv. argv[2] includes the prompt passed as a command line argument with "<PROMPT>".

const hello = async () => {

  console.log(`Model: ${MODEL_ID}\n`);

  // Create a new Bedrock Runtime client instance.
  const client = new BedrockRuntimeClient({ region: AWS_REGION });

  // Create the command with the model ID, the user message, and a basic configuration.

  // TODO: Adjust the command parameters to customize the model's behavior, such as temperature, max tokens, etc.
  // To perform coding: Low Top P, Low Temperature

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      /*{
        role: "system",
        content: [{ text: "You are a coding assistant. Your work includes helping users with code-related questions and tasks. Be as brief as possible and align the code with the user's intent and clean code practices. Do not extend yourself unnecessarily and avoid ambiguous responses. If needed, ask for additional context." }],
      }, */
      {
        role: "user",
        content: [{ text: PROMPT }],
      },
    ],
    temperature: 0.4,
    top_p: 0.2
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
        `ERROR: Can't invoke '${MODEL_ID}'. Reason: ${caught.message}`,
      );
      throw caught;
    }
    throw caught;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await hello();
}