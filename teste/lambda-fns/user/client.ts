import {
  DynamoDBClient,
  PutItemCommand, PutItemCommandInput,
  UpdateItemCommand, UpdateItemCommandInput,
  GetItemCommand, GetItemCommandInput,
  DeleteItemCommand, DeleteItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { User } from './model';

export class UserClient {
  readonly client = new DynamoDBClient({ region: process.env.AWS_REGION });

  public async getItem(partitionKey: string) {
    let keyObj: { [key: string]: any } = {};
    keyObj.UserId = partitionKey;
    const input: GetItemCommandInput = {
      TableName: process.env.USER_TABLE_NAME,
      Key: marshall(keyObj),
    };
    return this.client.send(new GetItemCommand(input));
  }

  public async deleteItem(partitionKey: string) {
    let keyObj: { [key: string]: any } = {};
    keyObj.string = partitionKey;
    const input: DeleteItemCommandInput = {
      TableName: process.env.USER_TABLE_NAME,
      Key: marshall(keyObj),
    };
    return this.client.send(new DeleteItemCommand(input));
  }

  public async putItem(item: User) {
    const input: PutItemCommandInput = {
      TableName: process.env.USER_TABLE_NAME,
      Item: marshall(item),
    };
    return this.client.send(new PutItemCommand(input));
  }

  public async updateItem(partitionKey: string, item: User) {
    let expAttrVal: { [key: string]: any } = {};
    let upExp = 'set ';
    let expAttrNames: { [key: string]: string } = {};
    if (item.UserName !== null && item.UserName !== undefined) {
      expAttrVal[':UserName'] = item.UserName;
      upExp = upExp + '#UserName = :UserName,';
      expAttrNames['#UserName'] = 'UserName';
    };
    upExp = upExp.slice(0, -1);
    let keyObj: { [key: string]: any } = {};
    keyObj.UserId = partitionKey;
    const input: UpdateItemCommandInput = {
      TableName: process.env.USER_TABLE_NAME,
      Key: marshall(keyObj),
      ExpressionAttributeValues: marshall(expAttrVal),
      UpdateExpression: upExp,
      ExpressionAttributeNames: expAttrNames,
    };
    console.log(input);
    return this.client.send(new UpdateItemCommand(input));
  }

};