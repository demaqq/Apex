import { createRoot } from 'react-dom/client'
import App from './App'
import { initSecureStorage } from './lib/secureStore'
import { DATA_KEY } from './store/HospitalStore'
import './index.css'

// Decrypt the saved hospital data (AES-GCM, device key) before the first render.
initSecureStorage([DATA_KEY]).finally(() => {
  createRoot(document.getElementById('root')!).render(<App />)
})
