import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  albSg: ec2.SecurityGroup;
  ecsSg: ec2.SecurityGroup;
  dbSecret: rds.DatabaseSecret;
  dbEndpoint: string;
}

export class ComputeStack extends cdk.Stack {
  readonly fargateService: ecs.FargateService;
  readonly alb: elbv2.ApplicationLoadBalancer;
  readonly ecrRepository: ecr.Repository;
  readonly apiLogGroup: logs.LogGroup;
  readonly cronSecretArn: string;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // ── ECR ──────────────────────────────────────────────────────────────────
    this.ecrRepository = new ecr.Repository(this, "ApiRepo", {
      repositoryName: "carevault-api",
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10, description: "Keep last 10 images" }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── Application secrets (populated by scripts/populate-secrets.sh) ───────
    // DATABASE_URL is constructed from the RDS secret after provisioning.
    const dbUrlSecret = new secretsmanager.Secret(this, "DbUrlSecret", {
      secretName: "carevault/prod/database-url",
      description: "PostgreSQL connection string - run scripts/populate-secrets.sh after deploy",
      secretStringValue: cdk.SecretValue.unsafePlainText("PLACEHOLDER_RUN_populate-secrets.sh"),
    });

    const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
      secretName: "carevault/prod/jwt-secret",
      description: "HS256 JWT signing secret - min 64 hex chars",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 128,
        includeSpace: false,
      },
    });

    const jwtRefreshSecret = new secretsmanager.Secret(this, "JwtRefreshSecret", {
      secretName: "carevault/prod/jwt-refresh-secret",
      description: "HS256 JWT refresh token signing secret - separate from access token",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 128,
        includeSpace: false,
      },
    });

    // ENCRYPTION_KEY must be exactly 32 bytes base64-encoded (AES-256-GCM).
    // Auto-generation cannot guarantee this format - populate manually.
    const encryptionKey = new secretsmanager.Secret(this, "EncryptionKey", {
      secretName: "carevault/prod/encryption-key",
      description: "AES-256-GCM key - generate with: openssl rand -base64 32",
      secretStringValue: cdk.SecretValue.unsafePlainText("PLACEHOLDER_RUN_populate-secrets.sh"),
    });

    const cronSecret = new secretsmanager.Secret(this, "CronSecret", {
      secretName: "carevault/prod/cron-secret",
      description: "Internal auto-sync cron endpoint secret",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 64,
        includeSpace: false,
      },
    });
    this.cronSecretArn = cronSecret.secretArn;

    // ── ECS cluster ───────────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "carevault",
      vpc: props.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // ── CloudWatch log group ───────────────────────────────────────────────
    this.apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: "/ecs/carevault-api",
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── Fargate task definition ───────────────────────────────────────────────
    const taskDef = new ecs.FargateTaskDefinition(this, "ApiTaskDef", {
      cpu: 512,
      memoryLimitMiB: 1024,
      family: "carevault-api",
    });

    props.dbSecret.grantRead(taskDef.taskRole);
    dbUrlSecret.grantRead(taskDef.taskRole);
    jwtSecret.grantRead(taskDef.taskRole);
    jwtRefreshSecret.grantRead(taskDef.taskRole);
    encryptionKey.grantRead(taskDef.taskRole);
    cronSecret.grantRead(taskDef.taskRole);

    const container = taskDef.addContainer("api", {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, "latest"),
      essential: true,
      logging: ecs.LogDrivers.awsLogs({
        logGroup: this.apiLogGroup,
        streamPrefix: "api",
      }),
      environment: {
        NODE_ENV: "production",
        PORT: "4000",
        ALLOWED_ORIGINS: "https://carevaultng.com,https://www.carevaultng.com",
        APP_URL: "https://carevaultng.com",
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbUrlSecret),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
        JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(jwtRefreshSecret),
        ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(encryptionKey),
        CRON_SECRET: ecs.Secret.fromSecretsManager(cronSecret),
      },
      portMappings: [{ containerPort: 4000 }],
      healthCheck: {
        command: [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:4000/health', r => r.statusCode===200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))\"",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });
    container.addUlimits({ name: ecs.UlimitName.NOFILE, softLimit: 65536, hardLimit: 65536 });

    // ── Fargate service ──────────────────────────────────────────────────────
    // desiredCount defaults to 0 on first deploy (no image in ECR yet).
    // After pushing the initial image, redeploy with --context desiredCount=1
    const desiredCount = parseInt(
      (this.node.tryGetContext("desiredCount") as string | undefined) ?? "0",
      10,
    );

    this.fargateService = new ecs.FargateService(this, "ApiService", {
      cluster,
      taskDefinition: taskDef,
      serviceName: "carevault-api",
      desiredCount,
      assignPublicIp: false,
      securityGroups: [props.ecsSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true, // For debugging via ECS Exec
    });

    // ── ALB ──────────────────────────────────────────────────────────────────
    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, "ApiTargetGroup", {
      vpc: props.vpc,
      port: 4000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.fargateService],
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        healthyHttpCodes: "200",
        unhealthyThresholdCount: 3,
        healthyThresholdCount: 2,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    const certArn = this.node.tryGetContext("certificateArn") as string | undefined;
    const hasCert = !!certArn && !certArn.startsWith("PLACEHOLDER");

    if (hasCert) {
      // Production: HTTP → HTTPS redirect, HTTPS forwards to ECS.
      this.alb.addListener("HttpListener", {
        port: 80,
        defaultAction: elbv2.ListenerAction.redirect({
          port: "443",
          protocol: "HTTPS",
          permanent: true,
        }),
      });
      this.alb.addListener("HttpsListener", {
        port: 443,
        certificates: [elbv2.ListenerCertificate.fromArn(certArn)],
        defaultTargetGroups: [targetGroup],
      });
    } else {
      // Bootstrap / pre-cert: HTTP forwards directly to ECS (no TLS).
      // Re-deploy with --context certificateArn=arn:... once the ACM cert is ready.
      this.alb.addListener("HttpListener", {
        port: 80,
        defaultTargetGroups: [targetGroup],
      });
    }

    // ── WAF WebACL (attached to ALB) ──────────────────────────────────────────
    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      name: "carevault-api-waf",
      scope: "REGIONAL",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "carevault-api-waf",
        sampledRequestsEnabled: true,
      },
      rules: [
        // AWS managed common rule set (SQLi, XSS, known bad inputs)
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 10,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
        // AWS managed known bad inputs
        {
          name: "AWSManagedRulesKnownBadInputsRuleSet",
          priority: 20,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesKnownBadInputsRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesKnownBadInputsRuleSet",
            sampledRequestsEnabled: true,
          },
        },
        // Rate limiting: 1000 requests per 5 minutes per IP
        {
          name: "RateLimit",
          priority: 30,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 1000,
              aggregateKeyType: "IP",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimit",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    new wafv2.CfnWebACLAssociation(this, "WebAclAssociation", {
      resourceArn: this.alb.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "AlbDns", {
      value: this.alb.loadBalancerDnsName,
      description: "Create a CNAME: api.carevaultng.com -> this value",
      exportName: "CareVaultAlbDns",
    });
    new cdk.CfnOutput(this, "EcrRepoUri", {
      value: this.ecrRepository.repositoryUri,
      exportName: "CareVaultEcrRepoUri",
    });
    new cdk.CfnOutput(this, "EcsClusterName", {
      value: cluster.clusterName,
      exportName: "CareVaultEcsCluster",
    });
    new cdk.CfnOutput(this, "EcsServiceName", {
      value: this.fargateService.serviceName,
      exportName: "CareVaultEcsService",
    });
    new cdk.CfnOutput(this, "CronSecretArn", {
      value: cronSecret.secretArn,
      exportName: "CareVaultCronSecretArn",
    });
  }
}
