import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";
import { Construct } from "constructs";

interface SchedulerStackProps extends cdk.StackProps {
  apiUrl: string;
  cronSecretArn: string;
}

export class SchedulerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SchedulerStackProps) {
    super(scope, id, props);

    const cronSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "CronSecret",
      props.cronSecretArn,
    );

    const fnLogGroup = new logs.LogGroup(this, "AutoSyncLogGroup", {
      logGroupName: "/aws/lambda/carevault-auto-sync",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Lambda function that calls POST /api/v1/sync/internal/auto-sync on the API.
    // esbuild bundles the handler at synth time — no separate build step needed.
    const autoSyncFn = new lambdaNodejs.NodejsFunction(this, "AutoSyncFn", {
      functionName: "carevault-auto-sync",
      entry: path.join(__dirname, "../../lambda/auto-sync.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        API_URL: props.apiUrl,
        CRON_SECRET_ARN: props.cronSecretArn,
      },
      logGroup: fnLogGroup,
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ["@aws-sdk/*"],
      },
    });

    cronSecret.grantRead(autoSyncFn);
    autoSyncFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [props.cronSecretArn],
      }),
    );

    // EventBridge rule: fires every 3 hours, matching the sync interval.
    const rule = new events.Rule(this, "AutoSyncRule", {
      ruleName: "carevault-auto-sync",
      description: "Trigger FHIR auto-sync every 3 hours",
      schedule: events.Schedule.rate(cdk.Duration.hours(3)),
    });
    rule.addTarget(new targets.LambdaFunction(autoSyncFn));

    new cdk.CfnOutput(this, "AutoSyncFunctionArn", {
      value: autoSyncFn.functionArn,
    });
  }
}
