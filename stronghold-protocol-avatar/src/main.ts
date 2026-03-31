import { createApp } from 'vue'
import App from './App.vue'
import BotRender from './components/BotRender.vue'
import 'cropper-next-vue/style.css'
import 'vfonts/Lato.css'
import './style.css'

const path = window.location.pathname

if (path.includes('/bot-render')) {
  createApp(BotRender).mount('#app')
} else {
  createApp(App).mount('#app')
}