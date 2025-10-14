import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: { email: true },
  multifactor: { mode: 'OPTIONAL', totp: true },
  userAttributes: {
    email: { required: true, mutable: false }
  },
  groups: ['admin', 'manager', 'viewer']
})
