#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { YourAppNameCdkBeStack } from '../lib/your-app-name-cdk-be-stack';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env.production' });

const app = new cdk.App();
new YourAppNameCdkBeStack(app, 'ProductionYourAppNameCdkBeStack', {
   env: { account: 'your-aws-account-number', region: 'your-aws-account-region' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
app.synth();