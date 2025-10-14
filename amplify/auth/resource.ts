import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true
  },
  multifactor: {
    mode: 'OPTIONAL'
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true
    },
    name: {
      required: false,
      mutable: true
    }
  },
  groups: ['admin', 'manager', 'viewer']
})
