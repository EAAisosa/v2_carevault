import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class NetworkStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly albSg: ec2.SecurityGroup;
  readonly ecsSg: ec2.SecurityGroup;
  readonly rdsSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // af-south-1 (Cape Town) has exactly 2 AZs.
    this.vpc = new ec2.Vpc(this, "VPC", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: 1, // Single NAT keeps egress costs low; increase to 2 for HA.
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // ALB: accepts HTTP/HTTPS from the internet.
    this.albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc: this.vpc,
      description: "ALB - HTTPS inbound from internet",
      allowAllOutbound: false,
    });
    this.albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP redirect");
    this.albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");
    this.albSg.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80), "HTTP redirect IPv6");
    this.albSg.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(443), "HTTPS IPv6");

    // ECS: only accepts traffic from the ALB.
    this.ecsSg = new ec2.SecurityGroup(this, "EcsSg", {
      vpc: this.vpc,
      description: "ECS Fargate - port 4000 from ALB only",
      allowAllOutbound: true,
    });
    this.ecsSg.addIngressRule(this.albSg, ec2.Port.tcp(4000), "From ALB");
    this.albSg.addEgressRule(this.ecsSg, ec2.Port.tcp(4000), "To ECS");

    // RDS: only accepts traffic from ECS tasks.
    this.rdsSg = new ec2.SecurityGroup(this, "RdsSg", {
      vpc: this.vpc,
      description: "RDS PostgreSQL - port 5432 from ECS only",
      allowAllOutbound: false,
    });
    this.rdsSg.addIngressRule(this.ecsSg, ec2.Port.tcp(5432), "From ECS");

    new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
  }
}
