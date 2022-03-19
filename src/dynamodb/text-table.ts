import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { JsonPath, Map } from "aws-cdk-lib/aws-stepfunctions";
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
        ":score": DynamoAttributeValue.numberFromString(
          JsonPath.stringAt(`States.Format('{}', $.item.Score)`)
        ),
      },
      expressionAttributeNames: {
        "#Score": JsonPath.stringAt("$.item.LanguageCode"),
      },
      updateExpression: "SET #Score = :score",
      inputPath: JsonPath.stringAt("$"),
      resultPath: JsonPath.DISCARD,
    });
  }

  listLanguages() {
    return new Map(this, "ListLanguages", {
      inputPath: JsonPath.stringAt("$.Payload"),
      itemsPath: JsonPath.stringAt("$.languages"),
      parameters: {
        "item.$": "$$.Map.Item.Value",
        "txt.$": "$.txt",
      },
    }).iterator(this.updateLanguageTask());
  }
}
