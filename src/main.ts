import { App, Stack, StackProps } from "aws-cdk-lib";
import {
  AwsIntegration,
  IntegrationOptions,
  JsonSchema,
  JsonSchemaType,
  JsonSchemaVersion,
  LogGroupLogDestination,
  MethodLoggingLevel,
  Model,
  RequestValidator,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Chain, LogLevel, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { DetectDominantLanguage } from "./comprehend";
import { TextTable } from "./dynamodb";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const logGroups = new LogGroup(this, "TextLogGroups", {
      logGroupName: "TextLogs",
      retention: RetentionDays.ONE_DAY,
    });

    const table = new TextTable(this, "TextTable");
    const inputField: string = "txt";

    const chain = Chain.start(table.putTextTask(inputField))
      .next(
        new DetectDominantLanguage(this, "DetectDominantLanguage", inputField)
      )
      .next(table.listLanguages(inputField));

    const stateMachine = new StateMachine(this, "TextStateMachine", {
      stateMachineName: "TextAnalisysStateMachine",
      definition: chain,
      tracingEnabled: true,
      logs: {
        destination: logGroups,
        level: LogLevel.ALL,
      },
    });

    const apiGatewayStepFunctionRole = new Role(this, "TextAnalisysRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });
    apiGatewayStepFunctionRole.attachInlinePolicy(
      new Policy(this, "TextAnalisysPolicy", {
        statements: [
          new PolicyStatement({
            actions: ["states:StartExecution"],
            effect: Effect.ALLOW,
            resources: [stateMachine.stateMachineArn],
          }),
        ],
      })
    );

    const integrationOptions: IntegrationOptions = {
      credentialsRole: apiGatewayStepFunctionRole,
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            "application/json": "Texto enviado com sucesso",
          },
        },
      ],
      requestTemplates: {
        "application/json": `
        {
          "input": "$util.escapeJavaScript($input.body)",
          "stateMachineArn": "${stateMachine.stateMachineArn}"
        }`,
      },
    };

    const integrationPost = new AwsIntegration({
      service: "states",
      action: "StartExecution",
      integrationHttpMethod: "POST",
      options: integrationOptions,
    });

    const apigateway = new RestApi(this, "TextAnalisysRestApi", {
      restApiName: "TextAnalisys",
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(logGroups),
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    const requestSchemaPost: JsonSchema = {
      title: "PostRequest",
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      properties: {
        txt: { type: JsonSchemaType.STRING },
      },
      required: ["txt"],
    };

    const requestModelPost: Model = new Model(this, "PostModel", {
      restApi: apigateway,
      contentType: "application/json",
      schema: requestSchemaPost,
    });

    const requestValidator = new RequestValidator(this, "PostValidator", {
      requestValidatorName: "validator",
      restApi: apigateway,
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const resource = apigateway.root.addResource("SendText");
    resource.addMethod("POST", integrationPost, {
      methodResponses: [{ statusCode: "200" }],
      requestModels: { "application/json": requestModelPost },
      requestValidator: requestValidator,
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, "aws-text-analisys-dev", { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
