/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      "colors": {
                "outline-variant": "#bfc7d4",
                "on-primary-container": "#002e54",
                "surface-container-low": "#f0f3fc",
                "secondary": "#712ae2",
                "on-secondary-fixed-variant": "#5a00c6",
                "on-primary-fixed": "#001c37",
                "on-surface": "#181c22",
                "on-primary": "#ffffff",
                "background": "#f8f9ff",
                "surface-variant": "#dfe2eb",
                "surface": "#f8f9ff",
                "inverse-surface": "#2c3137",
                "primary-fixed-dim": "#a0caff",
                "on-tertiary-container": "#422700",
                "surface-dim": "#d7dae2",
                "surface-bright": "#f8f9ff",
                "on-surface-variant": "#404752",
                "on-tertiary-fixed": "#2a1700",
                "tertiary": "#855300",
                "on-secondary-fixed": "#25005a",
                "inverse-on-surface": "#eef1f9",
                "error-container": "#ffdad6",
                "on-tertiary": "#ffffff",
                "on-background": "#181c22",
                "surface-container-highest": "#dfe2eb",
                "surface-container": "#ebeef6",
                "outline": "#707884",
                "tertiary-fixed": "#ffddb8",
                "secondary-fixed": "#eaddff",
                "primary-fixed": "#d2e4ff",
                "on-error-container": "#93000a",
                "surface-tint": "#0061a6",
                "secondary-fixed-dim": "#d2bbff",
                "tertiary-fixed-dim": "#ffb95f",
                "primary": "#0061a6",
                "on-tertiary-fixed-variant": "#653e00",
                "on-secondary-container": "#fffbff",
                "error": "#ba1a1a",
                "surface-container-lowest": "#ffffff",
                "secondary-container": "#8a4cfc",
                "tertiary-container": "#cf8400",
                "primary-container": "#2198fa",
                "on-primary-fixed-variant": "#00497e",
                "surface-container-high": "#e5e8f1",
                "on-secondary": "#ffffff",
                "on-error": "#ffffff",
                "inverse-primary": "#a0caff"
        },
        "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
        },
        "spacing": {
                "gutter": "20px",
                "lg": "24px",
                "unit": "4px",
                "xl": "32px",
                "md": "16px",
                "sm": "8px",
                "margin-page": "40px",
                "xs": "4px"
        },
        "fontFamily": {
                "h3": [
                        "Poppins"
                ],
                "body-md": [
                        "Inter"
                ],
                "button": [
                        "Poppins"
                ],
                "h2": [
                        "Poppins"
                ],
                "body-sm": [
                        "Inter"
                ],
                "display": [
                        "Poppins"
                ],
                "body-lg": [
                        "Inter"
                ],
                "label-caps": [
                        "Inter"
                ],
                "h1": [
                        "Poppins"
                ]
        },
        "fontSize": {
                "h3": [
                        "20px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "500"
                        }
                ],
                "body-md": [
                        "16px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "button": [
                        "15px",
                        {
                                "lineHeight": "1",
                                "letterSpacing": "0.01em",
                                "fontWeight": "500"
                        }
                ],
                "h2": [
                        "24px",
                        {
                                "lineHeight": "1.4",
                                "fontWeight": "600"
                        }
                ],
                "body-sm": [
                        "14px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                        }
                ],
                "display": [
                        "48px",
                        {
                                "lineHeight": "1.2",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "600"
                        }
                ],
                "body-lg": [
                        "18px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "label-caps": [
                        "12px",
                        {
                                "lineHeight": "1.2",
                                "letterSpacing": "0.05em",
                                "fontWeight": "600"
                        }
                ],
                "h1": [
                        "32px",
                        {
                                "lineHeight": "1.3",
                                "fontWeight": "600"
                        }
                ]
        }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
