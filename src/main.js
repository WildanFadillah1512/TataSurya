import { createApp } from 'vue'
import { createPinia } from 'pinia' // Tambah ini
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia()) // Pasang Pinia
app.use(router)
app.mount('#app')