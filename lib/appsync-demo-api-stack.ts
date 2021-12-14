import * as cdk from "@aws-cdk/core";
import {RemovalPolicy} from "@aws-cdk/core";
import * as path from "path";
import {
  AppsyncFunction,
  AuthorizationType,
  FieldLogLevel,
  GraphqlApi,
  MappingTemplate,
  PrimaryKey, Resolver,
  Schema, UserPoolDefaultAction,
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
          //authorizationType: AuthorizationType.API_KEY,
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: userPool,
            defaultAction: UserPoolDefaultAction.ALLOW
          }
        },
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: false
      }
    });

    const articleTable = new Table(this, "AppSyncDemoArticleTable", {
      tableName: "AppSyncDemoArticleTable",
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY
    });

    const commentTable = new Table(this, "AppSyncDemoCommentTable", {
      tableName: "AppSyncDemoCommentTable",
      partitionKey: {
        name: "articleId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY
    });

    const articleTableDataSource = api.addDynamoDbDataSource("AppSyncDemoArticleDataSource", articleTable);

    articleTableDataSource.createResolver({
      typeName: "Query",
      fieldName: "getArticles",
      requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
    });

    articleTableDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "addArticle",
      requestMappingTemplate: MappingTemplate.dynamoDbPutItem(
          PrimaryKey.partition("id").auto(),
          Values.projecting("input"),
      ),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });

    const commentTableDataSource = api.addDynamoDbDataSource("AppSyncDemoCommentDataSource", commentTable);

    commentTableDataSource.createResolver({
      typeName: "Article",
      fieldName: "comments",
      requestMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "comments.request.vtl")),
      responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
    });

    commentTableDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "addComment",
      requestMappingTemplate: MappingTemplate.dynamoDbPutItem(
          PrimaryKey
              .partition("articleId").is("input.articleId")
              .sort("id").auto(),
          Values.projecting("input"),
      ),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });

    const noneDataSource = api.addNoneDataSource("AppSyncDemoNoneDataSource")

    const firstAppSyncFunction = new AppsyncFunction(this, "AppSyncDemoFirstAppSyncFunction", {
      name: 'AppSyncDemoFirstAppSyncFunction',
      api,
      dataSource: noneDataSource,
      requestMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "pipeline", "firstFunction.request.vtl")),
      responseMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "pipeline", "firstFunction.response.vtl")),
    });

    const secondAppSyncFunction = new AppsyncFunction(this, "AppSyncDemoSecondAppSyncFunction", {
      name: 'AppSyncDemoSecondAppSyncFunction',
      api,
      dataSource: noneDataSource,
      requestMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "pipeline", "secondFunction.request.vtl")),
      responseMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "pipeline", "secondFunction.response.vtl")),
    });

    const pipelineResolver = new Resolver(this, 'AppSyncDemoPipelineResolver', {
      api,
      typeName: 'Article',
      fieldName: 'pipeline',
      requestMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "pipeline", "beforeRequest.vtl")),
      pipelineConfig: [firstAppSyncFunction, secondAppSyncFunction],
      responseMappingTemplate: MappingTemplate.fromFile(path.join(__dirname, "resolver-templates", "pipeline", "afterResponse.vtl")),
    });
  }
}
