# Task: Translate Ukrainian Example Sentences to English

You are an orchestrator agent. Your job is to translate ~6,370 Ukrainian sentences into English by launching sub-agents in parallel batches. The sentences have already been extracted into 80 small chunk files.

## Project Location

Working directory: `C:\Users\michael\Desktop\ukrainian typing game`

## What's Already Done

- `scripts/chunks/` contains 80 JSON files (`chunk-000.json` through `chunk-079.json`)
- Each chunk has ~80 sentence objects with this structure:

```json
{
  "file": "comprehensive-dictionary.json",
  "ukWord": "робити",
  "exIndex": 0,
  "ukSentence": "Що ти робиш?",
  "ruSentence": "Что ты делаешь?",
  "enWordMeaning": "to do/to make"
}
```

## Your Job

1. Create the output directory: `scripts/translated/`
2. Process all 80 chunks by launching sub-agents in parallel batches
3. After all chunks are translated, run the merge script

## How To Process Each Chunk

For each chunk file, launch a **background Task sub-agent** (subagent_type: "general-purpose") with the following instructions. Launch them in batches of **8 at a time** and wait for each batch to finish before starting the next.

Each sub-agent's prompt should be:

---

Read the file `scripts/chunks/chunk-NNN.json`. For each entry, translate the `ukSentence` field into natural English. The `enWordMeaning` field tells you what the vocabulary word means — use that as context.

Rules:
- Translate each Ukrainian sentence to natural, simple English
- Keep translations concise and natural — match the tone/complexity of the Ukrainian
- The Russian sentence (`ruSentence`) is provided as extra context if the Ukrainian is ambiguous

Write the result to `scripts/translated/chunk-NNN.json` using the Write tool. The output must be a JSON array with the SAME objects but with an added `enSentence` field:

```json
[
  {
    "file": "comprehensive-dictionary.json",
    "ukWord": "робити",
    "exIndex": 0,
    "ukSentence": "Що ти робиш?",
    "ruSentence": "Что ты делаешь?",
    "enWordMeaning": "to do/to make",
    "enSentence": "What are you doing?"
  }
]
```

Every entry MUST have an `enSentence`. Do NOT skip any entries. Write the full JSON array to the file.

---

## Step by Step

1. Run: `mkdir scripts/translated` (via Bash if it doesn't exist)
2. Launch sub-agents for chunks 000–007 in parallel (8 agents, all in background)
3. Wait for them to complete, verify each output file exists
4. Launch sub-agents for chunks 008–015 in parallel
5. Continue in batches of 8 until all 80 chunks are done (chunks 000–079, 10 batches)
6. After ALL chunks are translated, verify all 80 files exist in `scripts/translated/`
7. Run: `node scripts/merge-english.js` to merge translations back into the dictionary files
8. Report the final result

## Important Notes

- Use `run_in_background: true` for each sub-agent Task call so they run in parallel
- Launch 8 sub-agents per message, then use TaskOutput or Read to check when they're done
- If any chunk fails, just re-launch that specific chunk's agent
- Each sub-agent only handles ~80 sentences so it should never hit token limits
- Do NOT try to do the translations yourself in the main context — always delegate to sub-agents
- The sub-agents should use the Read tool to read their chunk, then Write tool to write the output
