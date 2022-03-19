import { join } from "path";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export class TestLambda extends NodejsFunction {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      functionName: id,
      entry: join(__dirname, "./test/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
      tracing: Tracing.ACTIVE,
      bundling: {
        minify: true,
      },
    });
  }

  testTask() {
    return new LambdaInvoke(this, "TestInvoke", {
      lambdaFunction: this,
    });
  }
}
