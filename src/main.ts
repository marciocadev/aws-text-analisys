import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Chain, LogLevel, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { TextGateway } from "./apigateway/text-gateway";
import { DetectDominantLanguage } from "./comprehend";
import { TextTable } from "./dynamodb";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const txtField: string = "txt";

    const serviceApiGateway = new ServicePrincipal("apigateway.amazonaws.com");

    const logGroups = new LogGroup(this, "TextLogGroups", {
      logGroupName: "TextLogs",
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    logGroups.grantWrite(serviceApiGateway);

    const table = new TextTable(this, "TextTable", { pkField: txtField });

    const chain = Chain.start(table.putTextTask())
      .next(
        new DetectDominantLanguage(this, "DetectDominantLanguage", {
          textField: txtField,
        })
      )
      .next(table.listLanguages());

    const stateMachine = new StateMachine(this, "TextStateMachine", {
      stateMachineName: "TextAnalisysStateMachine",
      definition: chain,
      tracingEnabled: true,
      logs: {
        destination: logGroups,
        level: LogLevel.ALL,
      },
    });

    new TextGateway(this, "TextApiGateway", {
      stateMachineArn: stateMachine.stateMachineArn,
      stateMachineName: stateMachine.stateMachineName,
      serviceApiGateway: serviceApiGateway,
      logGroups: logGroups,
      postRequest: txtField,
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
