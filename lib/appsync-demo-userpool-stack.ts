import * as cdk from "@aws-cdk/core";
import {RemovalPolicy} from "@aws-cdk/core";
import {UserPool} from "@aws-cdk/aws-cognito";

export class AppsyncDemoUserpoolStack extends cdk.Stack {
    readonly userPool = new UserPool(this, "AppSyncDemoUserPool", {
        userPoolName: "AppSyncDemoUserPool",
        selfSignUpEnabled: true,
        autoVerify: {
            email: true,
            phone: true
        },
        signInAliases: {
            email: true
        },
        removalPolicy: RemovalPolicy.DESTROY
    });

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.userPool.addClient("AppSyncDemoUserPoolClient", {
            userPoolClientName: "AppSyncDemoUserPoolClient"
        });
    }
}
