local wezterm = require("wezterm")
local config = {}

if wezterm.config_builder then
	config = wezterm.config_builder()
end

config.font = wezterm.font("IosevkaTerm Nerd Font Mono")
config.font_size = 16.0
config.color_scheme = "One Dark (Gogh)"
config.color_scheme = "Catppuccin Mocha (Gogh)"
config.color_scheme = "Frontend Galaxy (Gogh)"
config.color_scheme = "Hybrid"
config.color_scheme = "N0Tch2K (Gogh)"
config.color_scheme = "Nightfly (Gogh)"
config.color_scheme = "Ef-Dark"
config.color_scheme = "Ef-Elea-Dark"

config.use_fancy_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true

config.window_frame = {
	font = wezterm.font("IosevkaTerm Nerd Font Mono"),
	font_size = 16.0,
	active_titlebar_bg = '#232323',
	inactive_titlebar_bg = '#232323',
}

config.colors = {
	tab_bar = {
		inactive_tab_edge = '#7f7f10',
		active_tab = {
			bg_color = '#303030',
			fg_color = '#d0d0d0',
		},
		inactive_tab = {
			bg_color = '#222222',
			fg_color = '#c0c0c0',
		},
		inactive_tab_hover = {
			bg_color = '#252525',
			fg_color = '#e0e0e0',
		},
		new_tab = {
			bg_color = '#252525',
			fg_color = '#c0c0c0',
		},
		new_tab_hover = {
			bg_color = '#2a2a2a',
			fg_color = '#e0e0e0',
		},
	},
}

return config
