import { createPlugin } from 'vencore/backend'

export default createPlugin({
  setup(vencore) {
    vencore.cron.register('0 * * * *', 'hourly-log', async () => {
      const contacts = await vencore.list('contacts')
      console.log(`[example-plugin] contacts: ${contacts.length}`)
    })

    vencore.on('contact.created', async (payload) => {
      console.log('[example-plugin] contact.created:', payload)
    })
  },
})
