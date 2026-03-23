import {DEF_TIME_MONTHS_IN_SECONDS} from "#lib/defs";
import type {TokenStorage} from "#types/types";

export const getRegisterTokenForSubdomain = (storage: TokenStorage, subdomain: string) => {
  return storage.get<string>(`domains/${subdomain}`)
}

export const registerSubdomain = (storage: TokenStorage, subdomain: string, token: string) => {
  return storage.set(`domains/${subdomain}`, token, DEF_TIME_MONTHS_IN_SECONDS)
}

export const getSubdomainByProfileHash = (storage: TokenStorage, token: string, profileHash: string): Promise<string | null> => {
  return storage.get<string>(`domains-by-token/${token}/profile/${profileHash}`)
}

export const getSubdomainByTargetHash = (storage: TokenStorage, token: string, targetHash: string): Promise<string | null> => {
  return storage.get<string>(`domains-by-token/${token}/target/${targetHash}`)
}

export const linkSubdomainToTargetHash = async (storage: TokenStorage, token: string, targetHash: string, subdomain: string): Promise<void> => {
  await storage.set(`domains-by-token/${token}/target/${targetHash}`, subdomain, DEF_TIME_MONTHS_IN_SECONDS)
}

export const linkSubdomainToProfileHash = async (storage: TokenStorage, token: string, profileHash: string, subdomain: string): Promise<void> => {
  await storage.set(`domains-by-token/${token}/profile/${profileHash}`, subdomain, DEF_TIME_MONTHS_IN_SECONDS)
}
