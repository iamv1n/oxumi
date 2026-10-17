import { theme, type ThemeConfig } from "antd";
import { STATUS_TINT } from "./palettes";
import {
  type Brand,
  BRANDS,
  DEFAULT_BRAND,
  darkPalette,
  type Palette,
  paletteFor,
  radius,
  font,
  shadowFor,
  type ThemeMode,
} from "./tokens";

// Ant Design, dressed in our tokens. It computes hover, border and background
// shades from these in JavaScript, so it gets real colour values from the
// palette for the theme and mode rather than the CSS variables components use.
function build(mode: ThemeMode, brand: Brand): ThemeConfig {
  const color = paletteFor(mode, brand);
  const light = mode === "light";

  return {
    algorithm: light ? theme.defaultAlgorithm : theme.darkAlgorithm,
    token: {
      colorPrimary: color.accent,
      colorInfo: color.info,
      colorSuccess: color.success,
      colorWarning: color.warning,
      colorError: color.danger,
      colorLink: color.accentText,
      colorBgBase: light ? color.surface : color.canvas,
      colorBgLayout: color.canvas,
      colorBgContainer: color.surface,
      colorBgElevated: color.elevated,
      colorBgSpotlight: color.overlay,
      colorBorder: color.lineStrong,
      colorBorderSecondary: color.line,
      colorText: color.fg,
      colorTextSecondary: color.fgMuted,
      colorTextTertiary: color.fgSubtle,
      colorTextQuaternary: color.fgFaint,
      fontFamily: font.sans,
      fontFamilyCode: font.mono,
      fontSize: 14,
      borderRadius: parseInt(radius.control),
      borderRadiusLG: parseInt(radius.card),
      boxShadowSecondary: shadowFor(mode, brand).pop,
      controlHeight: 32,
      wireframe: false,
      // On white, saffron is a fill only. Wherever Ant Design would write
      // text in the primary colour, use the amber that is readable there.
      ...(light && {
        colorLinkHover: color.accentTextHover,
        colorLinkActive: color.accentTextHover,
        colorPrimaryText: color.accentText,
        colorPrimaryTextHover: color.accentTextHover,
        colorPrimaryTextActive: color.accentTextHover,
        ...statusShades("Success", color.success, STATUS_TINT.success, color.surface),
        ...statusShades("Warning", color.warning, STATUS_TINT.warning, color.surface),
        ...statusShades("Error", color.danger, STATUS_TINT.danger, color.surface),
        ...statusShades("Info", color.info, STATUS_TINT.info, color.surface),
      }),
    },
    components: {
      // Amber buttons carry dark text. Set here rather than through the global
      // "text on solid colour" token, which tooltips and badges also read.
      Button: {
        primaryColor: color.accentFg,
        primaryShadow: "none",
        defaultShadow: "none",
        dangerShadow: "none",
        fontWeight: 500,
        // Solid red buttons: white on the light palette's deep red, dark on
        // the dark palette's coral.
        dangerColor: light ? "#ffffff" : color.canvas,
        ...(light && {
          defaultHoverColor: color.accentText,
          defaultActiveColor: color.accentTextHover,
          defaultHoverBorderColor: color.accentLine,
          defaultActiveBorderColor: color.accentLine,
        }),
      },
      // Tooltips are dark in both modes: light text on a near-black bubble.
      Tooltip: light
        ? { colorBgSpotlight: LIGHT_TOOLTIP, colorTextLightSolid: darkPalette.fg }
        : { colorBgSpotlight: color.overlay, colorTextLightSolid: color.fg },
      Layout: { siderBg: color.surface, headerBg: color.surface, bodyBg: color.canvas },
      Menu: { itemBg: "transparent", itemSelectedBg: color.accentSoft, itemSelectedColor: color.accentText, activeBarBorderWidth: 0 },
      Table: { headerBg: color.surface, rowHoverBg: color.hover, borderColor: color.line },
      Modal: { contentBg: color.elevated, headerBg: color.elevated },
      Card: { colorBgContainer: color.surface },
      Tabs: {
        itemSelectedColor: color.fg,
        inkBarColor: color.accentLine,
        itemColor: color.fgMuted,
        ...(light && { itemHoverColor: color.fg, itemActiveColor: color.fg }),
      },
      ...(light ? lightControls(color) : darkControls(color)),
    },
  };
}

