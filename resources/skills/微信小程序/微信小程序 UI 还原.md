# 微信小程序 UI 还原

> 按设计稿高保真还原微信小程序页面，覆盖自定义导航、胶囊避让、官方 tabBar、安全区、图标导出和真机兼容风险。

支持平台: codex, cursor, claude, openclaw, hermes

## Prompt

# WeChat Mini Program UI Restore

Use this skill to implement or review WeChat Mini Program pages from UI designs. Prioritize real-device fidelity, platform constraints, safe-area handling, reusable navigation components, and production risks.

## Core Workflow

1. Inspect the design before coding.
   - Identify page type, scroll behavior, fixed regions, tab pages, modal layers, native components, images, and long-text fields.
   - Confirm the design width and conversion baseline. Prefer a 750rpx baseline when the design is iPhone-width mobile UI.
   - Extract shared tokens for color, font size, line height, spacing, radius, shadow, and icon sizes before page-level styling.
   - Identify all Figma icon nodes used by the page, including navigation icons, list icons, empty-state icons, action icons, and tabBar normal/selected icons.

2. Build shared layout primitives first.
   - Create or reuse a custom navigation component for all pages using `navigationStyle: "custom"`.
   - Use the official WeChat Mini Program `tabBar` configuration for bottom navigation. Do not create a custom bottom navigation component or `custom-tab-bar`.
   - Centralize safe-area, status-bar, and capsule height calculations instead of repeating magic numbers.

3. Implement static layout, then dynamic states.
   - Restore normal visual state first.
   - Add loading, empty, error, disabled, pressed, selected, skeleton, long-content, and permission-denied states.
   - Verify scrolling, keyboard behavior, modal layering, and route transitions after static fidelity is acceptable.

4. Validate on real devices.
   - Do not trust the simulator alone.
   - Test iOS notch devices, iOS devices with bottom home indicator, common Android phones, small screens, and high-density screens.
   - Capture screenshots and compare spacing, clipping, safe-area padding, and overlap against the design.

## Custom Top Navigation

Always treat the right-side WeChat capsule area as reserved system space.

- Use `wx.getMenuButtonBoundingClientRect()` to get capsule `top`, `height`, `left`, `right`, `bottom`, and `width`.
- Use `wx.getWindowInfo()` to get `statusBarHeight`, `safeArea`, `windowWidth`, `windowHeight`, and `screenTop`.
- Do not hardcode navigation height such as `88px`, `96px`, or `44px`.
- Do not place search, filter, share, scan, more, close, submit, or any business action inside the capsule area.
- If the UI design places operation buttons on the right side of the top navigation, move those buttons to the left side. Append them after the existing left-side title/back/home/search elements, preserve their business priority/order, and keep the whole left action group clear of `capsule.left`.
- Let decorative navigation backgrounds extend under the status bar and capsule, but keep interactive controls outside the reserved area.
- Keep API-returned geometry in `px` when assigning inline style values; do not blindly convert these values to `rpx`.

Preferred height calculation:

```js
const windowInfo = wx.getWindowInfo()
const capsule = wx.getMenuButtonBoundingClientRect()
const statusBarHeight = windowInfo.statusBarHeight || 0
const navContentHeight = capsule.height + (capsule.top - statusBarHeight) * 2
const navTotalHeight = statusBarHeight + navContentHeight
```

Apply the result consistently:

- Navigation wrapper height: `navTotalHeight`.
- Navigation content top padding: `statusBarHeight`.
- Navigation positioning: keep the top navigation fixed during page scrolling, usually with `position: fixed; top: 0; left: 0; right: 0; z-index` high enough to stay above page content.
- Page content top spacer or padding: `navTotalHeight`, unless the page intentionally uses an immersive hero background.
- Left-side title/search/action max width: no wider than the space before `capsule.left`.
- Back/home button vertical alignment: align to capsule center, not to a guessed 44px bar.

Handle edge cases:

- If `safeArea` is missing, fall back to `windowInfo.windowHeight/windowWidth` and conservative padding.
- If the page is opened by sharing, scan code, single-page mode, or as a non-stack root, provide a home fallback instead of assuming `navigateBack` works.
- If a design uses a transparent or gradient nav over content, switch status-bar text color appropriately through page config or navigation styling.
- Recalculate layout after orientation, split-screen, or window resize where the product supports those modes.

## Official Bottom Tab Navigation

Use the bottom navigation provided by WeChat Mini Program official `tabBar`. Do not custom-develop the bottom tab navigation.

- Configure bottom navigation only through `app.json` `tabBar`.
- Do not set `tabBar.custom: true`.
- Do not create `custom-tab-bar/` files.
- Do not create page-level fixed bottom nav markup to imitate tabBar.
- Do not duplicate tab item markup or route logic inside pages.
- Use `switchTab` for tab page navigation.
- Use official tabBar fields such as `list`, `color`, `selectedColor`, `backgroundColor`, `borderStyle`, `iconPath`, and `selectedIconPath`.
- Use official APIs such as `wx.setTabBarBadge`, `wx.removeTabBarBadge`, `wx.showTabBarRedDot`, `wx.hideTabBarRedDot`, `wx.showTabBar`, and `wx.hideTabBar` when runtime tabBar updates are needed.
- If the UI design requires a highly customized bottom navigation shape, animation, raised center button, oversized icon, or nonstandard layout, adjust the design to official tabBar constraints instead of implementing a custom tabBar.

Anti-overflow rules:

