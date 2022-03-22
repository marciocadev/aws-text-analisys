import { JsonPath } from "aws-cdk-lib/aws-stepfunctions";
import { CallAwsService } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export interface DetectDominantLanguageProps {
  readonly textField: string;
}

export class DetectDominantLanguage extends CallAwsService {
  constructor(
    scope: Construct,
    id: string,
    props: DetectDominantLanguageProps
  ) {
    super(scope, id, {
      comment: "Comprehend Detect Dominant Language",
      service: "comprehend",
      action: "detectDominantLanguage",
      parameters: {
        Text: JsonPath.stringAt(`$.${props.textField}`),
      },
      iamResources: ["*"],
      resultPath: "$.result",
      outputPath: "$",
    });
  }
}
