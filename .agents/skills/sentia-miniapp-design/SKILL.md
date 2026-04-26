---
name: sentia-miniapp-design
description: Use this skill when designing, auditing, or modifying Sentia's World Mini App UI so it combines Sentia's premium light-theme design language with World Mini Apps design guidelines, mobile-first constraints, safe areas, Lucide icons, and app review expectations.
---

# Sentia Mini App Design

## Purpose

Use this skill for Sentia Mini App screens, UI reviews, or frontend changes where Sentia's premium design direction must remain recognizable while complying with World Mini Apps guidelines.

When a visual preference conflicts with World Mini App compliance, World compliance wins. Sentia's default product UI is light theme: preserve the black-and-white Bugatti-inspired contrast, typography, and restraint as inspiration, not as dark mode.

## Priority Rules

1. **Mobile app first.** Design for the World App webview, not a desktop website. Avoid footers, sidebars, excessive scrolling, and hamburger menus for primary navigation. Prefer bottom tabs, direct screen-to-screen navigation, and anchored primary actions.
2. **Respect World chrome.** Do not place important or interactive UI where it can conflict with Mini App controls in the upper-right corner. Keep top actions clearly away from platform controls.
3. **Use World spacing defaults.** Start with `24px` page padding. Use `16px` between a header and its content and between elements inside a section. Use `32px` between distinct sections. Use `24px` between search/header areas and the content below when applicable.
4. **Honor safe areas.** Place bottom primary actions `24px` above the iOS bottom bar. Position tab bars, drawers, and sheets with `12px` clearance from the iOS/Android bottom bar. Keep buttons `24px` above the active keyboard.
5. **Avoid iOS scroll bounce issues.** Prefer `100dvh` over fragile `100vh`. Use explicit scrolling containers and `overscroll-behavior: none` when it does not break content access.
6. **Tap targets are non-negotiable.** Interactive controls must be at least `44px` tall or have an equivalent touch target. Avoid compact utility buttons on mobile unless they are visually small but tap-expanded.

## Visual System

### Color

- Use a light theme by default: off-white page background, white functional surfaces, black primary text, gray secondary text, and black primary actions.
- Recommended tokens: background `#f7f7f4`, surface `#ffffff`, raised surface `#fbfbf8`, text `#111111`, muted `#6f6f68`, line `rgb(17 17 17 / 12%)`, active `#111111`, active text `#ffffff`.
- Use restrained semantic colors only when they improve clarity: a quiet green for positive earnings/status and a readable red for errors.
- Do not introduce decorative accent colors, glows, heavy shadows, glassmorphism, or multicolor gradients. The visual system should feel crisp, premium, and calm.

### Typography

- Keep the Bugatti-inspired display feeling through strong scale, tight leading, and short high-impact headings.
- Reduce extreme desktop scales for Mini App screens. Headlines must not wrap awkwardly, obscure content, collide with safe areas, or compete with World controls.
- Use mono uppercase labels for short CTAs, tabs, captions, and compact metadata.
- Use sentence case for functional copy, onboarding, form labels, errors, descriptions, and any text users need to read quickly.
- Do not rely on ultra-thin contrast or tiny tracked text for essential information.

### Components

- Primary buttons: black filled action with white text, pill radius, and at least `44px` height. Secondary actions can use transparent or white surfaces with a clear hairline border.
- Secondary actions: quiet outline or text treatment, still meeting tap target requirements.
- Cards: avoid decorative card grids and nested cards. Functional panels are allowed when they improve comprehension, form grouping, transaction review, or state feedback; keep them monochrome and low-elevation.
- Media: use premium imagery or video where it clarifies the experience, but never at the expense of load time, legibility, or the user's ability to complete the action.
- Empty, loading, and transient states should be centered or clearly aligned, with immediate visual feedback for slow operations.
- Use Lucide icons for common navigation and actions when an icon exists. Keep icons simple, stroke-based, and paired with accessible labels for tab bars and primary navigation.

## Mini App Patterns

- Use bottom tabs for main sections when the app has repeated top-level navigation.
- Use anchored bottom actions for primary flows such as onboarding, confirmation, payment, or verification.
- Keep screen depth shallow and navigation cues explicit so users always know where they are and what happens next.
- For forms, make inputs easy to focus and avoid keyboard overlap. Keep submit actions visible above the keyboard.
- When authenticated through World, display usernames instead of wallet addresses. If addresses are unavoidable in technical contexts, pair them with recognizable identifiers.
- Use Verify for important identity or trust moments. Do not make users infer verification state from decoration alone.
- Target 2-3 seconds maximum for initial load and under 1 second for subsequent actions; show loading feedback whenever operations may feel delayed.

## Store And Review Checks

Before shipping or submitting a Mini App surface:

- App icon is square and does not use a white background.
- Content card image is `345x240px`; avoid text inside the image; keep the bottom `94px` free of important details because World overlays that area; export PNG at `3x` without border radius or metadata.
- Do not use the World logo or modified versions of it.
- Do not use the term "official" in the app name, description, or interface.
- Do not imply World endorsement or affiliation; Sentia must keep its own distinct brand identity.
- Avoid chance-based prize mechanics, token pre-sales, and paid memberships that increase yield or financial returns.
- Localize user-facing UI where feasible, especially for English, Spanish, Thai, Japanese, Korean, and Portuguese audiences.

## Audit Checklist

Run this checklist when reviewing existing UI:

- **World compliance:** safe areas, top-right platform controls, keyboard handling, bottom actions, tab/sheet clearance, and iOS scroll behavior are handled.
- **Mobile usability:** no desktop-first footers, sidebars, hamburger-primary navigation, tiny controls, or long unstructured scrolling.
- **Spacing:** page padding starts at `24px`; section rhythm uses `16px` internally and `32px` between sections unless a screen-specific reason overrides it.
- **Brand fit:** black/white/gray palette, restrained surfaces, no decorative accents, no unnecessary shadows, no visual noise.
- **Typography:** large display moments are readable on mobile; functional content uses readable sentence case; labels are short enough for uppercase mono treatment.
- **State quality:** loading, empty, disabled, error, success, and verification states are visible and understandable.
- **Identity:** usernames are shown instead of wallet addresses; no World logo misuse; no "official" language.

## Implementation Guidance

When editing UI, first make the screen compliant and usable, then tune it toward the cinematic Sentia/Bugatti-inspired mood. Keep the skill's output practical: specify concrete spacing, safe-area behavior, tap target sizes, and component states rather than only describing atmosphere.
