'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

type ThemeVariant = {
  bg: string;
  activeBg: string;
  text: string;
  border: string;
  hover: string;
};

type Theme = ThemeVariant & {
  dark?: ThemeVariant;
};

/** User-facing label in settings; `white` is the app default sidebar style */
export const SIDEBAR_COLOR_LABELS: Record<string, string> = {
  white: 'Default',
};

/** Hex code for each theme name — stored in DB instead of the name */
export const SIDEBAR_COLOR_HEX: Record<string, string> = {
  white:        '#FFFFFF',
  pastelBlue:   '#BFDBFE',
  pink:         '#EC4899',
  pastelGreen:  '#BBF7D0',
  pastelPink:   '#FBCFE8',
  pastelPurple: '#E9D5FF',
  pastelTeal:   '#99F6E4',
  cyanBlue:     '#22D3EE',
  orangeRed:    '#FB923C',
  purplePink:   '#A855F7',
};

/** Reverse lookup: hex code → theme name (for backward compat with old DB values) */
export const SIDEBAR_HEX_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(SIDEBAR_COLOR_HEX).map(([name, hex]) => [hex.toUpperCase(), name])
);

/**
 * Resolve any stored theme value (name or hex) to the canonical theme name
 * used by SIDEBAR_COLORS. Handles backward compat with old DB values that
 * stored names like "pastelPink" instead of hex codes.
 */
export function resolveThemeName(stored: string | null | undefined): string {
  if (!stored) return 'white';
  // Direct name match
  if (SIDEBAR_COLORS[stored]) return stored;
  // Hex code match (case-insensitive)
  const name = SIDEBAR_HEX_TO_NAME[stored.toUpperCase()];
  if (name) return name;
  // Unknown value — fallback to white
  return 'white';
}

/**
 * Convert a theme name to its hex code for DB storage.
 * Returns the name as-is if no mapping found (shouldn't happen).
 */
export function themeNameToHex(name: string): string {
  return SIDEBAR_COLOR_HEX[name] || name;
}

export const SIDEBAR_COLORS: Record<string, Theme> = {
  white: {
    bg: "bg-sidebar",
    activeBg: "bg-sidebar-accent",
    text: "text-sidebar-foreground",
    border: "border-sidebar-border",
    hover: "hover:bg-sidebar-accent/50",
    dark: {
      bg: "bg-sidebar",
      activeBg: "bg-sidebar-accent",
      text: "text-sidebar-foreground",
      border: "border-sidebar-border",
      hover: "hover:bg-sidebar-accent/50"
    }
  },
  pastelBlue: {
    bg: "bg-blue-200",
    activeBg: "bg-blue-300",
    text: "text-blue-800",
    border: "border-blue-300",
    hover: "hover:bg-blue-100",
    dark: {
      bg: "bg-blue-900",
      activeBg: "bg-blue-800",
      text: "text-blue-100",
      border: "border-blue-800",
      hover: "hover:bg-blue-700"
    }
  },
  pink: {
    bg: "bg-pink-500",
    activeBg: "bg-pink-600",
    text: "text-white",
    border: "border-pink-600",
    hover: "hover:bg-pink-400",
    dark: {
      bg: "bg-pink-900",
      activeBg: "bg-pink-800",
      text: "text-pink-100",
      border: "border-pink-800",
      hover: "hover:bg-pink-700"
    }
  },
  pastelGreen: {
    bg: "bg-green-200",
    activeBg: "bg-green-300",
    text: "text-green-800",
    border: "border-green-300",
    hover: "hover:bg-green-100",
    dark: {
      bg: "bg-green-900",
      activeBg: "bg-green-800",
      text: "text-green-100",
      border: "border-green-800",
      hover: "hover:bg-green-700"
    }
  },
  pastelPink: {
    bg: "bg-pink-200",
    activeBg: "bg-pink-300",
    text: "text-pink-800",
    border: "border-pink-300",
    hover: "hover:bg-pink-100",
    dark: {
      bg: "bg-pink-900",
      activeBg: "bg-pink-800",
      text: "text-pink-100",
      border: "border-pink-800",
      hover: "hover:bg-pink-700"
    }
  },
  pastelPurple: {
    bg: "bg-purple-200",
    activeBg: "bg-purple-300",
    text: "text-purple-800",
    border: "border-purple-300",
    hover: "hover:bg-purple-100",
    dark: {
      bg: "bg-purple-900",
      activeBg: "bg-purple-800",
      text: "text-purple-100",
      border: "border-purple-800",
      hover: "hover:bg-purple-700"
    }
  },
  pastelTeal: {
    bg: "bg-teal-200",
    activeBg: "bg-teal-300",
    text: "text-teal-800",
    border: "border-teal-300",
    hover: "hover:bg-teal-100",
    dark: {
      bg: "bg-teal-900",
      activeBg: "bg-teal-800",
      text: "text-teal-100",
      border: "border-teal-800",
      hover: "hover:bg-teal-700"
    }
  },
  cyanBlue: {
    bg: "bg-gradient-to-r from-cyan-400 to-blue-500",
    activeBg: "bg-gradient-to-r from-cyan-500 to-blue-600",
    text: "text-white",
    border: "border-cyan-500",
    hover: "hover:from-cyan-300 hover:to-blue-400",
    dark: {
      bg: "bg-gradient-to-r from-cyan-900 to-blue-900",
      activeBg: "bg-gradient-to-r from-cyan-800 to-blue-800",
      text: "text-cyan-100",
      border: "border-cyan-800",
      hover: "hover:from-cyan-700 hover:to-blue-700"
    }
  },
  orangeRed: {
    bg: "bg-gradient-to-r from-orange-400 to-red-500",
    activeBg: "bg-gradient-to-r from-orange-500 to-red-600",
    text: "text-white",
    border: "border-orange-500",
    hover: "hover:from-orange-300 hover:to-red-400",
    dark: {
      bg: "bg-gradient-to-r from-orange-900 to-red-900",
      activeBg: "bg-gradient-to-r from-orange-800 to-red-800",
      text: "text-orange-100",
      border: "border-orange-800",
      hover: "hover:from-orange-700 hover:to-red-700"
    }
  },
  purplePink: {
    bg: "bg-gradient-to-r from-purple-500 to-pink-500",
    activeBg: "bg-gradient-to-r from-purple-600 to-pink-600",
    text: "text-white",
    border: "border-purple-600",
    hover: "hover:from-purple-400 hover:to-pink-400",
    dark: {
      bg: "bg-gradient-to-r from-purple-900 to-pink-900",
      activeBg: "bg-gradient-to-r from-purple-800 to-pink-800",
      text: "text-purple-100",
      border: "border-purple-800",
      hover: "hover:from-purple-700 hover:to-pink-700"
    }
  }
};

