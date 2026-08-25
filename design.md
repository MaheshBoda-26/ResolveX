# ResolveX Design System

## Color palette

### Brand
| Token | Hex | Use |
|---|---|---|
| Primary | `#D98F16` | Primary actions and brand accents |
| Primary hover | `#B87510` | Hover/pressed |
| Primary soft | `#F8E7C6` | Light brand surfaces |
| Primary dark soft | `#3A2A12` | Dark brand surfaces |

### Secondary
| Token | Hex | Use |
|---|---|---|
| Secondary | `#1F2937` | Navigation and strong neutral UI |
| Secondary soft | `#E5E7EB` | Light neutral surfaces |

### Accent
| Token | Hex | Use |
|---|---|---|
| Accent | `#2563EB` | Links and informational agent states |
| Accent soft | `#DBEAFE` | Informational backgrounds |

### Semantic
| Token | Hex |
|---|---|
| Success | `#15803D` |
| Success soft | `#DCFCE7` |
| Warning | `#B45309` |
| Warning soft | `#FEF3C7` |
| Error | `#B91C1C` |
| Error soft | `#FEE2E2` |
| Info | `#1D4ED8` |

### Neutral
| Token | Light | Dark |
|---|---|---|
| Background | `#F8FAFC` | `#0B0F14` |
| Surface | `#FFFFFF` | `#111827` |
| Surface elevated | `#FFFFFF` | `#172033` |
| Border | `#E5E7EB` | `#273244` |
| Text primary | `#111827` | `#F9FAFB` |
| Text secondary | `#4B5563` | `#CBD5E1` |
| Text muted | `#6B7280` | `#94A3B8` |

## Theme rules
- Support light and dark themes with a toggle.
- Default to system preference.
- Persist theme choice locally.
- Use semantic tokens instead of hard-coded component colors.
- Maintain WCAG AA contrast.
- Do not use primary orange as large body text where contrast is insufficient.
- Use deep neutral surfaces instead of pure black in dark mode.
- Never use color alone to communicate agent status.

## Typography

### Font
Inter.

### Scale
| Style | Size | Weight | Line height |
|---|---:|---:|---:|
| Display | 36px | 700 | 44px |
| H1 | 30px | 700 | 38px |
| H2 | 24px | 700 | 32px |
| H3 | 20px | 600 | 28px |
| Body large | 16px | 400 | 24px |
| Body | 14px | 400 | 20px |
| Body medium | 14px | 500 | 20px |
| Small | 12px | 500 | 18px |
| Caption | 11px | 500 | 16px |
| Trace mono | 12px | 400 | 18px |

Use monospace only for tool names, IDs, payloads, and technical trace data.

## Spacing and layout scale

Use a 4px base grid:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

- Page padding: 24–40px.
- Card padding: 20–24px.
- Standard control height: 40px.
- Primary button: 40–44px.
- Card radius: 12px.
- Large container radius: 16px.
- Prefer borders and subtle elevation over heavy shadows.
- Target desktop dashboard width: 1280px.
- Preserve the conversation and trace workflow on small screens.

## Component style notes

### Buttons
- Primary: `#D98F16` with accessible dark text.
- Secondary: neutral surface with border.
- Destructive: error semantic color.
- Preserve button dimensions during loading.

### Cards
- Light: white/elevated surfaces.
- Dark: `#111827` or `#172033`.
- 1px borders.
- Simple hierarchy: title, supporting text, content, action.

### Inputs
- Minimum 40px height.
- Clear accent focus ring.
- Explicit labels.
- Inline validation.
- Voice input shows listening/processing state.

### Status pills
Use labels such as `Listening`, `Processing`, `Verified`, `Escalated`, `Failed`, and `Human review`. Pair color with text.

### Agent trace
- Use a vertical or horizontal timeline.
- Show agent, action, status, and useful timing.
- Expose structured tool inputs/results.
- Visually distinguish policy evidence from generated text.
- Give verification a clear pass/fail state.

### Human handoff
Use an operational review card containing:
- Customer
- Issue
- Evidence
- Relevant policy
- Actions completed
- Reason for escalation
- Recommended next action
