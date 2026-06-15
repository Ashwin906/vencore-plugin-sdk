import { createFrontendPlugin } from 'vencore/react'
import App from './App'

export default createFrontendPlugin({
  setup(vencore) {
    vencore.registerPage('/example', App)
  },
})
