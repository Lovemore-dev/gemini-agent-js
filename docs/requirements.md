# Requirements: JavaScript Gemini Agent (Reason-Act-Observe)

## 1. Purpose

A console-based AI agent written in plain Node.js that answers user questions by combining the Gemini LLM with tools the agent can call. The model decides when a tool is needed; the program executes the tool, returns the result to the model, and repeats until the model produces a final answer.

The project is a hands-on demonstration of GenAI application development: LLM API integration, function calling, agent design, error handling, and testing. It is built and maintained by a single developer.

## 2. Scope

### 2.1 What the agent does

- Accepts a question typed in the console.
- Sends it to Gemini together with declarations of the available tools.
- Executes any tool the model requests and feeds the result back.
- Prints the final answer, and optionally a trace of each step.

### 2.2 Example interactions

| # | User input | Expected behaviour |
|---|---|---|
| 1 | "What is 17% of 2340?" | Model calls the calculator tool with `2340 * 0.17`, receives `397.8`, answers correctly. |
| 2 | "What time is it right now?" | Model calls the clock tool, answers using the returned time. |
| 3 | "What is 15% of 800, and what day of the week is it today?" | Model calls both tools (in one or more steps) and combines the results in one answer. |
| 4 | "What is the capital of France?" | Model answers directly without calling any tool. |

### 2.3 Non-goals (out of scope for the first version)

- Graphical or web user interface (may be added later as an Express endpoint).
- Memory across sessions or persistent storage.
- RAG / vector search (planned as an optional extension tool).
- Authentication, multi-user support, or deployment.
- Streaming responses.
- Use of agent frameworks (LangChain.js and similar may be added later as a comparison).

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | The system shall read the user's question from the console and start an agent run. |
| FR2 | The system shall send the conversation history and the tool declarations to the Gemini API on every model call. |
| FR3 | The system shall distinguish between a model response that contains a function call and one that contains final text. |
| FR4 | When the model requests a known tool, the system shall execute it with the arguments supplied by the model. |
| FR5 | The system shall append the model's function call and the tool's result to the conversation history and call the model again. |
| FR6 | When the model returns final text, the system shall stop the loop and display that text to the user. |
| FR7 | The system shall provide at least two tools: a calculator (arithmetic expressions) and a clock (current date and time). |
| FR8 | Each tool shall expose a name, a description, a parameter schema, and an execute function, so new tools can be added without changing the agent loop. |
| FR9 | The system shall print a trace of each step (model request, tool call with arguments, tool result, final answer) when trace mode is enabled. |
| FR10 | The system shall let the user ask multiple questions in one session until they type an exit command. |

## 4. Non-Functional Requirements

### 4.1 Reliability

- NFR1: On HTTP 429 or 503 from Gemini, the client shall retry with exponential backoff up to a fixed maximum number of attempts.
- NFR2: On any other API error (for example 400 or 401), the client shall fail immediately with a clear error message and not retry.
- NFR3: If a tool throws an error, the system shall catch it and return the error message to the model as the tool result instead of crashing.

### 4.2 Safety and guardrails

- NFR4: The agent loop shall stop after a configurable maximum number of iterations (default 5) and return a safe message explaining that the task could not be completed.
- NFR5: If the model requests a tool that does not exist, the system shall return an "unknown tool" error to the model and continue the loop, without crashing.
- NFR6: The calculator shall not use `eval()` or `new Function()`. It shall parse and evaluate only numbers, `+ - * / ( )`, and shall reject any other input.

### 4.3 Security

- NFR7: The API key shall be stored in a `.env` file, loaded at runtime, never hard-coded, and excluded from version control through `.gitignore`.

### 4.4 Observability

- NFR8: Every run shall be traceable: the developer shall be able to see which tools were called, with what arguments, and what they returned.

### 4.5 Maintainability and testability

- NFR9: The Gemini client, tools, and agent loop shall be separate modules with single responsibilities.
- NFR10: The agent loop shall receive the LLM client as a dependency, so it can be tested with a fake client without calling the real API.
- NFR11: Model name and iteration cap shall be configurable (environment variable or constant), not scattered through the code.

## 5. Constraints and Assumptions

- Runtime: Node.js v24 with ES modules (`"type": "module"`).
- Dependencies: none for the core (built-in `fetch`, `node:readline`, `node:test`). Environment variables loaded with `node --env-file=.env`.
- LLM: Gemini API on the Google AI Studio free tier, so rate limits apply (hence retry/backoff).
- Default model: `gemini-3.5-flash-lite`, overridable through an environment variable.
- Single developer, console only, no persistent data.
- Assumption: the Gemini function-calling format (`functionDeclarations`, `functionCall`, `functionResponse`) behaves as documented in the official API reference.

## 6. Acceptance Criteria

| ID | Scenario | Expected result |
|---|---|---|
| AC1 | Ask "What is 17% of 2340?" | Calculator is called; final answer contains `397.8`. |
| AC2 | Ask "What time is it right now?" | Clock tool is called; final answer reflects the tool result. |
| AC3 | Ask "What is the capital of France?" | No tool is called; answer contains "Paris". |
| AC4 | Fake client always requests a tool call, never gives final text | Loop stops at the iteration cap and returns the safe message. |
| AC5 | Fake client requests a tool named `does_not_exist` | Agent sends back an unknown-tool error and continues without crashing. |
| AC6 | Calculator receives `2 + abc` or `process.exit()` | Calculator rejects the input with an error; nothing is executed. |
| AC7 | Calculator receives `(2 + 3) * 4` | Returns `20`. |
| AC8 | Gemini returns 429 twice, then 200 | Client retries with backoff and returns the successful response. |
| AC9 | Gemini returns 401 | Client fails immediately with a clear error and does not retry. |
| AC10 | Trace mode on | Console shows each tool call, its arguments, and its result before the final answer. |

## 7. Planned Extensions (not required for v1)

1. Third tool using RAG: chunk a small document set, embed it, retrieve by cosine similarity.
2. Express endpoint (`POST /ask`) wrapping the agent.
3. LangChain.js version for comparison with the plain implementation.