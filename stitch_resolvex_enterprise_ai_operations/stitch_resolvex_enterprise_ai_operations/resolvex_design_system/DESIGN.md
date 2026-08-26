---
name: ResolveX Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#524435'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#857463'
  outline-variant: '#d7c3af'
  surface-tint: '#845400'
  primary: '#845400'
  on-primary: '#ffffff'
  primary-container: '#d98f16'
  on-primary-container: '#4d2f00'
  inverse-primary: '#ffb95a'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#006590'
  on-tertiary: '#ffffff'
  tertiary-container: '#2fa8e8'
  on-tertiary-container: '#003a55'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb6'
  primary-fixed-dim: '#ffb95a'
  on-primary-fixed: '#2a1800'
  on-primary-fixed-variant: '#643f00'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#c8e6ff'
  tertiary-fixed-dim: '#88ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  trace:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  table_row_height: 48px
  sidebar_width: 260px
---

## Brand & Style
The design system is engineered for high-stakes, autonomous AI customer resolution. It embodies an **Enterprise SaaS Minimalism** style—prioritizing information density, technical precision, and user trust. 

The aesthetic is "AI-native," meaning it leans into the mechanical nature of the engine (through monospaced traces and systematic timelines) while maintaining a refined, professional corporate shell. The interface uses heavy whitespace for focus, thin borders for structure, and a restrained application of color to signify intent rather than decoration.

**Target Response:** Efficiency, reliability, and total transparency in automated decision-making.

## Colors
The palette is dominated by neutral slate and stone tones to ensure the **#D98F16 (Orange)** identity color stands out as a "beacon of action." 

- **Primary Identity:** Use Orange for CTAs, active states in navigation, and positive brand recognition.
- **Accent Blue:** Reserved for links and informational indicators that require distinction from primary brand actions.
- **Surface Strategy:** In Dark Mode, use `Elevated (#172033)` for floating panels to maintain depth over the base background.
- **Density Tinting:** Use Soft tints (`#F8E7C6`, `#DCFCE7`) as background fills for status badges and active sidebar items to maintain legibility in high-density data views.

## Typography
**Inter** provides the utilitarian foundation. **JetBrains Mono** is introduced for "Trace" views—AI logs, policy scripts, and data outputs—to signal technical transparency.

- **Contrast:** Always use `Text Primary` for headings and `Text Secondary` for supporting body text.
- **Scale:** On mobile devices, `Display` should scale down to 30px and `H1` to 24px.
- **Weight:** Avoid using weights below 400 for accessibility. Use 600+ specifically for hierarchy within dense lists and tables.

## Layout & Spacing
This design system utilizes a **Fixed-Fluid Hybrid** grid. The sidebar is fixed at 260px, while the main content area utilizes a 12-column fluid grid with 24px gutters.

- **High Density:** Vertical spacing is tight. Table rows are restricted to a 48px–56px height range to allow maximum data visibility.
- **Safe Areas:** Maintain a 24px margin around the primary container on desktop, scaling to 16px on mobile.
- **Sidebar:** Desktop-first layout. On mobile, the sidebar collapses into a bottom navigation bar or a hamburger overlay.

## Elevation & Depth
Depth is conveyed through **Low-Contrast Outlines** and **Tonal Layering** rather than heavy shadows.

- **Layer 0 (Background):** Primary background color.
- **Layer 1 (Surface):** White (Light) or Dark Blue-Gray (Dark) cards with a 1px solid border.
- **Layer 2 (Popovers/Modals):** Subtle ambient shadow (Blur 12px, Opacity 5%, Color: Neutral) to provide separation without breaking the minimal aesthetic.
- **Active State:** Use a 2px "Soft Orange" left-border for active items in sidebar lists to indicate current focus without overwhelming the user.

## Shapes
The shape language is "Professional-Soft." We avoid aggressive sharp corners to remain approachable, but keep radii restrained to maintain a serious SaaS tone.

- **Cards/Containers:** 12px radius provides a clear containerization of complex AI data modules.
- **Buttons/Inputs:** 8px and 6px respectively. The slight variation in radius between containers and interactive elements helps the user subconsciously distinguish between "content" and "action."

## Components
### Resolution Timeline (Signature Pattern)
The core AI visualization. It must follow a linear horizontal or vertical flow: **Understand → Investigate → Policy → Decide → Act → Verify → Resolve**. 
- Use a solid orange line for "Completed" steps.
- Use a dashed gray line for "Pending" steps.
- Active steps should feature a pulsing Soft Orange ring around the node.

### Buttons
- **Primary:** Background `#D98F16`, Text `White`, Radius `8px`.
- **Secondary:** Background `Transparent`, Border `1px Solid #E5E7EB`, Text `Neutral Primary`.
- **Ghost:** No border, Text `Neutral Secondary`, used for low-priority actions in dense tables.

### Tables
- **Header:** Background `#F8FAFC`, uppercase 12px `label` font.
- **Rows:** 48px height, 1px bottom border. Hover state should use a very subtle gray tint to assist line-tracking.

### Sidebar
- Fixed width. Active menu items use a combination of `Soft Orange` background fill and a `Primary Orange` 3px vertical bar on the leading edge.

### Input Fields
- Use a 1px border. On focus, the border shifts to `Primary Orange` with a 2px outer glow of 10% opacity orange.