import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_UPDATE_CONFIG_URL =
  "https://api.jsonbin.io/v3/b/6a4dc882da38895dfe3e3518";
const LOCAL_UPDATE_CONFIG_PATH =
  Platform.OS === "web" ? "/update-config.json" : "./update-config.json";

export type RemoteAdConfig = {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  bgColor?: string;
  link?: string;
};

export type PlatformUpdateConfig = {
  minimumVersion?: string;
  recommendedVersion?: string;
  forceUpdate?: boolean;
  title?: string;
  message?: string;
  updateUrl?: string;
};

export type RemoteUpdateConfig = {
  minimumVersion?: string;
  recommendedVersion?: string;
  forceUpdate?: boolean;
  title?: string;
  message?: string;
  updateUrl?: string;
  ads?: RemoteAdConfig[];
  adsUrl?: string;
  android?: PlatformUpdateConfig;
  ios?: PlatformUpdateConfig;
};

export type AppUpdatePrompt = {
  title: string;
  message: string;
  isRequired: boolean;
  updateUrl: string;
  targetVersion: string;
};

const UPDATE_CONFIG_URL =
  process.env.EXPO_PUBLIC_UPDATE_CONFIG_URL?.trim() ||
  DEFAULT_UPDATE_CONFIG_URL;

function getInstalledVersion() {
  return Constants.expoConfig?.version?.trim() || "0.0.0";
}

function getDefaultStoreUrl() {
  if (Platform.OS === "ios") {
    const bundleIdentifier =
      Constants.expoConfig?.ios?.bundleIdentifier?.trim();

    if (bundleIdentifier) {
      return `https://apps.apple.com/app/${bundleIdentifier}`;
    }
  }

  if (Platform.OS === "android") {
    const packageName = Constants.expoConfig?.android?.package?.trim();

    if (packageName) {
      return `https://play.google.com/store/apps/details?id=${packageName}`;
    }
  }

  return "";
}

function normalizeVersion(version: string) {
  return version
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))
    .map((segment) => (Number.isFinite(segment) ? segment : 0));
}

function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

function unwrapJsonBinPayload(payload: unknown): RemoteUpdateConfig | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = (payload as Record<string, unknown>).record;

  if (record && typeof record === "object") {
    return record as RemoteUpdateConfig;
  }

  return payload as RemoteUpdateConfig;
}

export async function fetchRemoteUpdateConfig(): Promise<RemoteUpdateConfig | null> {
  const candidates = [UPDATE_CONFIG_URL, LOCAL_UPDATE_CONFIG_PATH].filter(
    (value) => value.trim().length > 0,
  );

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      return unwrapJsonBinPayload(payload);
    } catch {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}

function getPlatformConfig(remoteConfig: RemoteUpdateConfig) {
  const platformConfig =
    Platform.OS === "ios" ? remoteConfig.ios : remoteConfig.android;

  if (platformConfig) {
    return platformConfig;
  }

  return remoteConfig;
}

export async function getAppUpdatePrompt(): Promise<AppUpdatePrompt | null> {
  const remoteConfig = await fetchRemoteUpdateConfig();

  if (!remoteConfig) {
    return null;
  }

  const platformConfig = getPlatformConfig(remoteConfig);
  const installedVersion = getInstalledVersion();
  const minimumVersion = platformConfig.minimumVersion?.trim() ?? "";
  const recommendedVersion = platformConfig.recommendedVersion?.trim() ?? "";
  const updateUrl =
    platformConfig.updateUrl?.trim() ||
    remoteConfig.updateUrl?.trim() ||
    getDefaultStoreUrl();

  if (!updateUrl) {
    return null;
  }

  if (minimumVersion && compareVersions(installedVersion, minimumVersion) < 0) {
    return {
      title:
        platformConfig.title?.trim() ||
        remoteConfig.title?.trim() ||
        "Actualizacion requerida",
      message:
        platformConfig.message?.trim() ||
        remoteConfig.message?.trim() ||
        "Hay una nueva version disponible y necesitas actualizar para seguir usando la app.",
      isRequired: true,
      updateUrl,
      targetVersion: minimumVersion,
    };
  }

  if (
    recommendedVersion &&
    compareVersions(installedVersion, recommendedVersion) < 0
  ) {
    return {
      title:
        platformConfig.title?.trim() ||
        remoteConfig.title?.trim() ||
        "Actualizacion disponible",
      message:
        platformConfig.message?.trim() ||
        remoteConfig.message?.trim() ||
        "Hay una nueva version disponible con mejoras y correcciones.",
      isRequired:
        platformConfig.forceUpdate === true ||
        remoteConfig.forceUpdate === true,
      updateUrl,
      targetVersion: recommendedVersion,
    };
  }

  return null;
}
