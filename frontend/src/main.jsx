import { createRoot } from 'react-dom/client'
import { Provider } from '@/components/ui/provider'
import { registerSW } from 'virtual:pwa-register'
import './styles/globals.css'
import App from './App.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <Provider>
    <App />
  </Provider>,
)

console.log('main.jsx executed — root element should contain the app');
