import Constants from "expo-constants";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export interface Ad {
  id: string;
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  link?: string;
}

// Configuración de Google AdMob
const ANDROID_BANNER_AD_UNIT_ID = "ca-app-pub-7292780272347587/6596188384";
const FORCE_TEST_ADS = process.env.EXPO_PUBLIC_FORCE_TEST_ADS === "true";

// Tus 3 anuncios propios personalizados que se verán en Expo Go o Web
const MY_CUSTOM_ADS: Ad[] = [
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
    // 2. Corregido el número de teléfono con formato API seguro 👇
    link: "https://wa.me/573125023912",
  },
  /*{
    id: "3",
    title: "Contactar Directo",
    description: "Agenda tu cita con un solo click",
    icon: "✨",
    bgColor: "#ff69b4",
    // 2. Optimizamos a formato API para máxima compatibilidad con el intent de Android 👇
    link: "https://wa.me/573138428637",
  },*/
  
];

interface AdBannerProps {
  onAdPress?: (_ad: Ad) => void;
}

export function AdBanner({ onAdPress: _onAdPress }: AdBannerProps) {
  const isExpoGo = Constants.executionEnvironment === "storeClient";
  const isAndroid = Platform.OS === "android";
  const { width: windowWidth } = useWindowDimensions();

  // Estados para AdMob
  const [adMobModule, setAdMobModule] = React.useState<{
    BannerAd: any;
    BannerAdSize: any;
    TestIds: any;
  } | null>(null);
  const [adError, setAdError] = React.useState<string | null>(null);

  // Estados para tus anuncios rotativos
  const [adIndex, setAdIndex] = React.useState(0);

  // Efecto para cambiar tus anuncios cada 5 segundos (Siempre activo como fallback)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % MY_CUSTOM_ADS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Efecto original de AdMob para el APK instalado
  React.useEffect(() => {
    if (!isAndroid || isExpoGo) {
      return;
    }

    let isMounted = true;

    void import("react-native-google-mobile-ads")
      .then((mod) => {
        if (!isMounted) return;
        setAdMobModule({
          BannerAd: mod.BannerAd,
          BannerAdSize: mod.BannerAdSize,
          TestIds: mod.TestIds,
        });
      })
      .catch(() => {
        if (isMounted) setAdMobModule(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isAndroid, isExpoGo]);

  // Manejador de clicks nativo para tus anuncios en Expo Go
  const handleCustomAdPress = async (ad: Ad) => {
    if (ad.link) {
      try {
        await Linking.openURL(ad.link);
      } catch (err) {
        console.error("No se pudo abrir el enlace:", err);
      }
    }
    if (_onAdPress) {
      _onAdPress(ad);
    }
  };

  const currentAd = MY_CUSTOM_ADS[adIndex];

  const renderCustomAd = () => (
    <Pressable
      onPress={() => handleCustomAdPress(currentAd)}
      style={[styles.customBanner, { backgroundColor: currentAd.bgColor }]}
    >
      <Text style={styles.customBadge}>Anuncio Local</Text>
      <View style={styles.customContent}>
        <Text style={styles.customIcon}>{currentAd.icon}</Text>
        <View style={styles.customTextContainer}>
          <Text style={styles.customTitle}>{currentAd.title}</Text>
          <Text style={styles.customDescription}>{currentAd.description}</Text>
        </View>
      </View>
    </Pressable>
  );

  if (!isAndroid || isExpoGo) {
    return renderCustomAd();
  }

  if (!adMobModule || adError) {
    return renderCustomAd();
  }

  const { BannerAd, BannerAdSize, TestIds } = adMobModule;
  const isUsingTestAds = __DEV__ || FORCE_TEST_ADS;
  const adUnitId = isUsingTestAds ? TestIds.BANNER : ANDROID_BANNER_AD_UNIT_ID;
  const adModeLabel = isUsingTestAds
    ? "Modo prueba de AdMob"
    : "Modo real de AdMob";
  const bannerWidth = Math.max(Math.floor(windowWidth - 64), 200);
  const bannerSize =
    typeof BannerAdSize.currentOrientationAnchoredAdaptiveBannerAdSize ===
    "function"
      ? BannerAdSize.currentOrientationAnchoredAdaptiveBannerAdSize(bannerWidth)
      : BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

  return (
    <View>
      {renderCustomAd()}
      <View style={styles.adBanner}>
        <View style={styles.adHeader}>
          <Text style={styles.adBadge}>Anuncio</Text>
          <Text style={styles.adHelperText}>{adModeLabel}</Text>
        </View>

        <View style={styles.adFrame}>
          <BannerAd
            unitId={adUnitId}
            size={bannerSize}
            onAdFailedToLoad={() => {
              setAdError("No se pudo cargar el anuncio de AdMob.");
            }}
            onAdLoaded={() => setAdError(null)}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Estilos originales para Google AdMob
  adBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(120,120,120,0.25)",
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  adHeader: {
    paddingHorizontal: 12,
    gap: 6,
  },
  adFrame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  adBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(120,120,120,0.95)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  adPlaceholderText: {
    fontSize: 12,
    opacity: 0.8,
    paddingHorizontal: 12,
  },
  adHelperText: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: "600",
  },
  // Nuevos estilos para tus anuncios personalizados de Angie Nails
  customBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  customBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  customContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customIcon: {
    fontSize: 36,
  },
  customTextContainer: {
    flex: 1,
  },
  customTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
    color: "#fff",
  },
  customDescription: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
});
