# Creates the GitHub Actions OIDC provider and IAM deploy role.
# Run once after cdk deploy CareVaultCompute.
# Usage: .\infra\scripts\setup-github-oidc.ps1

$AWS      = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$REGION   = "af-south-1"
$ACCOUNT  = "726369768109"
$REPO     = "5-Six/v2_carevault"
$ROLE     = "carevault-github-deploy"

# ── 1. OIDC provider ──────────────────────────────────────────────────────────
$OIDC_ARN = "arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"

$existing = & $AWS iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?Arn=='$OIDC_ARN'].Arn" --output text 2>$null
if (-not $existing) {
    Write-Host "Creating GitHub OIDC provider..."
    & $AWS iam create-open-id-connect-provider `
        --url "https://token.actions.githubusercontent.com" `
        --client-id-list "sts.amazonaws.com" `
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" `
        --region $REGION
} else {
    Write-Host "OIDC provider already exists."
}

# ── 2. Trust policy ───────────────────────────────────────────────────────────
$TRUST = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO}:ref:refs/heads/main"
        }
      }
    }
  ]
}
"@

# ── 3. Permissions policy ─────────────────────────────────────────────────────
$POLICY = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuth",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "EcrPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:${REGION}:${ACCOUNT}:repository/carevault-api"
    },
    {
      "Sid": "EcsRegisterTaskDef",
      "Effect": "Allow",
      "Action": [
        "ecs:RegisterTaskDefinition",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EcsDeploy",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices"
      ],
      "Resource": "arn:aws:ecs:${REGION}:${ACCOUNT}:service/carevault/carevault-api"
    },
    {
      "Sid": "PassTaskRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::${ACCOUNT}:role/CareVaultCompute-ApiTaskDef*"
    }
  ]
}
"@

# ── 4. Create role ────────────────────────────────────────────────────────────
Write-Host "Creating IAM role $ROLE..."
$TRUST_FILE  = [System.IO.Path]::GetTempFileName() + ".json"
$POLICY_FILE = [System.IO.Path]::GetTempFileName() + ".json"

$TRUST  | Out-File -FilePath $TRUST_FILE  -Encoding utf8
$POLICY | Out-File -FilePath $POLICY_FILE -Encoding utf8

& $AWS iam create-role `
    --role-name $ROLE `
    --assume-role-policy-document "file://$TRUST_FILE" `
    --description "GitHub Actions deploy role for CareVault (repo: $REPO)"

& $AWS iam put-role-policy `
    --role-name $ROLE `
    --policy-name "carevault-deploy-policy" `
    --policy-document "file://$POLICY_FILE"

Remove-Item $TRUST_FILE, $POLICY_FILE -ErrorAction SilentlyContinue

# ── 5. Output ─────────────────────────────────────────────────────────────────
$ROLE_ARN = "arn:aws:iam::${ACCOUNT}:role/${ROLE}"
Write-Host ""
Write-Host "================================================================"
Write-Host "  Done. Add this secret to your GitHub repo:"
Write-Host ""
Write-Host "  Secret name : AWS_DEPLOY_ROLE_ARN"
Write-Host "  Secret value: $ROLE_ARN"
Write-Host ""
Write-Host "  GitHub repo settings:"
Write-Host "  https://github.com/$REPO/settings/secrets/actions"
Write-Host "================================================================"
