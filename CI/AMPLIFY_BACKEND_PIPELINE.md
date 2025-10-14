Amplify Gen 2 Backend Pipeline

Environment variables required by the pipeline:

- AMPLIFY_APP_ID: The target Amplify App ID
- BRANCH_NAME: The git branch name to deploy (e.g., main)
- AWS credentials: Provide via your CI secret store (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)

Command to deploy the backend from CI:

- Linux/macOS:
  npm run deploy:backend

- Windows runners:
  npm run deploy:backend:win

Secrets and variables to configure in SSM Parameter Store (via ampx):

- SIGNWELL_API_KEY
- SIGNWELL_WEBHOOK_SECRET
- COGNITO_CLIENT_SECRET
- PDF_BUCKET
- UPLOAD_BUCKET
- EXPORT_BUCKET

Example (local sandbox):

  npx ampx sandbox secret set SIGNWELL_API_KEY
  npx ampx sandbox secret set SIGNWELL_WEBHOOK_SECRET
  npx ampx sandbox secret set COGNITO_CLIENT_SECRET
  npx ampx sandbox secret set PDF_BUCKET
  npx ampx sandbox secret set UPLOAD_BUCKET
  npx ampx sandbox secret set EXPORT_BUCKET

Outputs

- After deployment, amplify_outputs.json includes:
  - custom.httpApiUrl: Base URL for the HttpApi routes

