local wezterm = require("wezterm")
local config = {}

if wezterm.config_builder then
	config = wezterm.config_builder()
end

config.font = wezterm.font("IosevkaTerm Nerd Font Mono")

config.font_size = 14.0
-- config.color_scheme = "Catppuccin Mocha (Gogh)"
config.color_scheme = "Catppuccin Mocha"
-- config.color_scheme = "Tokyo Night (Gogh)"
-- config.color_scheme = "Frontend Galaxy (Gogh)"
-- config.color_scheme = "Ef-Elea-Dark"

config.use_fancy_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true

config.default_cursor_style = 'SteadyBar'

config.scrollback_lines = 5000

config.window_decorations = "TITLE | RESIZE | MACOS_USE_BACKGROUND_COLOR_AS_TITLEBAR_COLOR"

local function darken(hex, factor)
	return tostring(wezterm.color.parse(hex):darken(factor))
end

local function lighten(hex, factor)
	return tostring(wezterm.color.parse(hex):lighten(factor))
end

-- Derive the tab bar colors from the active color scheme.
local scheme = wezterm.color.get_builtin_schemes()[config.color_scheme]
local bar_bg = darken(scheme.background, 0.1)
local dim_fg = scheme.brights[8]
local active_tab = (scheme.tab_bar or {}).active_tab or {
	bg_color = scheme.ansi[6],
	fg_color = scheme.background
}

config.window_frame = {
	font = wezterm.font { family = 'IosevkaTerm Nerd Font', weight = 'Bold', style = "Italic" },
	font_size = 10.0,
	active_titlebar_bg = bar_bg,
	inactive_titlebar_bg = bar_bg,
}

config.window_background_opacity = 0.97
config.text_background_opacity = 0.50

config.colors = {
	tab_bar = {
		background = bar_bg,
		inactive_tab_edge = scheme.selection_bg,
		active_tab = {
			bg_color = active_tab.bg_color,
			fg_color = active_tab.fg_color,
		},
		inactive_tab = {
			bg_color = darken(scheme.background, 0.05),
			fg_color = dim_fg,
		},
		inactive_tab_hover = {
			bg_color = lighten(scheme.background, 0.1),
			fg_color = scheme.foreground,
		},
		new_tab = {
			bg_color = lighten(scheme.background, 0.1),
			fg_color = dim_fg,
		},
		new_tab_hover = {
			bg_color = lighten(scheme.background, 0.2),
			fg_color = scheme.foreground,
		},
	},
}

config.keys = {
	{ key = 'UpArrow', mods = 'SUPER', action = wezterm.action.ScrollByLine(-1) },
	{ key = 'DownArrow', mods = 'SUPER', action = wezterm.action.ScrollByLine(1) },
	{ key = 'UpArrow', mods = 'SUPER|SHIFT', action = wezterm.action.ScrollByPage(-0.5) },
	{ key = 'DownArrow', mods = 'SUPER|SHIFT', action = wezterm.action.ScrollByPage(0.5) },
	{ key = 'j', mods = 'SUPER', action = wezterm.action.ScrollByLine(1) },
	{ key = 'k', mods = 'SUPER', action = wezterm.action.ScrollByLine(-1) },
	{ key = 'j', mods = 'SUPER|SHIFT', action = wezterm.action.ScrollByPage(0.5) },
	{ key = 'k', mods = 'SUPER|SHIFT', action = wezterm.action.ScrollByPage(-0.5) },
	{ key = 'h', mods = 'SUPER', action = wezterm.action.ScrollToPrompt(-1) },
	{ key = 'l', mods = 'SUPER', action = wezterm.action.ScrollToPrompt(1) },
	{ key = 'h', mods = 'SUPER|SHIFT', action = wezterm.action.ScrollToTop },
	{ key = 'l', mods = 'SUPER|SHIFT', action = wezterm.action.ScrollToBottom },
	{ key = 'x', mods = 'SUPER', action = wezterm.action.ActivateCopyMode },
}

return config
