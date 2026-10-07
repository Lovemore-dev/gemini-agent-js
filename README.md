# js-agent

A tool-calling AI agent built from scratch in plain Node.js with the Gemini API. No agent frameworks: every step of the Reason-Act-Observe loop is written by hand, so the whole design can be read and explained.

> **Status: work in progress.** The Gemini client is finished. Tools, the agent loop, and tests are being built next (see [Roadmap](#roadmap)).

## What it will do

The user types a question in the console. The agent sends it to Gemini together with a list of tools. If the model asks for a tool, the program runs it, sends the result back, and repeats until the model gives a final answer.

```
User question
     |
     v
+--------------------------+
|  Send history + tools    |<--------------------+
|  to Gemini               |                     |
+------------+-------------+                     |
             |                                   |
      function call?                             |
        /         \                              |
      yes          no                            |
       |            |                            |
       v            v                            |
 Run the tool   Return the final answer          |
       |                                         |
       +--- add the result to the history -------+
```

Example questions (from the [acceptance criteria](docs/requirements.md#6-acceptance-criteria)):

| Question | Expected behaviour |
|---|---|
| "What is 17% of 2340?" | Calls the calculator tool, answers `397.8` |
| "What time is it right now?" | Calls the clock tool |
| "What is the capital of France?" | Answers directly, no tool |

## Design decisions

- **Plain Node.js, no frameworks.** Built-in `fetch`, `node:readline`, and `node:test`. The only dependency is `dotenv`.
- **Modules receive what they need as arguments.** The Gemini client gets its key and model from the caller instead of reading `process.env` itself. This keeps modules simple and lets tests inject fakes.
- **Retry only temporary failures.** The client retries HTTP 429 and 503 with exponential backoff (1s, 2s, 4s) and on network errors. Other errors (400, 401, 404) fail immediately, because retrying cannot fix them.
- **Clear errors for bad responses.** An empty or blocked Gemini reply raises an error that includes the finish or block reason, instead of a vague crash.
- **Planned: guardrails in the agent loop.** An iteration cap, an "unknown tool" guard, and tool errors returned to the model instead of crashing the run.
- **Planned: a calculator without `eval()`.** Model output is untrusted input, so the calculator parses only numbers and `+ - * / ( )`.
- **Planned: testable by design.** The agent receives the LLM client as a dependency, so its logic can be tested with a fake client and no network calls.

The full list is in [docs/requirements.md](docs/requirements.md).

## Project structure

```
js-agent/
  docs/requirements.md    requirements and acceptance criteria
  src/
    geminiClient.js       Gemini API client (retries, validation)
    try-client.js         throwaway script to check the client works
  .env                    your API key (not committed)
```

Planned additions: `src/tools/` (calculator, clock), `src/toolRegistry.js`, `src/agent.js`, `src/index.js`, and a `test/` folder.

## Getting started

**Requirements:** Node.js 20 or newer and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/Lovemore-dev/js-agent.git
cd js-agent
npm install
```

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
```

Check that the client works:

```bash
node src/try-client.js
```

You should see a JSON message with `"role": "model"` and a short greeting. Model availability depends on your API key, so use a model name your key supports.

## Roadmap

- [x] Requirements and acceptance criteria
- [x] Gemini client with retry, backoff, and response validation
- [ ] Calculator tool (safe parser, no `eval`)
- [ ] Clock tool
- [ ] Tool registry
- [ ] Agent loop with iteration cap and error handling
- [ ] Step-by-step trace output
- [ ] Console interface
- [ ] Tests with a fake client (`node --test`)
- [ ] Optional: RAG tool, Express endpoint, LangChain.js comparison

## License

ISC