- Prepare normal and selected icons with consistent canvas size, centered artwork, and enough transparent padding.
- Keep label text short and stable, preferably 2-4 Chinese characters. Ask for design adjustment if labels are too long for the official tabBar.
- Verify selected and unselected icon assets do not visually jump, clip, or exceed the official tabBar area.
- Avoid adding fake text, badges, or indicators inside page content near the bottom to simulate tabBar features.
- Ensure fixed submit bars, floating buttons, and list bottoms do not conflict with the official tabBar.
- Rely on WeChat's official tabBar safe-area behavior. Add extra bottom spacing only for page-owned fixed elements above the tabBar, not for a custom tabBar container.

## Figma Icon Assets

When a Figma UI design is available, use the icons from the design instead of recreating them manually.

- Read the actual icon layers/components from Figma and export every icon used by the implemented page as PNG.
- Use exported PNG files in the Mini Program project for icon display.
- Do not redraw Figma icons with approximate CSS, emoji, icon fonts, or hand-written vector code unless the user explicitly asks for that replacement.
- Export separate PNG assets for different icon states shown in Figma, such as normal, selected, disabled, pressed, filled, outline, light, and dark.
- For official tabBar items, export both `iconPath` and `selectedIconPath` PNG assets from the corresponding Figma icons.
- Keep PNG backgrounds transparent unless the design explicitly includes a filled background.
- Preserve the Figma icon's visual bounds, padding, color, opacity, and corner details. Avoid cropping strokes, shadows, badges, or active indicators.
- Name assets predictably, such as `icon-home.png`, `icon-home-active.png`, `icon-search.png`, and place them in the project's existing image asset directory.
- Optimize PNG size before committing when the project has an existing asset compression workflow.
- After importing PNGs, verify on real device that icons are sharp, correctly sized, aligned with text, and not clipped.

## Visual Fidelity Rules

- Convert design dimensions consistently. For 750-wide designs, use `rpx` for layout dimensions and `px` for API-measured system geometry.
- Prefer real text rendering over sliced text images.
- Prefer exported Figma PNG assets for icons instead of approximating icon shapes in code.
- Match font size, line height, weight, color, opacity, spacing, radius, shadows, and border hairlines.
- Use `1rpx` borders for hairlines where appropriate; verify on high-density devices.
- Use `image` `mode` intentionally:
  - `aspectFill` for fixed-ratio thumbnails, avatars, and cards.
  - `widthFix` for content images whose height should follow intrinsic ratio.
  - Avoid accidental stretching unless the asset is designed for scaling.
- Avoid page-level magic numbers. Derive heights from tokens, design measurements, or runtime system metrics.
- Make repeated card/list/button/input styles reusable.
- Ensure long titles, long prices, long names, missing images, and extreme data values do not break layout.
- Keep text readable and unclipped after system font scaling or platform font differences.

## Interaction And State Coverage

Implement expected states even if the design only shows the ideal screen:

- Loading and skeleton.
- Empty data.
- Network error and retry.
- Permission denied or authorization needed.
- Disabled controls.
- Selected and pressed states.
- Long text and multiline content.
- Image load failure.
- Weak network and slow API response.

Interaction checks:

- Button hit areas should be large enough for touch, generally around 44px visual/touch target where possible.
- Prevent scroll penetration behind modals, action sheets, and drawers.
- Handle keyboard raise for forms, sticky submit bars, and bottom input fields.
- Avoid double-submit by locking requests or debouncing critical actions.
- Keep route methods correct: `switchTab` for tab pages, `navigateTo` for stack pages, `redirectTo` when replacing, `reLaunch` only for intentional reset.

## Platform Risks

- Validate basic library compatibility with `wx.canIUse` or documented minimum base-library versions when using newer APIs.
- Do not place `AppSecret`, API secrets, private keys, or privileged tokens in Mini Program frontend code.
- Keep privacy-sensitive UI compliant with WeChat privacy requirements before calling protected APIs.
- Confirm category, authorization, subscription message, location, phone number, payment, customer service, and content safety requirements before launch.
- Optimize large images, long lists, heavy shadows, canvas, video, map, and frequent `setData` updates.
- Use pagination, lazy loading, or virtualized rendering for long lists.
- Avoid excessive package size; split non-critical features into subpackages where appropriate.
- Validate dark mode if the product supports it; otherwise explicitly prevent unreadable color combinations.
- Add concise Chinese comments for complex or important business logic, especially navigation height formulas, capsule avoidance, official tabBar constraints, permission gates, payment/submit flows, route fallbacks, and non-obvious compatibility handling. Comment why the logic exists, not every obvious assignment.

## Review Checklist

Before delivery, verify:

- Top navigation covers status bar and capsule height correctly.
- No business action overlaps or occupies the WeChat capsule area.
- Page content is not hidden under the custom navigation.
- Bottom navigation uses official WeChat Mini Program `tabBar`, with no custom `custom-tab-bar` or page-level imitation.
- Official tabBar icons and text labels have no clipping, jumping, or overflow.
- Figma icons used by the UI are exported as PNG and referenced from the Mini Program project.
- Official tabBar normal and selected icons use PNG assets exported from Figma.
- Bottom safe area is handled by the official tabBar; page-owned fixed bottom elements do not conflict with it.
- Last scroll content remains visible above the tabBar or fixed submit bar.
- UI tokens match the design and are reused across pages.
- Loading, empty, error, disabled, selected, long-text, and image-failure states exist.
- Complex and important business logic includes concise Chinese comments.
- Real-device screenshots match the design within acceptable platform rendering differences.
- No frontend secrets or review-sensitive capabilities are introduced accidentally.
