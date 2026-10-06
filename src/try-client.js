// Import .env file
import "dotenv/config";
// A throwaway script to check that the clients works. we delete it later

import { createGeminiClient } from "./geminiClient.js";

// Build a client. The values come from the .env file
// "??" means: use the right side only if the left side is missing.
const client = createGeminiClient ({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
});

// One user message in the shape Gemini expects:
// a role ("user" or "model") and a list of parts (here, just text).
const reply = await client.generate([
    { role: "user", parts: [{ text: "Say hello in Italian" }]},
]);

//JSON.stringify(value, null, 2) prints the object with 2-space indentation,
//so it's easy to read.
console.log(JSON.stringify(reply, null, 2));