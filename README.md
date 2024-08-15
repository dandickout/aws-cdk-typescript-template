# This is a template AWS CDK project in Typescript mainly for Lambda based Serveless backends
I have created this template from many projects I have personally built using the AWS CDK
I use it primarily for Lambda microservice backends with the REST API or HTTP API gateways but over the years have also used many other AWS technologies through the CDK like S3, IAM, VPC, SQS, SNS, EC2, Secrets Manager and VPC and there are many many more that are supported.

## About the project structure

* `layer-nodejs\nodejs` Is a an AWS Lambda Layer. A Layer in Lambdas is a way to store and access libraries across multiple lambdas without having to install the library into each lambda saving space, cost and because if an individual lambda is too large you will not be able to view the code in the console which comes in handy for testing small code changes.

* `lambdas-nodejs` this folder is where you will store all your lambda code. Each lambda should be in it's own folder (like 

* `lambdas-nodejs\crud-template\crud-template.js`) within this folder otherwise all the code files will be duplicated into each deployed lambda once the project is built.

* `lib\your-app-name-cdk-be-stack.ts` this is the main file where you will define and construct your AWS infrastructure like your Lambdas, API Gateways, etc.

## To use this template
In order to reuse this template you first should rename a number of files to whatever yo desire (typically I use the name of my application).
NOTE that there are two versions (production and staging) of some files. This allows you to build and deploy to different environments. During development you would primarily use a staging or dev environment only until ready to release your app to production. The way this project is configured will allow you to deploy to completely different AWS accounts for staging and production if you desire, though that is not usually necessary.

Files to rename;
 * `lib\your-app-name-cdk-be-stack.ts  `      (This is the main file that defines your entire set of AWS resources)
 * `bin\production-your-app-name-cdk-be.ts `  (This file initiates the production creation of your stack and pulls the production env vars)
 * `bin\staging-your-app-name-cdk-be.ts`      (This file initiates the staging or dev creation of your stack and pulls the staging env vars)
 * `test\your-app-name-cdk-be.test.ts  `      (This file runs automated tests on your project)

 Files to alter/edit;
 * `.env.production `                         (These are environment variables for your production deployment of the application)
 * `.env.staging `                            (These are environment variables for your staging deployment of the application)
 * `deploy-production.ps1  `                  (This is a Windows script to deploy the app using the correct AWS CLI profil if you have more than one)
 * `deploy-staging.ps1 `                      (This is a Windows script to deploy the app using the correct AWS CLI profil if you have more than one)

# Welcome to your CDK TypeScript project

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
