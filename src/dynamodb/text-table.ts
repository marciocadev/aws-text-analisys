import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { JsonPath } from "aws-cdk-lib/aws-stepfunctions";
import {
  DynamoAttributeValue,
  DynamoPutItem,
  DynamoUpdateItem,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export class TextTable extends Table {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      tableName: id,
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: "txt",
        type: AttributeType.STRING,
      },
    });
  }

  putTextTask() {
    return new DynamoPutItem(this, "DynamoDBPutText", {
      item: {
        txt: DynamoAttributeValue.fromString(JsonPath.stringAt("$.txt")),
      },
      table: this,
      resultPath: JsonPath.DISCARD,
    });
  }

  updateLanguageTask() {
    return new DynamoUpdateItem(this, "DynamoDBUpdateLanguage", {
      key: {
        txt: DynamoAttributeValue.fromString(JsonPath.stringAt("$.txt")),
      },
      table: this,
      expressionAttributeValues: {
        ":score": DynamoAttributeValue.fromNumber(
          JsonPath.numberAt('$.item.Score')
        )
      },
      expressionAttributeNames: {
        "#Score": JsonPath.stringAt("$.item.LanguageCode")
      },
      updateExpression: "SET #Score = :score",
      inputPath: JsonPath.stringAt("$"),
      resultPath: JsonPath.DISCARD,
    });
  }
}
