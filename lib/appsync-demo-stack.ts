import * as cdk from "@aws-cdk/core";
import * as path from "path";
import {AuthorizationType, GraphqlApi, MappingTemplate, PrimaryKey, Schema, Values} from "@aws-cdk/aws-appsync";
import {AttributeType, Table} from "@aws-cdk/aws-dynamodb";

export class AppsyncDemoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new GraphqlApi(this, "Api", {
      name: "demo",
      schema: Schema.fromAsset(path.join(__dirname, "schema.graphql")),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY,
        },
      },
      xrayEnabled: true,
    });

    const demoTable = new Table(this, "DemoTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });

    const demoDS = api.addDynamoDbDataSource("demoDataSource", demoTable);

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
  }
}
