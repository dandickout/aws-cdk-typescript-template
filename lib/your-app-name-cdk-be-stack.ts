import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from 'dotenv';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

// Load environment variables from .env file
dotenv.config();

// Get environment variable
const STAGE = process.env.STAGE || 'DEV';
const PREFIX = STAGE === 'PRODUCTION' ? 'production-' : STAGE === 'STAGING' ? 'staging-' : '';
console.log(`Stage: ${STAGE}`); 
const MONGODB_URI = process.env.MONGODB_URI ?? '';
const MONGODB = process.env.MONGODB ?? '';
const ORIGINS_LIST = process.env.ORIGINS_LIST ?? '';

export class YourAppNameCdkBeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda Layer
    const nodeLambdaLayer = new lambda.LayerVersion(this, `${PREFIX}NodeJsLayer`, {
      code: lambda.Code.fromAsset('layer-nodejs'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X, lambda.Runtime.NODEJS_18_X, lambda.Runtime.NODEJS_20_X],
      description: 'A layer containing nodejs dependencies',
    });

    // Output the Lambda Layer ARN
    new cdk.CfnOutput(this, `${PREFIX}NodeLambdaLayerARN`, {
      value: nodeLambdaLayer.layerVersionArn,
    });

    // Define IAM role for the Lambda function
    const lambdaRole = new iam.Role(this, `${PREFIX}LambdaRole`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Attach policies to the role to allow executing other Lambda functions and interacting with S3 and Secrets Manager
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'lambda:InvokeFunction',
        // 's3:PutObject',
        // 's3:PutObjectAcl',
        // 's3:CreateBucket',
        // 's3:ListBucket',
        'secretsmanager:GetSecretValue',
      ],
      resources: [
        // bucket.bucketArn,
        // `${bucket.bucketArn}/*`,
        // cryptoSecret.secretArn, // Add the ARN of the secret
      ],
    }));

    // Define a single Lambda function prior to the API Gateway so as we need a default integration to setup the API Gateway
    const templateLambda = new lambda.Function(this, `${PREFIX}template-lambda`, {
      functionName: `${PREFIX}template-lambda`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'crud-template.handler',
      code: lambda.Code.fromAsset('lambdas-nodejs/crud-template'),
      environment: {
        MONGODB_URI: MONGODB_URI,
        MONGODB: MONGODB,
        MONGODB_COLL: `${PREFIX}your-mongo-collection`,
        ORIGINS_LIST: ORIGINS_LIST
      },
      role: lambdaRole,
      layers: [nodeLambdaLayer],
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });


    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, `${PREFIX}YourAPIGatewayName`, {
      restApiName: 'YourAPIGatewayName',
      description: 'Describe what this API does',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Define the your resources
    const configsResource = api.root.addResource('configs');
    const userIdResource = configsResource.addResource('{userId}');

    // Define integration options with URL encoding for userId
    const integrationOptions = {
      requestParameters: {
        'integration.request.path.userId': 'method.request.path.userId',
      },
      requestTemplates: {
        'application/json': '{"userId": "$util.urlEncode($input.params(\'userId\'))"}'
      }
    };

    // Define methods (GET, POST, PUT, DELETE) for /configs/{userId} with integration options
    userIdResource.addMethod('GET', new apigateway.LambdaIntegration(templateLambda, integrationOptions), {
      requestParameters: { 'method.request.path.userId': true }
    });

    userIdResource.addMethod('POST', new apigateway.LambdaIntegration(templateLambda, integrationOptions), {
      requestParameters: { 'method.request.path.userId': true }
    });

    userIdResource.addMethod('PUT', new apigateway.LambdaIntegration(templateLambda, integrationOptions), {
      requestParameters: { 'method.request.path.userId': true }
    });

    userIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(templateLambda, integrationOptions), {
      requestParameters: { 'method.request.path.userId': true }
    });

  }
}
