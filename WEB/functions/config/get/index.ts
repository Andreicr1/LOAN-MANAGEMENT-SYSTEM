import { handler as configHandler } from '../../config-handler/index'
export const handler = async () => configHandler({ action: 'get' })

