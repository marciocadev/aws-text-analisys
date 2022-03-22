import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { JsonPath, Map } from "aws-cdk-lib/aws-stepfunctions";
import {
  DynamoAttributeValue,
  DynamoPutItem,
  DynamoUpdateItem,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export interface TextTableProps {
  readonly pkField: string;
}

export class TextTable extends Table {
  readonly pkField: string;

  constructor(scope: Construct, id: string, props: TextTableProps) {
    super(scope, id, {
      tableName: id,
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: props.pkField,
        type: AttributeType.STRING,
      },
    });

    this.pkField = props.pkField;
  }

  putTextTask() {
    return new DynamoPutItem(this, "DynamoDBPutText", {
      item: {
        txt: DynamoAttributeValue.fromString(
          JsonPath.stringAt(`$.${this.pkField}`)
        ),
      },
      table: this,
      resultPath: JsonPath.DISCARD,
    });
  }

  updateLanguageTask() {
    return new DynamoUpdateItem(this, "DynamoDBUpdateLanguage", {
      key: {
        txt: DynamoAttributeValue.fromString(
          JsonPath.stringAt(`$.${this.pkField}`)
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

  listLanguages() {
    return new Map(this, "ListLanguages", {
      inputPath: JsonPath.stringAt("$"),
      itemsPath: JsonPath.stringAt("$.result.Languages"),
      parameters: {
        "item.$": "$$.Map.Item.Value",
        "txt.$": `$.${this.pkField}`,
      },
    }).iterator(this.updateLanguageTask());
  }
}
