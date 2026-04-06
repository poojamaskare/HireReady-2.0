import { createRoot } from 'react-dom/client'
import { Provider } from '@/components/ui/provider'
import './styles/globals.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <Provider>
    <App />
  </Provider>,
)

console.log('main.jsx executed — root element should contain the app');
