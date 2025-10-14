import { handler as usersHandler } from '../../users-handler/index'
export const handler = async (event: any) => usersHandler({ action: 'create', payload: event })

