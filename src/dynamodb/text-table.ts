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

  putTextTask(inputField: string) {
    return new DynamoPutItem(this, "DynamoDBPutText", {
      item: {
        txt: DynamoAttributeValue.fromString(
          JsonPath.stringAt(`$.${inputField}`)
        ),
      },
      table: this,
      resultPath: JsonPath.DISCARD,
    });
  }

  updateLanguageTask(inputField: string) {
    return new DynamoUpdateItem(this, "DynamoDBUpdateLanguage", {
      key: {
        txt: DynamoAttributeValue.fromString(
          JsonPath.stringAt(`$.${inputField}`)
        ),
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

  listLanguages(inputField: string) {
    return new Map(this, "ListLanguages", {
      inputPath: JsonPath.stringAt("$"),
      itemsPath: JsonPath.stringAt("$.result.Languages"),
      parameters: {
        "item.$": "$$.Map.Item.Value",
        "txt.$": `$.${inputField}`,
      },
    }).iterator(this.updateLanguageTask(inputField));
  }
}