interface SidebarColorPickerProps {
  isCollapsed: boolean;
  sidebarTheme: string;
  onThemeChange: (theme: string) => void;
  isInSettings?: boolean;
}

export function SidebarColorPicker({
  isCollapsed,
  sidebarTheme,
  onThemeChange,
  isInSettings = false
}: SidebarColorPickerProps) {
  const { resolvedTheme } = useTheme()
  const [showColorPicker, setShowColorPicker] = useState(false)

  const getCurrentTheme = (themeName: string): ThemeVariant => {
    const theme = SIDEBAR_COLORS[themeName] || SIDEBAR_COLORS.white
    return resolvedTheme === 'dark' && theme.dark ? theme.dark : theme
  }

  // Hide in collapsed sidebar or dark theme when not in settings
  if ((isCollapsed || resolvedTheme === 'dark') && !isInSettings) return null

  return (
    <div className={cn("relative", isInSettings ? "w-full" : "")}>
      {isInSettings ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {Object.entries(SIDEBAR_COLORS).map(([name, theme]) => {
            const currentBg = resolvedTheme === 'dark' && theme.dark ? theme.dark.bg : theme.bg
            const currentBorder = resolvedTheme === 'dark' && theme.dark ? theme.dark.border : theme.border
            const currentText = resolvedTheme === 'dark' && theme.dark ? theme.dark.text : theme.text
            const label = SIDEBAR_COLOR_LABELS[name] ?? name

            return (
              <button
                key={name}
                type="button"
                className={cn(
                  "h-9 w-full rounded-md border transition-all flex items-center justify-center px-1",
                  "hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2",
                  currentBg,
                  currentBorder,
                  sidebarTheme === name ? "ring-2 ring-offset-2 ring-blue-500" : "",
                  name === "white" && resolvedTheme !== "dark"
                    ? "text-slate-700"
                    : currentText
                )}
                onClick={() => {
                  onThemeChange(name)
                  setShowColorPicker(false)
                }}
                title={name === "white" ? "Default — white sidebar (light) / dark gray (dark mode)" : name}
              >
                <span className="text-[10px] font-medium truncate max-w-full leading-tight sm:text-xs">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={cn(
              "h-8 w-8 rounded-full",
              resolvedTheme === 'dark'
                ? 'text-white hover:bg-white/10'
                : 'text-black hover:bg-gray-100'
            )}
          >
            <Palette size={16} />
          </Button>

          {showColorPicker && (
            <div className={cn(
              "absolute top-full left-0 p-3 border rounded-md shadow-lg z-50 mt-1",
              getCurrentTheme(sidebarTheme).bg,
              getCurrentTheme(sidebarTheme).border
            )}>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(SIDEBAR_COLORS).map(([name, theme]) => {
                  const currentBg = resolvedTheme === 'dark' && theme.dark ? theme.dark.bg : theme.bg
                  const currentBorder = resolvedTheme === 'dark' && theme.dark ? theme.dark.border : theme.border

                  return (
                    <button
                      key={name}
                      className={cn(
                        "h-5 w-5 rounded-md border transition-all",
                        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2",
                        currentBg,
                        currentBorder,
                        sidebarTheme === name ? "ring-2 ring-offset-2 ring-blue-500" : ""
                      )}
                      onClick={() => {
                        onThemeChange(name)
                        setShowColorPicker(false)
                      }}
                      title={name}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}