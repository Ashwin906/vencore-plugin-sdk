import { createFrontendPlugin } from '@vencore/plugin-sdk/react'
import App from './App'

export default createFrontendPlugin({
  setup(vencore) {
    vencore.registerPage('/example', App)
  },
})
