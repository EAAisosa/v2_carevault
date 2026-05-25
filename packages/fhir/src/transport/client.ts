import { getAuthHeaders } from "./auth";
import type { EHRCredentials, AuthType } from "./auth";
import type { FHIRBundle } from "../types";
import type { NormalizedRecord } from "../mappers/bundle";

export type { NormalizedRecord };

export interface EHRConfig {
  baseUrl: string;
  authType: AuthType;
  authCredentials: EHRCredentials;
  fhirVersion?: string;
}

/** Pull a FHIR resource or Bundle from a remote EHR */
export async function pullFromEHR(config: EHRConfig, endpoint: string): Promise<FHIRBundle> {
  const authHeaders = await getAuthHeaders(config.authType, config.authCredentials);
  const url = `${config.baseUrl.replace(/\/$/, "")}/${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/fhir+json",
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(`EHR pull failed [${url}]: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<FHIRBundle>;
}

/** Push a FHIR resource to a remote EHR */
export async function pushToEHR(
  config: EHRConfig,
  resourceType: string,
  payload: unknown
): Promise<unknown> {
  const authHeaders = await getAuthHeaders(config.authType, config.authCredentials);
  const url = `${config.baseUrl.replace(/\/$/, "")}/${resourceType}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`EHR push failed [${url}]: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
