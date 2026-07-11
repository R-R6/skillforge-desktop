# 页面转 UI 图片工作流

> 将现有前端页面提炼为页面功能契约，并按 webpc 或 mobile 平台生成保持业务行为但改变视觉风格的 UI 参考图集。

支持平台: codex, cursor, claude, openclaw, hermes

## Prompt

# Page To UI Images

## Core Pipeline

Run this skill as a fixed two-stage pipeline:

1. **Extract the page function contract**: preserve business logic, data, states, and interactions; discard the old visual style.
2. **Generate UI reference images from the function contract**: call the image-generation skill that matches the detected platform and create a coherent multi-state UI image set.

Stop after UI image delivery. Do not add an image-to-code stage, webpage reconstruction stage, `DESIGN.md`, or global design-system extraction step unless the user explicitly asks for that in a separate task.

## 0. Required Skill Check

Before executing this skill, identify the target platform, then verify that the downstream image-generation skill for that platform is installed and present in the current available Skills list.

Platform defaults:

1. **mobile**: use `imagegen-frontend-mobile`, unless the user explicitly names another installed image-generation skill.
2. **webpc**: use `imagegen`, unless the user explicitly names another installed image-generation skill.

Rules:

- If the platform-specific required image-generation skill is installed, continue to stage 1.
- If the required skill is missing, stop immediately.
- When stopping, tell the user exactly which skill is missing and ask them to install it before continuing.
- Do not silently switch to an unconfirmed substitute skill. Continue only when the user explicitly names a substitute and that substitute is installed.
- Do not require `image-to-code` for this skill, because this variant does not rebuild webpages.

## 0.1 Platform Detection

Detect the original project platform from real project files before writing the function prompt or generating images. Do not infer platform only from the user's wording.

Classify as **mobile** when project evidence shows a mobile app or mini-app target, such as uni-app, WeChat Mini Program, Taro, React Native, Flutter, native iOS/Android, mobile-only viewport assumptions, mobile tab bars, or app/mini-program route manifests.

Classify as **webpc** when project evidence shows a desktop web or responsive website/admin target, such as Vite/React/Vue/Next/Nuxt web apps, admin dashboards, desktop navigation layouts, browser routes, wide responsive breakpoints, or PC-first route/page structure.

When evidence is mixed, choose the platform used by the target page's actual runtime entry. If the target page is explicitly a mobile H5 page inside a web project, classify that page as mobile. If the target page is an admin/management screen inside a mixed repo, classify that page as webpc.

Record the detected platform in the function contract and in `<projectRoot>/image_path.md`. The UI image prompt must explicitly state the detected platform, expected canvas type, required output width, and flexible-height rule.

## 0.2 Output Manifest

Do not copy, move, rename, re-save, optimize, or re-export generated UI image files into the project root, `imageCode`, source page directory, or any other project folder.

The only required project-root output artifact is:

- Image path manifest: `<projectRoot>/image_path.md`

Resolve these values before producing the manifest:

1. **Project root**: use the current workspace root or the project root explicitly specified by the user.
2. **Original page name**: derive `<pageName>` from the source page filename without extension. For example, `pages/index.vue` becomes `index`; `pages/memory/create.vue` becomes `create`.
3. **Generated original UI image paths**: use the absolute filesystem paths of the selected original images produced by the image-generation tool.

`image_path.md` must contain:

- source page path
- derived page name
- detected platform (`webpc` or `mobile`)
- required output width and actual generated image dimensions
- 2-3 absolute paths to the selected generated original UI images

The listed image paths must point to the original high-quality files produced by the generation tool, not thumbnails, previews, screenshots, copied files, compressed derivatives, or files re-saved through another tool.

## 0.3 Final UI Canvas Requirement

All final UI images must show only the core interface for the detected platform. This rule is mandatory even when the downstream image-generation skill normally prefers phone mockups.

Do not include:

- phone bodies, bezels, black device borders, camera islands, notches drawn as hardware, buttons, or speaker slots
- mobile system status bars, including time, carrier, signal, Wi-Fi, battery, dynamic island, or OS-level status indicators
- presentation shadows, floating device mockups, desk surfaces, hands, decorative staging, or external backgrounds
- browser frames, OS chrome, watermark panels, annotation labels, or design-board frames

Generate each state as a clean UI screenshot canvas that starts at the interface edge and contains only the product UI surface, content, app-owned navigation, and interaction state being demonstrated.

Platform canvas rules:

- **mobile**: generate a portrait mobile app or mini-program screen surface only; keep app navigation/tab bars only when they belong to the product UI; do not show any phone hardware or mobile OS status bar.
- **webpc**: generate a desktop web page or app canvas only; use a wide desktop aspect ratio and PC information density; do not show browser tabs, address bars, window title bars, operating-system chrome, or mobile app chrome.

## 0.4 Standard Output Width And Flexible Height

Final UI image files must use exact platform-standard pixel width. Height is not fixed and must expand to include the complete UI content for the page or state.

Default widths:

