import { App, Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  AwsIntegration,
  IntegrationOptions,
  JsonSchema,
  JsonSchemaType,
  JsonSchemaVersion,
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
import { Chain, Map, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import sha256 from "crypto-js/sha256";
import { TextTable } from "./dynamodb/text-table";
import { ComprehendLambda } from "./lambda-fns";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new TextTable(this, "TextTable");
    const comprehendLambda = new ComprehendLambda(this, "ComprehendLambda");
    const languageTask = new Map(this, "LanguageTask", {
      inputPath: "$.Payload",
      itemsPath: "$.Payload.languages",
    }).iterator(table.updateLanguageTask());
    const chain = Chain.start(table.putTextTask())
      .next(comprehendLambda.comprehendTask())
      .next(languageTask);
    const stateMachine = new StateMachine(this, "TextStateMachine", {
      definition: chain,
      tracingEnabled: true,
      timeout: Duration.minutes(5),
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
            "application/json": `{"pk": "${sha256(
              JSON.stringify("$input.body")
            )}"}`,
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
