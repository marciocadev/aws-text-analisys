import { JsonPath } from "aws-cdk-lib/aws-stepfunctions";
import { CallAwsService } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export class DetectDominantLanguage extends CallAwsService {
  constructor(scope: Construct, id: string, inputField: string) {
    super(scope, id, {
      comment: "Comprehend Detect Dominant Language",
      service: "comprehend",
      action: "detectDominantLanguage",
      parameters: {
        Text: JsonPath.stringAt(`$.${inputField}`),
      },
      iamResources: ["*"],
      resultPath: "$.result",
      outputPath: "$"
    });
  }
}
