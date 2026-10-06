// Every Gemini model lives under this base address.
// The model name and the action will be added later.
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Status codes that mean " temporary problem, try again".
// 400, 401, 404 are our mistakes, so retrying would never help.
const RETRYABLE_STATUSES = new Set([429, 503]);

// Pause for a number of milliseconds (used between retries).
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* A factory function: call it once with your settings and it gives you a client.
we pass apiKey and model in as arguments instead of reading process.env here,
so this file stays simple and easy to test.
*/
export function createGeminiClient({
    apiKey,
    model,
    maxRetries = 3, // extra tries after the first one
    baseDelayMs = 1000, // first wait in 1s, then 2s, 4s
}) {

    // One place for the wait-and-log logic, so we don't repeat it.
    // reason is a short label for the log, e.g "Got 503" or "Network error".
    async function waitBeforeRetry(attempt, reason) {
        // Wait longer each time: 1s, 2s, 4s (exponential backoff)
        const delay = baseDelayMs * 2 ** attempt;
        console.log(`${reason}, retrying in ${delay}ms...`);
        await sleep(delay);

    }

    //contents = the conversation so far, as an array of { role, parts }
    async function generate(contents) {

        //Final address, e.g. .../models/gemini-3.5-flash-lite:generateContent
        const url = `${BASE_URL}/${model}:generateContent`;

        // Try up to maxRetries + 1 times in total (first try + retries)
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            // Send the request fetch. fetch is built into Node, so no install is nneded.
            let response;

            try {
                response = await fetch(url, {
                    method: "POST", // we are sending data, so POST
                    headers: {
                        "content-type": "application/json", // our body is JSON,
                        "x-goog-api-key": apiKey, // How Gemini knows who we are.
                    },

                    // Turn the JavaScipt object into a JSON string for sending
                    body: JSON.stringify({ contents }),
                });
            } catch (networkError) {
                // fetch throws when there is no connection at all.
                // treat it as temporary: retry, unless we are out of tries
                if (attempt === maxRetries) {
                    throw new Error(`Network: ${networkError.message}`);
                }

                // call retry function
                await waitBeforeRetry(attempt, "Network error");
                continue; //jump straight to the attempt

            }


            // Read the reply body as plain text first. Unlike response.json(), this never
            // crashes on an empty or non-JSON body, so we can inspect what came back.
            const text = await response.text();

            // If the request failed (status outside 200-299), stop and show the details.
            // Without this check, we'd try to read a reply that isn't there.
            if (!response.ok) {
                // Is this a temporary problem, and do we still have tries left
                const canRetry = RETRYABLE_STATUSES.has(response.status);
                const isLastAttempt = attempt === maxRetries;

                // Permanent error, or out of tries: give up with the details.
                if (!canRetry || isLastAttempt) {
                    throw new Error(`Gemini ${response.status}: ${text || "(empty body)"}`);
                }

                await waitBeforeRetry(attempt, `Got ${response.status}`);

                // Skip the success code below and start the next attempt.
                continue;
            }

            // Success: now it's safe to turn the text into an object.
            const data = JSON.parse(text);

            // "?." means: if the thing on the left is missing, give back undefined
            // instead of crashing. So a missing "candidates" no longer throws a 
            // confusing "cannot read properties of undefined" error
            const content = data.candidates?.[0]?.content;

            // No content means Gemini answered "OK" but gave us nothing to use.
            if (!content) {
                // Gemini explains why in one of these two fields.
                // e.g. a safety block. "??" picks the first one that exists.
                const reason =
                    data.candidates?.[0]?.finishReason ??
                    data.promptFeedback?.blockReason ??
                    "unknown";

                throw new Error(`Gemini returned no content (reason: ${reason})`);
            }

            // Return the whole message object ({ role, parts }) unchanged.
            return content;
        }
    }

    return { generate };
}