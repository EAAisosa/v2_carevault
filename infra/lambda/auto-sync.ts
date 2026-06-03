import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const smClient = new SecretsManagerClient({ region: process.env["AWS_REGION"] });

export const handler = async (): Promise<{ statusCode: number; body: string }> => {
  const secretArn = process.env["CRON_SECRET_ARN"];
  const apiUrl = process.env["API_URL"];

  if (!secretArn || !apiUrl) {
    throw new Error("CRON_SECRET_ARN and API_URL env vars are required");
  }

  const secretValue = await smClient.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  const cronSecret = secretValue.SecretString ?? "";

  const endpoint = `${apiUrl}/api/v1/sync/internal/auto-sync`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-cron-secret": cronSecret,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Auto-sync failed: HTTP ${response.status} — ${body}`);
  }

  const result = await response.json();
  return { statusCode: 200, body: JSON.stringify(result) };
};
