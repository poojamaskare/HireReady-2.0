import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
    globalCss: {
        "html, body": {
            bg: "bg",
            color: "fg",
            minHeight: "100vh",
        },
    },
    theme: {
        tokens: {
            colors: {
                brand: {
                    50: { value: "#e6f0ff" },
                    100: { value: "#b3d1ff" },
                    200: { value: "#80b3ff" },
                    300: { value: "#4d94ff" },
                    400: { value: "#1a75ff" },
                    500: { value: "#005ce6" },
                    600: { value: "#0047b3" },
                    700: { value: "#003380" },
                    800: { value: "#001f4d" },
                    900: { value: "#000a1a" },
                },
            },
        },
    },
})

export const system = createSystem(defaultConfig, config)