- **mobile**: `390 px` wide, portrait mobile UI canvas; height is content-driven.
- **webpc**: `1440 px` wide, desktop web UI canvas; height is content-driven.

Use these defaults unless the user explicitly provides a different platform-standard target width. Do not use square images, poster compositions, design-board canvases, ultra-wide banners, device mockup dimensions, fixed viewport-height screenshots, or arbitrary image-generator defaults.

Do not force mobile images to `844 px` height or webpc images to `1024 px` height. Long pages, long forms, data-heavy dashboards, and states with expanded content must extend vertically until the full UI content is visible. If the image-generation tool returns the wrong width, crops vertical content, or truncates the page to a fixed viewport height, reject that image and regenerate at the required width with complete content height. Do not create a project-local resized or cropped derivative.

## 0.5 Image Quality Requirement

Final UI images must be crisp, high-definition UI references at the required width and complete content height.

Quality rules:

- Select PNG original files whenever possible, and reject non-PNG originals unless the user explicitly allows another format.
- Generate or export at the target width and full content height directly whenever possible; do not upscale low-resolution images to fake clarity.
- Keep text, icons, dividers, controls, charts, avatars, and images sharp at 100% view.
- Do not accept blur, motion blur, pixelation, JPEG/compression artifacts, smeared gradients, warped geometry, stretched UI, aliased text, melted/garbled AI text, or distorted component proportions.
- Avoid post-generation resizing or cropping. If width, height coverage, or composition is wrong, regenerate a compliant original image.
- Prefer regeneration over post-processing when quality defects come from the generated source image.

## 0.6 Original Image Path Manifest Requirement

Preserve generated UI images in their original output locations. Do not create project-local image copies.

Manifest rules:

- Write `<projectRoot>/image_path.md` after selecting the final UI images.
- List absolute filesystem paths only; do not use relative paths, URLs, markdown image embeds, or paths to rendered previews.
- Each listed path must point directly to an existing original generated image file.
- Each listed image must already satisfy platform, canvas, width, full-content height, and quality requirements.
- If an original generated image does not satisfy requirements, regenerate it and list the new original generated file path instead of resizing or copying it into the project.
- Do not use `Copy-Item`, `Move-Item`, PIL, canvas, screenshot tools, clipboard workflows, image optimizers, or format converters to place images in project folders.
- Treat `image_path.md` as the final handoff artifact for locating the UI originals.

## 1. Extract The Page Function Contract

This stage follows the working pattern from session `019f0b4e-4e7f-7fe1-9bee-4be8a8853fee`.

When the input is an existing frontend page, directory, or business screen:

1. Read the target page, adjacent components, route config, global plugins, API calls, assets, and app metadata.
2. Confirm technical constraints from real project files, not from stale prompts or memory. For example, in a uni-app project, verify the Vue version, `navigationStyle`, tab identity, multi-platform targets, and global navigation/modal helpers.
3. Detect whether the target page should be treated as `webpc` or `mobile`, using the platform detection rules above.
4. Separate old visuals from behavior. Colors, card shapes, fonts, textures, decorative graphics, and animation style are not functional requirements by default.
5. Build the page function contract in working context. Do not write a separate prompt file unless the user explicitly asks for it. The contract must include:
   - page identity and business role
   - primary user goal
   - information hierarchy
   - data fields, defaults, and selected states
   - page states, sheet/dialog states, and feedback states
   - entry points, navigation targets, toast messages, or "under construction" outcomes
   - framework, detected platform (`webpc` or `mobile`), canvas type, required output width, flexible-height rule, and project constraints
   - methods, events, and behaviors that must be preserved
   - delivery acceptance checklist
6. State clearly that a new visual system may be used later, but business functionality, platform fit, and interaction outcomes must remain unchanged.

The output is a function contract that can be handed to any new visual direction. It is not a design mockup and not a global design specification.

## 2. Generate UI Images With The Required Skill

This stage uses only the UI image-generation logic from session `019f0b56-aead-75c0-9129-e36ff52b4016`.

When the user asks to generate UI images from the function prompt:

1. After the required skill check confirms that the image-generation skill for the detected platform is installed, read that skill completely.
2. Split the function contract into 2-3 high-value UI states. Prefer:
   - default page or default business state
   - key selection state, bottom sheet, dialog, or panel state
   - operation feedback state or filled-input state
3. Match the detected platform:
   - `mobile`: `390 px` wide portrait mobile app or mini-program UI, content-driven height, app-screen density, touch-sized controls, mobile navigation patterns when functional.
   - `webpc`: `1440 px` wide desktop web UI, content-driven height, PC density, desktop navigation patterns, tables/panels/sidebar layouts when functional.
