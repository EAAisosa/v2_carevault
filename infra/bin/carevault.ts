import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/stacks/network-stack";
import { DataStack } from "../lib/stacks/data-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";
import { MonitoringStack } from "../lib/stacks/monitoring-stack";
import { SchedulerStack } from "../lib/stacks/scheduler-stack";

const app = new cdk.App();

// GAID 2025 requires all patient data to remain within Africa.
const env: cdk.Environment = {
  account: process.env["CDK_DEFAULT_ACCOUNT"],
  region: "af-south-1",
};

const network = new NetworkStack(app, "CareVaultNetwork", { env });

const data = new DataStack(app, "CareVaultData", {
  env,
  vpc: network.vpc,
  rdsSg: network.rdsSg,
});

const compute = new ComputeStack(app, "CareVaultCompute", {
  env,
  vpc: network.vpc,
  albSg: network.albSg,
  ecsSg: network.ecsSg,
  dbSecret: data.dbSecret,
  dbEndpoint: data.dbInstance.dbInstanceEndpointAddress,
});

new MonitoringStack(app, "CareVaultMonitoring", {
  env,
  fargateService: compute.fargateService,
  alb: compute.alb,
  dbInstance: data.dbInstance,
  apiLogGroup: compute.apiLogGroup,
});

new SchedulerStack(app, "CareVaultScheduler", {
  env,
  apiUrl: "https://api.carevaultng.com",
  cronSecretArn: compute.cronSecretArn,
});
