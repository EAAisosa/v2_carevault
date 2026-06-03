import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

interface MonitoringStackProps extends cdk.StackProps {
  fargateService: ecs.FargateService;
  alb: elbv2.ApplicationLoadBalancer;
  dbInstance: rds.DatabaseInstance;
  apiLogGroup: logs.LogGroup;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // ── SNS topic for alarm notifications ────────────────────────────────────
    const alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: "carevault-alerts",
      displayName: "CareVault Production Alerts",
    });

    const alarmAction = new cloudwatchActions.SnsAction(alertTopic);

    // ── ECS CPU alarm ─────────────────────────────────────────────────────────
    const cpuAlarm = new cloudwatch.Alarm(this, "EcsCpuAlarm", {
      alarmName: "carevault-ecs-cpu-high",
      alarmDescription: "ECS CPU utilisation > 80% for 10 minutes",
      metric: props.fargateService.metricCpuUtilization({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    cpuAlarm.addAlarmAction(alarmAction);

    // ── ECS memory alarm ──────────────────────────────────────────────────────
    const memAlarm = new cloudwatch.Alarm(this, "EcsMemAlarm", {
      alarmName: "carevault-ecs-memory-high",
      alarmDescription: "ECS memory utilisation > 85% for 10 minutes",
      metric: props.fargateService.metricMemoryUtilization({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 85,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    memAlarm.addAlarmAction(alarmAction);

    // ── ALB 5xx error rate alarm ──────────────────────────────────────────────
    // db.t3.medium max_connections ≈ 170 via shared_buffers formula.
    // Alarm at 120 connections to leave headroom.
    const httpErrorsAlarm = new cloudwatch.Alarm(this, "AlbHttpErrorsAlarm", {
      alarmName: "carevault-alb-5xx-high",
      alarmDescription: "ALB 5xx responses > 10 in 5 minutes",
      metric: new cloudwatch.Metric({
        namespace: "AWS/ApplicationELB",
        metricName: "HTTPCode_ELB_5XX_Count",
        dimensionsMap: {
          LoadBalancer: props.alb.loadBalancerFullName,
        },
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    httpErrorsAlarm.addAlarmAction(alarmAction);

    // ── RDS connection count alarm ────────────────────────────────────────────
    const dbConnectionsAlarm = new cloudwatch.Alarm(this, "DbConnectionsAlarm", {
      alarmName: "carevault-rds-connections-high",
      alarmDescription: "RDS connections > 120 (headroom before t3.medium limit ~170)",
      metric: props.dbInstance.metricDatabaseConnections({
        period: cdk.Duration.minutes(5),
        statistic: "Maximum",
      }),
      threshold: 120,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dbConnectionsAlarm.addAlarmAction(alarmAction);

    // ── RDS CPU alarm ─────────────────────────────────────────────────────────
    const dbCpuAlarm = new cloudwatch.Alarm(this, "DbCpuAlarm", {
      alarmName: "carevault-rds-cpu-high",
      alarmDescription: "RDS CPU utilisation > 75% for 10 minutes",
      metric: props.dbInstance.metricCPUUtilization({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 75,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dbCpuAlarm.addAlarmAction(alarmAction);

    // ── 500-error log metric filter ──────────────────────────────────────────
    // pino emits JSON with level=50 for errors.
    const errorFilter = new logs.MetricFilter(this, "ApiErrorFilter", {
      logGroup: props.apiLogGroup,
      metricNamespace: "CareVault/API",
      metricName: "ErrorCount",
      filterPattern: logs.FilterPattern.stringValue("$.level", "=", "50"),
      metricValue: "1",
      defaultValue: 0,
    });

    const apiErrorAlarm = new cloudwatch.Alarm(this, "ApiErrorAlarm", {
      alarmName: "carevault-api-errors",
      alarmDescription: "API emitting > 20 server errors in 5 minutes",
      metric: errorFilter.metric({ period: cdk.Duration.minutes(5), statistic: "Sum" }),
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiErrorAlarm.addAlarmAction(alarmAction);

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: alertTopic.topicArn,
      description: "Subscribe an email or PagerDuty endpoint to this SNS topic",
    });
  }
}
