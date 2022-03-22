import {
  AwsIntegration,
  Integration,
  IntegrationOptions,
  JsonSchema,
  JsonSchemaType,
  JsonSchemaVersion,
  LogGroupLogDestination,
  MethodLoggingLevel,
  Model,
  RequestValidator,
  RestApi,
  RestApiProps,
} from "aws-cdk-lib/aws-apigateway";
import {
  Effect,
  IRole,
  Policy,
  PolicyStatement,
  PrincipalBase,
  Role,
} from "aws-cdk-lib/aws-iam";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface TextGatewayProps extends RestApiProps {
  readonly stateMachineArn: string;
  readonly stateMachineName: string;
  readonly serviceApiGateway: PrincipalBase;
  readonly logGroups: ILogGroup;
  readonly postRequest: string;
}

export class TextGateway extends RestApi {
  readonly stateMachineArn: string;
  readonly stateMachineName: string;

  constructor(scope: Construct, id: string, props: TextGatewayProps) {
    super(scope, id, {
      restApiName: "TextAnalisys",
      deployOptions: {
        tracingEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: new LogGroupLogDestination(props.logGroups),
      },
    });

    this.stateMachineArn = props.stateMachineArn;
    this.stateMachineName = props.stateMachineName;

    const gtwRole = this.getApiGatewayStepFunctionRole(props.serviceApiGateway);

    const resource = this.root.addResource("SendText");
    resource.addMethod("POST", this.createIntegration(gtwRole), {
      methodResponses: [{ statusCode: "200" }],
      requestModels: {
        "application/json": this.getPostRequestModel(props.postRequest),
      },
      requestValidator: new RequestValidator(this, "PostValidator", {
        requestValidatorName: "validator",
        restApi: this,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });
  }

  createIntegration(gtwRole: IRole): Integration {
    const integrationOptions: IntegrationOptions = {
      credentialsRole: gtwRole,
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            "application/json":  `
              #if ($input.path('$.__type') != "")
                #set ($context.responseOverride.status = 500)
                {
                  "requestId": "$context.requestId",
                  "message": "$input.path('$.message').trim()"
                }
              #else
                #set ($context.responseOverride.status = 200)
                {
                  "requestId": "$context.requestId",
                  "executionArn": "$input.path('$.executionArn').trim()",
                  "startDate": "$input.path('$.startDate')"
                }
              #end
            `,
          },
        },
      ],
      requestTemplates: {
        "application/json": `
        {
          "input": "$util.escapeJavaScript($input.body)",
          "name": "${this.stateMachineName}-$util.base64Encode(
            $util.escapeJavaScript(
              $input.body
            )
          ).hashCode()",
          "stateMachineArn": "${this.stateMachineArn}"
        }`,
      },
    };

    return new AwsIntegration({
      service: "states",
      action: "StartExecution",
      integrationHttpMethod: "POST",
      options: integrationOptions,
    });
  }

  getPostRequestModel(postRequest: string) {
    const propertiesStr = `{
      "${postRequest}" : {
        "type" : "${JsonSchemaType.STRING}"
      }
    }`;

    const schemaPost: JsonSchema = {
      title: "PostRequest",
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      properties: JSON.parse(propertiesStr),
      required: [postRequest],
    };

    return new Model(this, "PostModel", {
      restApi: this,
      contentType: "application/json",
      schema: schemaPost,
    });
  }

  getApiGatewayStepFunctionRole(assumeBy: PrincipalBase) {
    const apiGatewayStepFunctionRole = new Role(this, "TextAnalisysRole", {
      assumedBy: assumeBy,
    });
    apiGatewayStepFunctionRole.attachInlinePolicy(
      new Policy(this, "TextAnalisysPolicy", {
        statements: [
          new PolicyStatement({
            actions: ["states:StartExecution"],
            effect: Effect.ALLOW,
            resources: [this.stateMachineArn],
          }),
        ],
      })
    );
    return apiGatewayStepFunctionRole;
  }
}