const LIGHT_TOOLTIP = "#24242c";

// "#rrggbb" mixed into another, as a solid colour.
function blend(hex: string, amount: number, into: string): string {
  const channels = (value: string) => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16));
  const [from, to] = [channels(hex), channels(into)];
  return `#${from
    .map((channel, i) => Math.round(channel * amount + to[i]! * (1 - amount)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

// Ant Design derives a status colour's backgrounds and borders by brightening
// it a fixed amount, which assumes a bright seed. The light palette's status
// colours are deep (so they read as text on white), and that maths turns
// them into muddy greys: alerts and filled tags came out olive. So in the
// light the shades are stated outright: text in the deep \`tone\`, backgrounds
// and borders as tints of \`bright\` (the same hue, as in the palette's soft
// colours) on white.
function statusShades(
  name: "Success" | "Warning" | "Error" | "Info",
  tone: string,
  bright: string,
  paper: string,
) {
  return {
    [`color${name}Bg`]: blend(bright, 0.14, paper),
    [`color${name}BgHover`]: blend(bright, 0.22, paper),
    [`color${name}BgFilledHover`]: blend(bright, 0.26, paper),
    [`color${name}BgActive`]: blend(bright, 0.3, paper),
    [`color${name}Border`]: blend(bright, 0.45, paper),
    [`color${name}BorderHover`]: blend(bright, 0.7, paper),
    [`color${name}Hover`]: blend(tone, 0.85, paper),
    [`color${name}Active`]: blend(tone, 0.88, "#000000"),
    [`color${name}Text`]: tone,
    [`color${name}TextHover`]: blend(tone, 0.85, paper),
    [`color${name}TextActive`]: blend(tone, 0.88, "#000000"),
  };
}

// Controls that draw a white glyph on the primary colour, or a ring in it:
// a bright accent is about 2:1 against white, so in the light these use the
// deeper accent (3:1 or better), as do the borders of focused fields.
function lightControls(color: Palette): ThemeConfig["components"] {
  const strong = {
    colorPrimary: color.accentLine,
    colorPrimaryHover: color.accentText,
    colorPrimaryBorder: color.accentLine,
  };
  const field = { hoverBorderColor: color.accentLine, activeBorderColor: color.accentLine };
  return {
    Checkbox: strong,
    Radio: strong,
    Switch: strong,
    Slider: strong,
    Steps: strong,
    Pagination: { colorPrimary: color.accentText, colorPrimaryHover: color.accentTextHover },
    Input: field,
    InputNumber: field,
    Select: field,
    DatePicker: field,
    Spin: { colorPrimary: color.accentLine },
  };
}

// The dark palettes' fills are bright (saffron, mint, coral), and Ant Design
// writes white on them by default: 1.8:1 for the tick of a checked box. These
// carry dark text and glyphs instead, like the primary button.
function darkControls(color: Palette): ThemeConfig["components"] {
  return {
    Checkbox: { colorWhite: color.accentFg },
    Radio: { colorWhite: color.accentFg, buttonSolidCheckedColor: color.accentFg },
    Tag: { colorTextLightSolid: color.canvas },
    Badge: { colorTextLightSolid: color.canvas },
  };
}

const themes = new Map<string, ThemeConfig>();
for (const brand of BRANDS) {
  for (const mode of ["dark", "light"] as const) themes.set(`${brand}:${mode}`, build(mode, brand));
}

// The Ant Design theme for a mode and brand theme. Returns the same object
// each time, so it is safe to pass straight to <ConfigProvider>.
export const antdTheme = (mode: ThemeMode, brand: Brand = DEFAULT_BRAND): ThemeConfig =>
  themes.get(`${brand}:${mode}`)!;
