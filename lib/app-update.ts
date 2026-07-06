import Constants from "expo-constants";
import { Platform } from "react-native";

type RemoteUpdateConfig = {
  minimumVersion?: string;
  recommendedVersion?: string;
  forceUpdate?: boolean;
  title?: string;
  message?: string;
  updateUrl?: string;
};

export type AppUpdatePrompt = {
  title: string;
  message: string;
  isRequired: boolean;
  updateUrl: string;
  targetVersion: string;
};

const UPDATE_CONFIG_URL =
  process.env.EXPO_PUBLIC_UPDATE_CONFIG_URL?.trim() ?? "";

function getInstalledVersion() {
  return Constants.expoConfig?.version?.trim() || "0.0.0";
}

function getDefaultStoreUrl() {
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

async function fetchRemoteUpdateConfig(): Promise<RemoteUpdateConfig | null> {
  if (!UPDATE_CONFIG_URL) {
    return null;
  }

  const response = await fetch(UPDATE_CONFIG_URL, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`UPDATE_CONFIG_${response.status}`);
  }

  return (await response.json()) as RemoteUpdateConfig;
}

export async function getAppUpdatePrompt(): Promise<AppUpdatePrompt | null> {
  const remoteConfig = await fetchRemoteUpdateConfig();

  if (!remoteConfig) {
    return null;
  }

  const installedVersion = getInstalledVersion();
  const minimumVersion = remoteConfig.minimumVersion?.trim() ?? "";
  const recommendedVersion = remoteConfig.recommendedVersion?.trim() ?? "";
  const updateUrl = remoteConfig.updateUrl?.trim() || getDefaultStoreUrl();

  if (!updateUrl) {
    return null;
  }

  if (minimumVersion && compareVersions(installedVersion, minimumVersion) < 0) {
    return {
      title: remoteConfig.title?.trim() || "Actualizacion requerida",
      message:
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
      title: remoteConfig.title?.trim() || "Actualizacion disponible",
      message:
        remoteConfig.message?.trim() ||
        "Hay una nueva version disponible con mejoras y correcciones.",
      isRequired: remoteConfig.forceUpdate === true,
      updateUrl,
      targetVersion: recommendedVersion,
    };
  }

  return null;
}
