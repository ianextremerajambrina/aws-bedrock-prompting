# Refactoring Plan

## prompting.js
- **Argument parsing** is tightly coupled with command‑line logic. Extract into a dedicated `parseArguments` module and expose it for unit testing.
- **Configuration constants** (`DEFAULT_AWS_REGION`, `DEFAULT_MODEL_ID`, temperature/topP ranges) are scattered in the file. Centralise them in a `config.js` or environment‑based config.
- **Magic numbers** (e.g., temperature range 0–1, top‑p, top‑k defaults) should be represented with descriptive constants or enums.
- **Error handling** uses generic `Error`. Define custom CLI error types to differentiate parsing errors from runtime errors.
- **Console output** is interleaved with business logic. Introduce a lightweight logger service that can be swapped out for tests.
- **AWS client creation** is embedded in the script. Provide a factory function (`createBedrockClient`) so clients can be reused or mocked.

## list-foundation-models.js
- **Logging**: Extract a formatter helper function to construct the formatted model card string.
- **Filter active models**: Filter models by `modelLifecycle.status === "ACTIVE"` before displaying them (currently all models are displayed, then active count is logged).
- Optional: Make `listFoundationModels` purely functional by accepting `client` or options rather than catching errors and calling `process.exit(1)` directly.

## General Refactors
- **Shared client factory**: a small module that reads region from env or config and returns a configured `BedrockClient`/`BedrockRuntimeClient` instance.
- **Separation of concerns**: split each script into two parts – an entry‑point CLI layer (parsing args, logging) and a library layer exposing async functions for unit testing.
- **Documentation & typings**: add JSDoc comments or convert to TypeScript to improve maintainability.
- **Testing hooks**: by extracting pure logic into modules, tests can be written without invoking the real AWS services (mocking SDK calls).

---

These changes will make the codebase easier to test, extend, and maintain while keeping the current functionality intact.
