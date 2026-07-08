import React from "react";
import {
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    fetchRemoteUpdateConfig,
    type RemoteAdConfig,
} from "../../lib/app-update";

function logRemoteAds(message: string, payload: unknown) {
  if (__DEV__) {
    console.log(`[AdBanner] ${message}`, payload);
  }
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  link?: string;
}

const DEFAULT_ADS: Ad[] = [
  {
    id: "1",
    title: "Angie Nails Studio",
    description: "Uñas perfectas y accesorios exclusivos",
    icon: "💅",
    bgColor: "#ffc0cb",
    link: "https://anderson03aya.github.io/Angie_Nails_Studio/",
  },
  {
    id: "2",
    title: "Quieres tu App o web? ",
    description: "Diseñamos paginas web y apps para tu negocio",
    icon: "📊",
    bgColor: "#2563eb",
    link: "https://wa.me/573125023912",
  },
];

interface AdBannerProps {
  onAdPress?: (ad: Ad) => void;
}

function extractAdsFromPayload(payload: unknown): RemoteAdConfig[] {
  if (Array.isArray(payload)) {
    return payload as RemoteAdConfig[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.ads)) {
      return record.ads as RemoteAdConfig[];
    }

    if (record.android && typeof record.android === "object") {
      const androidRecord = record.android as Record<string, unknown>;
      if (Array.isArray(androidRecord.ads)) {
        return androidRecord.ads as RemoteAdConfig[];
      }
    }

    if (record.ios && typeof record.ios === "object") {
      const iosRecord = record.ios as Record<string, unknown>;
      if (Array.isArray(iosRecord.ads)) {
        return iosRecord.ads as RemoteAdConfig[];
      }
    }
  }

  return [];
}

function normalizeAds(rawAds: RemoteAdConfig[] | undefined): Ad[] {
  if (!Array.isArray(rawAds) || rawAds.length === 0) {
    return [];
  }

  return rawAds
    .filter((ad) => Boolean(ad?.title || ad?.description || ad?.link))
    .map((ad, index) => ({
      id: ad.id || `${index + 1}`,
      title: ad.title?.trim() || "Anuncio",
      description: ad.description?.trim() || "",
      icon: ad.icon?.trim() || "📢",
      bgColor: ad.bgColor?.trim() || "#2563eb",
      link: ad.link?.trim(),
    }));
}

export function AdBanner({ onAdPress }: AdBannerProps) {
  const [ads, setAds] = React.useState<Ad[]>(DEFAULT_ADS);
  const [adIndex, setAdIndex] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const config = await fetchRemoteUpdateConfig();

        if (!isMounted) {
          return;
        }

        const remoteAds = normalizeAds(extractAdsFromPayload(config));

        if (remoteAds.length > 0) {
          logRemoteAds("anuncios remotos cargados", remoteAds);
          setAds(remoteAds);
          setAdIndex(0);
          return;
        }

        if (Platform.OS === "web") {
          const response = await fetch("/update-config.json", {
            headers: {
              Accept: "application/json",
            },
          });

          if (response.ok) {
            const payload = await response.json();
            const parsedAds = normalizeAds(extractAdsFromPayload(payload));

            if (parsedAds.length > 0) {
              logRemoteAds("anuncios desde /update-config.json", parsedAds);
              setAds(parsedAds);
              setAdIndex(0);
            }
          }
        }
      } catch {
        // Se mantiene el fallback local si falla la carga remota.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (ads.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [ads.length]);

  const currentAd = ads[adIndex] ?? DEFAULT_ADS[0];

  const handlePress = async () => {
    if (currentAd.link) {
      try {
        const url = currentAd.link.trim();

        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          await Linking.openURL(url);
        }
      } catch (err) {
        console.error("No se pudo abrir el enlace:", err);
      }
    }

    if (onAdPress) {
      onAdPress(currentAd);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.adBanner, { backgroundColor: currentAd.bgColor }]}
    >
      <Text style={styles.adBadge}>Anuncio</Text>
      <View style={styles.adContent}>
        <Text style={styles.adIcon}>{currentAd.icon}</Text>
        <View style={styles.adText}>
          <Text style={styles.adTitle}>{currentAd.title}</Text>
          <Text style={styles.adDescription}>{currentAd.description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  adBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  adContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adIcon: {
    fontSize: 36,
  },
  adText: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
    color: "#fff",
  },
  adDescription: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
});

export default AdBanner;
