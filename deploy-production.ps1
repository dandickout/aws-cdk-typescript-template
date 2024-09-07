#this deployment script is for Windows OS
#bootstrap the project the first time
#npx cdk bootstrap --app "npx ts-node bin/production-your-app-name-cdk-be.ts" --profile your-profile-name
npx cdk deploy --app "ts-node bin/production-your-app-name-cdk-be.ts" --profile your-profile-name