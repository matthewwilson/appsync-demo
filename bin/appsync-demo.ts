#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {AppSyncDemoApiStack} from '../lib/appsync-demo-api-stack';
import {AppsyncDemoUserpoolStack} from '../lib/appsync-demo-userpool-stack';

const app = new cdk.App();
const userPoolStack = new AppsyncDemoUserpoolStack(app, 'AppSyncDemoUserPoolStack');
new AppSyncDemoApiStack(app, 'AppSyncDemoApiStack', userPoolStack.userPool);
