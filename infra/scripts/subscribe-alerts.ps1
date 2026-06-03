# Subscribe an email address to the CareVault production alert topic.
# Usage: .\infra\scripts\subscribe-alerts.ps1 -Email you@example.com

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

$AWS    = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$REGION = "af-south-1"

$TOPIC_ARN = (& $AWS sns list-topics --region $REGION --query "Topics[?contains(TopicArn,'carevault-alerts')].TopicArn" --output text)

if (-not $TOPIC_ARN) {
    Write-Error "carevault-alerts SNS topic not found. Deploy CareVaultMonitoring first."
    exit 1
}

& $AWS sns subscribe `
    --topic-arn $TOPIC_ARN `
    --protocol email `
    --notification-endpoint $Email `
    --region $REGION

Write-Host "Confirmation email sent to $Email — click the link in it to activate alerts."
