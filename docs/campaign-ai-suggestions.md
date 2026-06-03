# Backend spec — Campaign AI suggestions (Gemini)

Two endpoints power the "Suggest with AI" buttons on the Launch/Edit Campaign form.
They must work **without a saved campaign id** (the campaign doesn't exist yet), so they
take the raw form inputs in the request body.

The frontend already calls these (see `src/lib/api.ts`):

```ts
suggestCampaignDescription({ name, categories[], brand_name?, keywords[]? }) -> { description }
suggestCampaignKeywords({ name, description?, categories[] })               -> { keywords[] }
```

## Conventions to match
- Mount under the same `/api` router and behind the **same auth middleware** as the other
  `/campaigns/*` routes.
- On failure, return a non-2xx with a JSON body `{ "error": "<message>" }`. The frontend
  surfaces `err.response.data.error`.
- Read the API key from env (e.g. `GEMINI_API_KEY`) and the model from `GEMINI_MODEL`
  (default `gemini-2.0-flash`).

---

## 1) `POST /campaigns/ai/suggest-description`

**Request**
```json
{
  "name": "Summer Skincare 2026",
  "categories": ["Lifestyle", "Luxury Lifestyle"],
  "brand_name": "Acme Beauty",          // optional
  "keywords": ["vegan", "organic"]       // optional
}
```

**Response**
```json
{ "description": "A 2–4 sentence campaign brief ..." }
```

**Validation:** require `name` (non-empty) and `categories` (≥1). Otherwise 400
`{ "error": "name and at least one category are required" }`.

**Prompt**
```
System / instruction:
You are a marketing strategist helping plan an influencer marketing campaign.
Write a concise, compelling campaign description (2–4 sentences, ~40–80 words).
Describe the campaign's goal, the vibe/positioning, and the kind of creators it targets.
Write in plain prose — no markdown, no headings, no bullet points, no preamble.
Return ONLY the description text.

User:
Campaign name: {name}
Brand: {brand_name | "N/A"}
Discovery categories: {categories joined ", "}
Keywords: {keywords joined ", " | "none"}
```

Trim the model output; strip surrounding quotes/markdown if present. Return as `description`.

---

## 2) `POST /campaigns/ai/suggest-keywords`

**Request**
```json
{
  "name": "Summer Skincare 2026",
  "description": "A campaign to ...",   // optional
  "categories": ["Lifestyle"]
}
```

**Response**
```json
{ "keywords": ["clean beauty", "spf", "summer glow", "self care", "dermatologist"] }
```

**Validation:** require `name` and `categories` (≥1).

**Prompt**
```
System / instruction:
You generate concise search keywords for discovering social-media creators for a campaign.
Return 6–10 short keywords or phrases (1–3 words each), lowercase, no hashtags, no numbering.
Respond with ONLY a JSON array of strings, e.g. ["keyword one","keyword two"].

User:
Campaign name: {name}
Discovery categories: {categories joined ", "}
Campaign description: {description | "N/A"}
```

Parse the response as JSON. If parsing fails, fall back to splitting on newlines/commas
and stripping bullets/quotes. De-dupe, drop empties, cap at ~10. Return as `keywords`.

---

## Reference implementation (Node / Express + @google/generative-ai)

> Adapt to your stack. If the backend is Python/FastAPI, the prompts above are identical —
> use `google-generativeai` and `genai.GenerativeModel(model).generate_content(prompt)`.

```js
// npm i @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function generateText(prompt) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// POST /campaigns/ai/suggest-description
router.post('/campaigns/ai/suggest-description', requireAuth, async (req, res) => {
  try {
    const { name, categories = [], brand_name, keywords = [] } = req.body || {};
    if (!name?.trim() || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'name and at least one category are required' });
    }
    const prompt =
`You are a marketing strategist helping plan an influencer marketing campaign.
Write a concise, compelling campaign description (2-4 sentences, ~40-80 words).
Describe the campaign's goal, the vibe/positioning, and the kind of creators it targets.
Write in plain prose - no markdown, no headings, no bullet points, no preamble.
Return ONLY the description text.

Campaign name: ${name}
Brand: ${brand_name || 'N/A'}
Discovery categories: ${categories.join(', ')}
Keywords: ${keywords.length ? keywords.join(', ') : 'none'}`;

    let description = await generateText(prompt);
    description = description.replace(/^["'`\s]+|["'`\s]+$/g, ''); // strip wrapping quotes/space
    return res.json({ description });
  } catch (err) {
    console.error('suggest-description failed', err);
    return res.status(500).json({ error: 'Failed to generate description' });
  }
});

// POST /campaigns/ai/suggest-keywords
router.post('/campaigns/ai/suggest-keywords', requireAuth, async (req, res) => {
  try {
    const { name, description, categories = [] } = req.body || {};
    if (!name?.trim() || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'name and at least one category are required' });
    }
    const prompt =
`You generate concise search keywords for discovering social-media creators for a campaign.
Return 6-10 short keywords or phrases (1-3 words each), lowercase, no hashtags, no numbering.
Respond with ONLY a JSON array of strings, e.g. ["keyword one","keyword two"].

Campaign name: ${name}
Discovery categories: ${categories.join(', ')}
Campaign description: ${description || 'N/A'}`;

    const raw = await generateText(prompt);

    let keywords;
    try {
      const jsonStr = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
      keywords = JSON.parse(jsonStr);
    } catch {
      keywords = raw.split(/[\n,]/).map(s => s.replace(/^[\s\-*0-9.]+/, '').replace(/["'`]/g, '').trim());
    }
    keywords = [...new Set(keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean))].slice(0, 10);

    return res.json({ keywords });
  } catch (err) {
    console.error('suggest-keywords failed', err);
    return res.status(500).json({ error: 'Failed to suggest keywords' });
  }
});
```

## Notes
- Both calls are short and synchronous — no streaming needed.
- Consider a light rate limit / debounce server-side if abuse is a concern; the UI already
  disables the button while a request is in flight.
- Optionally set `generationConfig: { temperature: 0.7 }` for description and `0.4` for
  keywords if you want steadier keyword output.
