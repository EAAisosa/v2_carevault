export interface EHRCredentials {
  username?: string;
  password?: string;
  client_id?: string;
  client_secret?: string;
  token_url?: string;
  api_key?: string;
  header?: string;
  api_key_header?: string;
}

export type AuthType = "basic" | "oauth2" | "api_key";

/** Build HTTP Authorization headers for the given auth strategy */
export async function getAuthHeaders(
  authType: AuthType,
  creds: EHRCredentials
): Promise<Record<string, string>> {
  switch (authType) {
    case "basic": {
      const encoded = Buffer.from(`${creds.username ?? ""}:${creds.password ?? ""}`).toString(
        "base64"
      );
      return { Authorization: `Basic ${encoded}` };
    }

    case "oauth2": {
      if (!creds.token_url || !creds.client_id || !creds.client_secret) {
        throw new Error("oauth2 requires token_url, client_id, and client_secret");
      }
      const tokenRes = await fetch(creds.token_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: creds.client_id,
          client_secret: creds.client_secret,
        }),
      });
      if (!tokenRes.ok) {
        throw new Error(`OAuth2 token request failed: ${tokenRes.status} ${tokenRes.statusText}`);
      }
      const { access_token } = (await tokenRes.json()) as { access_token: string };
      return { Authorization: `Bearer ${access_token}` };
    }

    case "api_key": {
      const headerName = creds.header ?? creds.api_key_header ?? "X-API-Key";
      if (!creds.api_key) throw new Error("api_key auth requires api_key value");
      return { [headerName]: creds.api_key };
    }

    default:
      return {};
  }
}
