import * as cdk from "@aws-cdk/core";
import * as path from "path";
import {
  AuthorizationType,
  GraphqlApi,
  MappingTemplate,
  PrimaryKey,
  Schema,
  UserPoolDefaultAction,
  Values
} from "@aws-cdk/aws-appsync";
import {AttributeType, Table} from "@aws-cdk/aws-dynamodb";
import {UserPool} from "@aws-cdk/aws-cognito";

export class AppSyncDemoApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, userPool: UserPool, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new GraphqlApi(this, "AppSyncDemoApi", {
      name: "AppSyncDemoApi",
      schema: Schema.fromAsset(path.join(__dirname, "graphql", "schema.graphql")),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY,
          // authorizationType: AuthorizationType.USER_POOL,
          // userPoolConfig: {
          //   userPool: userPool,
          //   defaultAction: UserPoolDefaultAction.ALLOW
          // }
        },
      },
      xrayEnabled: true,
    });

    const demoTable = new Table(this, "AppSyncDemoTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });

    const demoDS = api.addDynamoDbDataSource("AppSyncDemoDynamoDataSource", demoTable);

    // Resolver for the Query "getDemos" that scans the DynamoDb table and returns the entire list.
    demoDS.createResolver({
      typeName: "Query",
      fieldName: "getDemos",
      requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
    });

    // Resolver for the Mutation "addDemo" that puts the item into the DynamoDb table.
    demoDS.createResolver({
      typeName: "Mutation",
      fieldName: "addDemo",
      requestMappingTemplate: MappingTemplate.dynamoDbPutItem(
          PrimaryKey.partition("id").auto(),
          Values.projecting("input"),
      ),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });

    const noneDataSource = api.addNoneDataSource("AppSyncDemoNoneDataSource");

    noneDataSource.createResolver({
      typeName: "demo",
      fieldName: "currentDateTime",
      requestMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "currentDateTime.request.vtl")),
      responseMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "currentDateTime.response.vtl"))
    })
  }
}
