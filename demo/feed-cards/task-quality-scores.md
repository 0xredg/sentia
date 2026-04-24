# Sentia feed task quality scores

Scoring: quality for hackathon demo + strength of the human-input use case + image fit. Visible task/question text inside the image is penalized because the app should provide the question separately.

| Task ID | Score /100 | Explanation |
|---:|---:|---|
| 63 | 94 | Excellent jury use case: safety-critical autonomous-driving annotation with ambiguous occlusion. Image fits strongly; small penalty because the task framing appears embedded in the visual. |
| 61 | 92 | Very strong grounded-AI hallucination check: humans verify whether a claim is supported by a source. Image matches well; question text in image costs points. |
| 52 | 90 | Clear vision-annotation QA for training data, immediately understandable and high-value. Image fits; visible prompt/question reduces score. |
| 57 | 89 | Citation relevance is a strong AI-eval use case where humans add obvious value. Image fits; embedded question/prompt is a demo-image weakness. |
| 51 | 88 | Great multimodal hallucination task: compare AI descriptions against an image. Image mostly fits and does not over-explain, though question is less legible than ideal. |
| 62 | 88 | Strong assistant-safety example with real human nuance. Image fits the use case, but visible evaluation UI/question text is a malus. |
| 58 | 87 | Strong generative-media preference task; humans spot realism/artifacts quickly. Image fits, but prompt text appears in the image. |
| 64 | 87 | Good model-training preference task for generated product images. Image fits and is easy to judge; question text in image costs points. |
| 56 | 86 | Reasoning correctness is a good eval use case for AI systems. Image fits, but small text and embedded question make it less demo-friendly. |
| 59 | 86 | OCR receipt verification is a real, concrete human-in-the-loop need. Image fits well and appears to avoid overlaid question text, but is slightly less flashy for the jury. |
| 53 | 85 | Dataset labeling for ambiguous objects is a clean human-input use case. Image fits; embedded label/question UI gets a small penalty. |
| 48 | 84 | AI-answer preference is directly relevant to RLHF/eval. Image fits, but this is a familiar use case and the question appears in-image. |
| 54 | 84 | Empathy judgment is a strong human-preference signal. Image fits; embedded task text and small UI text reduce demo polish. |
| 60 | 83 | Emotional-support quality is a strong human-judgment task. Image fit is plausible, but the actual task is not visually clear enough at a glance. |
| 23 | 82 | Good “confident but wrong” AI-answer judgment. Strong human value; image fits but includes the question text and is text-heavy. |
| 65 | 82 | Practical customer-support AI evaluation with nuance beyond politeness. Image fit is plausible, but the task question is not clearly visible and may read as generic chat. |
| 47 | 81 | Classic training-label task; simple and understandable. Image fits, though embedded question/labels make it less clean. |
| 41 | 80 | Search relevance is a real human-judgment use case. Image fits; visible question text and dense UI lower score. |
| 43 | 80 | Sybil-resistant governance feedback is very World-native. Image fits, but not as obviously AI-training related and includes prompt text. |
| 50 | 79 | Strong World App trust/preference signal for the hackathon story. Image fits, but visible prompt text and subjective branding make it slightly less core. |
| 25 | 78 | Useful support-resolution evaluation; humans judge whether the answer actually helps. Image fits, but text-heavy UI and embedded question hurt. |
| 45 | 78 | Civic-comprehension check benefits from verified humans. Image fits, but political framing may distract the jury and question text is visible. |
| 46 | 78 | Clear meta-task: humans validate whether a task instruction is understandable. Good fit; embedded prompt is a malus. |
| 55 | 77 | Medical-claim safety is a valuable content-safety case. Image is relevant but looks like a generic ad and lacks clear task framing. |
| 40 | 76 | Professional-profile judgment is easy and human. Image fits, but it is more subjective UX preference than AI-critical input; question text visible. |
| 42 | 76 | Cover-photo selection is practical and quick. Good image fit, but weaker AI/human-necessity story and embedded question. |
| 44 | 76 | Grant-applicant relevance is a good human-prioritization task. Image fits; less visual/AI-specific and question text is visible. |
| 26 | 75 | Educational-visual clarity is a real human-comprehension task. Image fits, but embedded question and diagram text make it busy. |
| 29 | 75 | CTA clarity is practical and instantly judgeable. Image fits; lower because it is general UX preference and question text is inside image. |
| 38 | 75 | Game UX clarity is a good fast human decision. Image fits; visible question and less AI-specific use case reduce score. |
| 39 | 75 | Credential credibility is understandable human judgment. Image fits but is subjective and includes the prompt in-image. |
| 49 | 74 | Naming preference is valid consumer feedback. Image fits; not a strong “AI cannot solve this” use case and question text appears in image. |
| 34 | 73 | Music-cover clickability is a clear taste/preference task. Image fits; embedded prompt and lower strategic relevance cap the score. |
| 35 | 73 | Headline clarity is useful human comprehension feedback. Image fits, but this is generic UX testing and has question text in image. |
| 37 | 73 | Eco-badge preference is a valid consumer-trust signal. Image fits; embedded question and weaker AI-training relevance. |
| 28 | 72 | Finance color trust is an easy human preference task. Image fits; question text in image and subjective branding make it less compelling. |
| 30 | 72 | Packaging premium perception is a good consumer-feedback task. Image fits; embedded prompt and non-AI-specific value lower it. |
| 32 | 72 | Tap-interest prediction is a useful human preference signal. Image fits; question text appears and the AI/human necessity is moderate. |
| 33 | 72 | Price clarity is a real UX check. Image fits but lacks visible task framing at a glance and is not a standout AI use case. |
| 36 | 71 | Health-copy reassurance benefits from human sensitivity. Image fit is acceptable but no clear task prompt is visible. |
| 20 | 70 | Mixed-sentiment classification is a real NLP-labeling task. Image fits, but question text in image and dense review UI hurt demo quality. |
| 18 | 69 | Tone/aggressiveness review is useful for support automation. Image fits; question text appears in-image and task is somewhat narrow. |
| 21 | 69 | Constructiveness judgment needs human nuance. Image is text-heavy with embedded question, making it harder for a quick demo. |
| 31 | 69 | Wallet-trust screen is relevant to World, but image lacks the task prompt and the use case is UX preference rather than AI-critical. |
| 27 | 68 | Logo memorability is easy to answer and image fits, but it is generic preference testing with weaker jury impact. |
| 17 | 67 | Trustworthiness judgment is human-relevant. Image fits a B2B page, but no visible task framing and AI angle is weak. |
| 24 | 67 | Caption-vs-image vibe requires human perception. Image likely fits, but the task is subtle and no prompt is visible. |
| 22 | 66 | Seniority impression can use human judgment. Image fit is acceptable, but hiring-style subjective scoring is less clean for the hackathon demo. |
| 15 | 65 | Emotional first impression is a valid human signal. Image fits, but this is weaker as a “true use case” and no task prompt is visible. |
| 16 | 65 | Customer tone judgment is useful. Image fit is plausible, but screenshot text is too small and the task is not obvious visually. |
| 19 | 65 | Authentic-vs-sponsored tone is human-relevant. Image fit is plausible but ambiguous, and the task is not clear at first glance. |
| 7 | 64 | Misleading health-claim detection is a strong safety use case. Image fits the content, but it looks like a raw ad with no task framing. |
| 8 | 64 | PII detection is a real human-review task. Image fits, but text may be hard to read and the visual is not very compelling. |
| 14 | 64 | Newsworthiness vs graphicness needs editorial judgment. Image fits, but the scene is visually unclear and can be sensitive for demo. |
| 3 | 63 | Subtle harassment is a good human moderation case. Image fit is plausible, but text is too small and the task is not visually legible. |
| 11 | 63 | Hate-vs-edgy humor is a real moderation use case. Image has meme text but is risky/ambiguous for jury polish. |
| 10 | 62 | Graphic-content moderation is a real safety use case. Image fits broadly, but is dark/unclear and less comfortable for a polished demo. |
| 13 | 61 | Storefront authenticity is practical human common sense. Image fits but is not very AI-specific or interesting. |
| 1 | 60 | Misleading marketplace-photo review is practical. Image is clean but too plain; the hidden-defect premise is hard to infer. |
| 5 | 60 | Food-safety visual review is practical. Image fits, but ambiguity may be low and the use case is less jury-exciting. |
| 2 | 58 | Teen-safety moderation is a valid human task, but the image is clickbait/sexualized and includes non-task text, making it poor for demo polish. |
| 4 | 58 | Audience-safety review for a game avatar is plausible. Image fits but feels low-stakes and not clearly human-necessary. |
| 6 | 57 | Age-restriction review is plausible. Image is dark and generic, with weak task clarity. |
| 9 | 57 | Community-feed acceptability is human-contextual. Image is generic and not very compelling for a hackathon jury. |
| 12 | 55 | Child-safety moderation is relevant, but using a child image is sensitive and not ideal for the demo. |