4. Keep all images in one consistent visual direction, component language, and content density.
5. Include enough concrete business content in each image for inspection: brand, user info, date context, statistics, input area, AI entry, visibility range, groups, save action, and feedback state where relevant.
6. When the user specifies a theme, make it visible in the UI. For example, "red and gold" must influence primary color, accent color, paper/archive feel, icons, and button hierarchy.
7. Always generate pure UI canvases:
   - exact output width must be `390 px` for `mobile` or `1440 px` for `webpc`, unless the user explicitly supplied another platform-standard width
   - output height must remain unrestricted and include the complete page or state content; do not crop long pages to a fixed viewport height
   - PNG output must be sharp at 100% view, with no blur, pixelation, compression artifacts, or stretched/distorted UI
   - no phone body
   - no black device border
   - no mobile system status bar, time, signal, Wi-Fi, carrier, battery, or dynamic island
   - no presentation shadow
   - no external staging background
   - no non-UI wrapper or decorative mockup environment
   - no browser tabs, address bar, title bar, OS window chrome, or desktop shell
   - preserve product spacing and text clarity
8. If a generated image has quality defects, wrong width, cropped/truncated height, wrong platform, a mobile status bar, a phone frame, a mockup wrapper, staging background, browser chrome, OS chrome, or other non-interface component, reject it and regenerate a compliant original image.
9. Do not copy, move, rename, or re-save selected UI images into the project. Create `<projectRoot>/image_path.md` and list the absolute paths of the selected original generated image files.
10. Stop at UI images. Do not output `DESIGN.md`, a design specification, HTML/CSS/JS, or an image-to-code implementation.

## Verification

Run lightweight verification whenever files are produced.

1. Confirm `<projectRoot>/image_path.md` exists.
2. Confirm `image_path.md` records the source page path, derived page name, detected platform (`webpc` or `mobile`), required output width, actual generated dimensions, and 2-3 generated original UI image absolute paths.
3. Confirm every listed image path is absolute and points to an existing original generated image file.
4. Confirm no generated UI image was copied, moved, renamed, re-saved, optimized, or re-exported into the project root, `imageCode`, source page directory, or any other project folder.
5. Confirm every listed original image has the required width: `390 px` for `mobile` or `1440 px` for `webpc`, unless the user explicitly supplied another platform-standard width.
6. Confirm every listed original image height is sufficient to show the complete page or state content, with no clipped bottom content, cut-off cards, truncated forms, or missing long-page sections.
7. Inspect the listed original UI images when possible and check:
   - business content is represented
   - text is legible
   - text, icons, controls, and imagery are sharp at 100% view
   - no blur, pixelation, compression artifacts, warped geometry, stretched UI, garbled text, or distorted component proportions are present
   - states are distinct
   - visual direction is consistent across images
   - image platform matches the detected platform
   - no mobile system status bar is present
   - no phone frame, device mockup, presentation background, browser chrome, OS chrome, or other non-interface wrapper is present
8. Check for accidental `DESIGN.md`, webpage, image-to-code outputs, or copied project-local UI image files. This skill variant should not create them.

## Decision Rules

- Source code and the old page determine functionality. Generated UI images determine the new visual appearance.
- Real project files determine whether final images must be `webpc` or `mobile`; do not force mobile output for a webpc page.
- Detected platform determines final image width: `mobile` uses `390 px`; `webpc` uses `1440 px`, unless the user explicitly supplies another platform-standard width.
- Final image height is content-driven and must not be capped by a fixed viewport height; do not accept images that crop long pages or omit lower content.
- Final image quality must be sharp and non-distorted at the required width and complete content height; do not accept blurry, compressed, pixelated, warped, stretched, or garbled generated images.
- Do not move final images into `imageCode/<pageName>/` or any project-local image folder. Preserve the generated originals where they are and record their absolute paths in `<projectRoot>/image_path.md`.
- When the user asks for a new style, preserve functionality and interactions while discarding old visual assumptions.
- Stop after UI image delivery unless the user starts a separate task for design-system extraction or webpage reconstruction.
- Do not check for or invoke `image-to-code`.
- Do not create HTML/CSS/JS files.
- Do not derive `DESIGN.md` or a global design system from the UI images.
- If the image-generation tool returns images with quality defects, wrong width, cropped/truncated height, wrong platform, mobile status bars, phone frames, browser chrome, OS chrome, or mockup wrappers, regenerate pure platform-correct UI originals instead of accepting, copying, resizing, or cropping those files.
- If the image-generation tool saves files elsewhere, keep the selected original generated image files there and list their absolute paths in `<projectRoot>/image_path.md`; do not use any preview, screenshot, thumbnail, clipboard, optimizer, or re-export path.

## Common Outputs

### Page Function Contract

Describe page business capability, data fields, interaction outcomes, detected platform, canvas type, required output width, flexible-height rule, technical constraints, and acceptance checks. Treat the old visual style as replaceable context, not as a requirement.

### Image Path Manifest

Create `<projectRoot>/image_path.md` with the source page, detected platform, required width, actual generated dimensions, and absolute paths to the selected original generated UI images.

### UI Reference Images

Generate 2-3 same-style UI states from the function contract. Match the detected `webpc` or `mobile` platform, required standard width, and full content height. Always generate sharp, non-distorted pure core UI canvases without mobile system status bars, phone frames, device mockups, browser chrome, OS chrome, presentation backgrounds, or other non-interface wrappers.
