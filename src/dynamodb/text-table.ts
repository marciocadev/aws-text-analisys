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
      // resultPath: JsonPath.stringAt('$.output_from_ddb_put')
    });
  }

  updateLanguageTask() {
    return new DynamoUpdateItem(this, "DynamoDBUpdateLanguage", {
      key: {
        txt: DynamoAttributeValue.fromString(JsonPath.stringAt("$.txt")),
      },
      table: this,
      expressionAttributeValues: {
        // ":lang": DynamoAttributeValue.listFromJsonPath(JsonPath.stringAt('$.languages'))

        ":lang": DynamoAttributeValue.fromMap({
          LanguageCode: DynamoAttributeValue.fromString(
            JsonPath.stringAt("$.LanguageCode")
          ),
          Score: DynamoAttributeValue.fromString(
            JsonPath.numberAt("$.Score").toPrecision(2)
          ),
        }),

        // ':lang': DynamoAttributeValue.listFromJsonPath('$.languages')
      },
      updateExpression: "SET languages = :lang",
      inputPath: JsonPath.stringAt("$.Payload"),
      resultPath: JsonPath.DISCARD,
    });
  }
}
