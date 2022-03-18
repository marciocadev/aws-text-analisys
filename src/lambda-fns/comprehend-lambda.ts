import { join } from "path";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export class ComprehendLambda extends NodejsFunction {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      functionName: id,
      entry: join(__dirname, "./comprehend/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
      tracing: Tracing.ACTIVE,
      bundling: {
        minify: true,
      },
    });

    const dominantLanguageRole = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ["*"],
      actions: ["comprehend:DetectDominantLanguage"],
    });

    this.addToRolePolicy(dominantLanguageRole);
  }

  comprehendTask() {
    return new LambdaInvoke(this, "ComprehendInvoke", {
      lambdaFunction: this,
    });
  }
}
