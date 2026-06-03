import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface DataStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  rdsSg: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
  readonly dbInstance: rds.DatabaseInstance;
  readonly dbSecret: rds.DatabaseSecret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.dbSecret = new rds.DatabaseSecret(this, "DbSecret", {
      username: "carevault",
      secretName: "carevault/prod/db-credentials",
    });

    this.dbInstance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM,
      ),
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.rdsSg],
      databaseName: "carevault",
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: "02:00-03:00", // 02:00–03:00 UTC (off-peak for WAT)
      preferredMaintenanceWindow: "sun:03:00-sun:04:00",
      deletionProtection: true,
      multiAz: false, // Set to true before first go-live for HA
      autoMinorVersionUpgrade: true,
      storageEncrypted: true,
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, "DbEndpoint", {
      value: this.dbInstance.dbInstanceEndpointAddress,
      exportName: "CareVaultDbEndpoint",
    });
    new cdk.CfnOutput(this, "DbSecretArn", {
      value: this.dbSecret.secretArn,
      exportName: "CareVaultDbSecretArn",
    });
  }
}
