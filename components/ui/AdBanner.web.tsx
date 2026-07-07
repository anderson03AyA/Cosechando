import React from "react";
import { Pressable, StyleSheet, Text, View, Linking } from "react-native";

export interface Ad {
  id: string;
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  link?: string;
}

const ADS: Ad[] = [
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
  onAdPress?: (ad: Ad) => void;
}

export function AdBanner({ onAdPress }: AdBannerProps) {
  const [adIndex, setAdIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % ADS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentAd = ADS[adIndex];

  // Función interna para manejar la acción del click
  const handlePress = () => {
    if (onAdPress) {
      // Si le pasas una función desde el componente padre, la ejecuta primero
      onAdPress(currentAd);
    } else if (currentAd.link) {
      // Si no le pasas nada, abre directamente el enlace en el navegador
      Linking.openURL(currentAd.link).catch((err) =>
        console.error("No se pudo abrir el enlace", err)
      );
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
