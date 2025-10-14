import { handler as configHandler } from '../../config-handler/index'
export const handler = async (event: any) => configHandler({ action: 'update', payload: event })

