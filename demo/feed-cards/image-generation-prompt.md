# Feed Card Image Generation Prompt

Use this prompt to generate one realistic image for a Sentia feed card.

Sentia is a World Mini App where verified humans answer judgment tasks that AI cannot reliably solve. The image you generate will be shown inside a mobile, TikTok-style task card. A real human will look at the image, read the question, and choose an answer. The image must therefore contain enough visual evidence for a human to make the judgment, while still looking like a plausible real product, app, marketplace, social, or media asset.

## Inputs

You will receive:

- `task_type`: one of `content_safety`, `sentiment_judgment`, `qualitative_feedback`, `one_human_decision`
- `company`: the real company or platform this task is inspired by
- `content_idea`: the scene, screenshot, concept, or artifact to depict
- `question`: the human judgment question the image must support

## Goal

Generate a realistic image that could credibly appear in the workflow of the given company or product category. Do not place the company name, logo, trademark, or exact UI in the image. You may use the company's general design language, product context, audience, and visual expectations to make the image feel plausible.

The result should feel like a real task submitted to Sentia by a product team that needs fast verified human judgment.

## Image Requirements

- Make the image realistic, concrete, and immediately understandable.
- Show the specific visual situation described in `content_idea`.
- Include enough detail to answer `question`, but keep the composition simple enough for a mobile card.
- Avoid generic stock-photo vibes. Prefer product screenshots, app mockups, marketplace photos, moderation review assets, content thumbnails, side-by-side design options, or realistic UGC-style images depending on the task.
- Use a vertical or square composition that can crop well inside a mobile feed card.
- Do not add the Sentia UI, buttons, answer choices, task labels, reward amounts, or any overlay explaining the task.
- Do not include real company logos, exact brand marks, trademarked UI screenshots, or readable brand names.
- Do not include large blocks of readable text unless the task needs text judgment. If text is needed, keep it short, generic, and fictional.
- Do not include watermarks, signatures, generation artifacts, or decorative frames.
- If the task compares options, clearly show numbered or visually separated options, but avoid using real brand logos.

## Task-Type Guidance

### `content_safety`

Create an image where the moderation decision is genuinely contextual rather than obvious. The image should be realistic but not extreme. Show ambiguity around safety, age-appropriateness, misleading content, privacy, graphicness, harassment, or brand safety.

Avoid explicit nudity, graphic gore, hateful symbols, or illegal content. Suggest the issue through framing, context, pose, product claim, visible personal details, or editorial tension.

### `sentiment_judgment`

Create an image where the first emotional or tonal impression matters. This can be a screenshot-like support exchange, a landing page hero, a review, a chatbot answer, a candidate profile, an ad visual, or another realistic product artifact.

The image should make tone, trust, confusion, confidence, authenticity, or clarity judgeable by a human.

### `qualitative_feedback`

Create an image that supports product, design, brand, UX, packaging, search, map, music, fitness, education, or commerce feedback. The image should look like something a product team would A/B test.

If there are multiple options, show them cleanly as option 1, option 2, and optionally option 3. The options should differ meaningfully in color, layout, image choice, copy, or perceived quality.

### `one_human_decision`

Create an image where a verified human decision is useful because the choice should be sybil-resistant or preference-based. This can include governance proposals, grant applicants, civic messaging, task briefs, image labels, AI answer comparisons, naming choices, or app icon concepts.

The image should make the decision feel lightweight, concrete, and credible.

## Output Style

Return only the generated image. Do not include analysis, captions, extra explanations, or alternate prompts.

## Prompt Template

Generate a realistic mobile-feed image for a Sentia human judgment task.

Context:
Sentia routes tasks that AI struggles with to verified humans. The image will appear on a mobile feed card, with the question displayed separately by the app.

Task:
- task_type: `{task_type}`
- company inspiration: `{company}`
- content idea: `{content_idea}`
- question the image must support: `{question}`

Create a realistic image that fits the company category and general design language without using the actual company logo, brand name, exact UI, or trademarked assets. The image should be visually clear on mobile, plausible as a real product workflow artifact, and contain enough evidence for a human to answer the question. Do not add answer buttons, labels from Sentia, explanatory captions, watermarks, or decorative borders.
