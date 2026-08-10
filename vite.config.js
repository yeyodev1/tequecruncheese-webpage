import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
    plugins: [vue()],
    css: {
        preprocessorOptions: {
            scss: {
                // Tokens only — this is prepended to every SCSS block, so it must not
                // emit CSS. The global stylesheet is loaded once from main.ts.
                additionalData: `@use "@/styles/tokens" as *;`,
            },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        target: 'esnext',
    },
    server: {
        allowedHosts: [
            'testing-storybrand-frontend.bakano.ec',
        ],
    },
});
