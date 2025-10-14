import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION })
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const tableName = process.env.DATA_TABLE_NAME!

type Event =
  | { action: 'list' }
  | { action: 'create'; payload: { username: string; password: string; fullName: string; email?: string; role: string; createdBy?: string } }
  | { action: 'update'; payload: { userId: string; fullName?: string; email?: string; role?: string; isActive?: boolean } }
  | { action: 'delete'; payload: { userId: string } }
  | { action: 'resetPassword'; payload: { userId: string; password: string } }

export const handler = async (event: Event) => {
  switch (event.action) {
    case 'list':
      return listUsers()
    case 'create':
      return createUser(event.payload)
    case 'update':
      return updateUser(event.payload)
    case 'delete':
      return deleteUser(event.payload)
    case 'resetPassword':
      return resetPassword(event.payload)
    default:
      throw new Error('Unknown action')
  }
}

async function listUsers() {
  const command = new ListUsersCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID })
  const result = await cognito.send(command)
  const users = result.Users?.map((user) => ({
    id: user.Username,
    username: user.Username,
    email: user.Attributes?.find((attr) => attr.Name === 'email')?.Value,
    role: user.Attributes?.find((attr) => attr.Name === 'custom:role')?.Value || 'viewer',
    enabled: user.Enabled,
    lastLogin: user.UserLastModifiedDate?.toISOString()
  }))

  return users ?? []
}

async function createUser(payload: { username: string; password: string; fullName: string; email?: string; role: string; createdBy?: string }) {
  const command = new AdminCreateUserCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID!,
    Username: payload.username,
    TemporaryPassword: payload.password,
    UserAttributes: [
      { Name: 'name', Value: payload.fullName },
      { Name: 'custom:role', Value: payload.role },
      ...(payload.email ? [{ Name: 'email', Value: payload.email }, { Name: 'email_verified', Value: 'true' }] : [])
    ],
    MessageAction: 'SUPPRESS'
  })

  await cognito.send(command)
  return { success: true }
}

async function updateUser(payload: { userId: string; fullName?: string; email?: string; role?: string; isActive?: boolean }) {
  if (payload.isActive === false) {
    await cognito.send(new AdminDisableUserCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID!, Username: payload.userId }))
  } else if (payload.isActive === true) {
    await cognito.send(new AdminEnableUserCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID!, Username: payload.userId }))
  }

  if (payload.role || payload.fullName || payload.email) {
    // TODO: AdminUpdateUserAttributes
  }

  return { success: true }
}

async function deleteUser(payload: { userId: string }) {
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID!, Username: payload.userId }))
  return { success: true }
}

async function resetPassword(payload: { userId: string; password: string }) {
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      Username: payload.userId,
      Password: payload.password,
      Permanent: true
    })
  )
  return { success: true }
}

async function getUserProfile(userId: string) {
  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: '#type = :type AND userId = :userId',
    ExpressionAttributeNames: { '#type': '__typename' },
    ExpressionAttributeValues: { ':type': 'User', ':userId': userId }
  })

  const result = await dynamo.send(command)
  return result.Items?.[0]
}

