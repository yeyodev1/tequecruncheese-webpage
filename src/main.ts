import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUserStore } from '@/stores/user'
import '@/styles/global.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Restore auth state from localStorage before first render
const userStore = useUserStore()
userStore.hydrate()

app.mount('#app')
