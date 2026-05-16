##############################################################
# CareVault — Self-Hosted Supabase on AWS Africa (Cape Town)
# Region: af-south-1
# Compliance: NDPA 2023 / GAID 2025  |  Data stays in Africa
##############################################################

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Store state in S3 (Cape Town) — keep everything in-region
  backend "s3" {
    bucket  = "carevault-terraform-state"
    key     = "infra/terraform.tfstate"
    region  = "af-south-1"
    encrypt = true
  }
}

provider "aws" {
  region = "af-south-1"
  default_tags {
    tags = {
      Project     = "CareVault"
      Environment = var.environment
      Compliance  = "NDPA-2023"
      DataClass   = "HealthSensitive"
      Region      = "Africa-CapeTown"
    }
  }
}

########################################
# Variables
########################################
variable "environment" {
  description = "prod | staging"
  default     = "prod"
}

variable "db_password" {
  description = "Postgres master password (store in AWS Secrets Manager)"
  sensitive   = true
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

########################################
# VPC — isolated, no public DB access
########################################
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "carevault-vpc" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "af-south-1a"
  tags = { Name = "carevault-private-a", Tier = "private" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "af-south-1b"
  tags = { Name = "carevault-private-b", Tier = "private" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "af-south-1a"
  map_public_ip_on_launch = true
  tags = { Name = "carevault-public-a", Tier = "public" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "af-south-1b"
  map_public_ip_on_launch = true
  tags = { Name = "carevault-public-b", Tier = "public" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "carevault-igw" }
}

resource "aws_eip" "nat" { domain = "vpc" }

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  tags          = { Name = "carevault-nat" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; gateway_id = aws_internet_gateway.igw.id }
  tags = { Name = "carevault-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; nat_gateway_id = aws_nat_gateway.nat.id }
  tags = { Name = "carevault-private-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}
resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

########################################
# Security Groups
########################################
resource "aws_security_group" "alb" {
  name   = "carevault-alb-sg"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 80;  to_port = 80;  protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  egress  { from_port = 0;   to_port = 0;   protocol = "-1";  cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "ecs" {
  name   = "carevault-ecs-sg"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 0; to_port = 65535; protocol = "tcp"; security_groups = [aws_security_group.alb.id] }
  egress  { from_port = 0; to_port = 0;     protocol = "-1";  cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "rds" {
  name   = "carevault-rds-sg"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.ecs.id] }
}

########################################
# RDS PostgreSQL (encrypted, private)
########################################
resource "aws_db_subnet_group" "main" {
  name       = "carevault-db-subnet"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_db_instance" "postgres" {
  identifier              = "carevault-postgres"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = "db.t4g.medium"   # Start here; upgrade to r7g for prod scale
  allocated_storage       = 100
  max_allocated_storage   = 1000              # Auto-scale storage
  storage_encrypted       = true              # AES-256, NDPA requirement
  username                = "supabase_admin"
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  multi_az                = true              # HA across af-south-1 AZs
  backup_retention_period = 30               # NDPA: retain for 30 days
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "carevault-final-${var.environment}"
  performance_insights_enabled = true
  monitoring_interval     = 60
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  tags = { Name = "carevault-postgres" }
}

########################################
# Secrets Manager (credentials, never in env)
########################################
resource "aws_secretsmanager_secret" "supabase" {
  name                    = "carevault/supabase/${var.environment}"
  recovery_window_in_days = 30
  tags = { Purpose = "SupabaseConfig" }
}

resource "aws_secretsmanager_secret_version" "supabase" {
  secret_id = aws_secretsmanager_secret.supabase.id
  secret_string = jsonencode({
    POSTGRES_PASSWORD  = var.db_password
    POSTGRES_HOST      = aws_db_instance.postgres.address
    POSTGRES_DB        = "postgres"
    JWT_SECRET         = "REPLACE_WITH_32_CHAR_SECRET"   # Generate with: openssl rand -base64 32
    ANON_KEY           = "REPLACE_WITH_ANON_JWT"
    SERVICE_ROLE_KEY   = "REPLACE_WITH_SERVICE_JWT"
    SMTP_HOST          = "REPLACE_WITH_SES_SMTP"
    SMTP_USER          = "REPLACE_WITH_SES_USER"
    SMTP_PASS          = "REPLACE_WITH_SES_PASS"
  })
}

########################################
# ECS Cluster (Fargate — no EC2 to manage)
########################################
resource "aws_ecs_cluster" "main" {
  name = "carevault-cluster"
  setting { name = "containerInsights"; value = "enabled" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

########################################
# ECR — store Supabase service images
########################################
resource "aws_ecr_repository" "kong" {
  name                 = "carevault/kong"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "auth" {
  name                 = "carevault/gotrue"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "rest" {
  name                 = "carevault/postgrest"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "storage" {
  name                 = "carevault/storage-api"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "realtime" {
  name                 = "carevault/realtime"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

########################################
# S3 — Supabase Storage backend (encrypted)
########################################
resource "aws_s3_bucket" "storage" {
  bucket = "carevault-storage-${var.environment}"
  tags   = { Purpose = "SupabaseStorage" }
}

resource "aws_s3_bucket_versioning" "storage" {
  bucket = aws_s3_bucket.storage.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "storage" {
  bucket                  = aws_s3_bucket.storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

########################################
# ALB — HTTPS termination
########################################
resource "aws_lb" "main" {
  name               = "carevault-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  drop_invalid_header_fields = true
  tags = { Name = "carevault-alb" }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect { port = "443"; protocol = "HTTPS"; status_code = "HTTP_301" }
  }
}

########################################
# CloudWatch Log Groups (90-day retention)
########################################
resource "aws_cloudwatch_log_group" "supabase" {
  name              = "/ecs/carevault-supabase"
  retention_in_days = 90    # NDPA audit trail requirement
}

########################################
# Outputs
########################################
output "rds_endpoint" {
  value     = aws_db_instance.postgres.address
  sensitive = true
}

output "alb_dns" {
  value = aws_lb.main.dns_name
}

output "ecr_registry" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.af-south-1.amazonaws.com"
}

data "aws_caller_identity" "current" {}
