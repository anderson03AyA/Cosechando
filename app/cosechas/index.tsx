import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useThemeColor } from "../../hooks/use-theme-color";
import {
  deleteSavedHarvest,
  getCurrentHarvestLabel,
  getSavedHarvests,
  type SavedHarvest,
} from "../../lib/database";

function formatNumber(value: number) {
  return value.toFixed(2);
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

export default function SavedHarvestsScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const buttonBackgroundColor = Colors[colorScheme].tint;
  const buttonTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const borderColor = Colors[colorScheme].icon;

  const [savedHarvests, setSavedHarvests] = React.useState<SavedHarvest[]>([]);
  const [currentHarvestLabel, setCurrentHarvestLabel] = React.useState<
    string | null
  >(null);

  const loadData = React.useCallback(async () => {
    const [rows, currentLabel] = await Promise.all([
      getSavedHarvests(),
      getCurrentHarvestLabel(),
    ]);

    setSavedHarvests(rows);
    setCurrentHarvestLabel(currentLabel);
  }, []);

  React.useEffect(() => {
    loadData().catch(() => {
      setSavedHarvests([]);
    });
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleOpenHarvest = React.useCallback((harvestId: number) => {
    router.push({
      pathname: "/cosechas/[id]",
      params: { id: String(harvestId) },
    });
  }, []);

  const handleDeleteHarvest = React.useCallback(
    (harvest: SavedHarvest) => {
      Alert.alert(
        "⚠️Eliminar cosecha",
        `Esta acción eliminará permanentemente la cosecha guardada “${harvest.name}”. No se podrá recuperar.`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Sí, eliminar",
            style: "destructive",
            onPress: () => {
              void deleteSavedHarvest(harvest.id).then(loadData);
            },
          },
        ],
      );
    },
    [loadData],
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text
          style={[styles.backButtonText, { color: Colors[colorScheme].tint }]}
        >
          ← Volver
        </Text>
      </Pressable>

      <Text style={[styles.title, { color: textColor }]}>
        Cosechas guardadas
      </Text>

      <FlatList
        data={savedHarvests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: textColor }]}>
            Aun no hay cosechas guardadas.
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrentPrincipal = currentHarvestLabel === item.name;

          return (
            <View style={[styles.card, { borderColor }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={[styles.cardTitle, { color: textColor }]}>
                    {item.name}
                  </Text>
                  {isCurrentPrincipal ? (
                    <View
                      style={[
                        styles.currentChip,
                        { backgroundColor: buttonBackgroundColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.currentChipText,
                          { color: buttonTextColor },
                        ]}
                      >
                        Principal
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.cardDate, { color: textColor }]}>
                  {formatShortDate(item.createdAt)}
                </Text>
              </View>

              <Text style={[styles.cardMeta, { color: textColor }]}>
                {item.workerCount} obreros {" >> "} {formatNumber(item.totalKg)}{" "}
                kg {" >> "} {formatNumber(item.totalKg / 12.5)} arrobas
              </Text>

              <Text style={[styles.cardMeta, { color: textColor }]}>
                Arroba: $
                {Math.round(item.pricePerArroba).toLocaleString("es-CO")}
                {"   >>   "} Total: $
                {Math.round(
                  item.pricePerArroba * (item.totalKg / 12.5),
                ).toLocaleString("es-CO")}
              </Text>

              <Pressable
                style={[
                  styles.button,
                  { backgroundColor: buttonBackgroundColor },
                ]}
                onPress={() => handleOpenHarvest(item.id)}
              >
                <Text style={[styles.buttonText, { color: buttonTextColor }]}>
                  Ver detalles
                </Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, { borderColor: "red" }]}
                onPress={() => handleDeleteHarvest(item)}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: textColor }]}
                >
                  Eliminar
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  currentChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currentChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  cardDate: {
    fontSize: 13,
    opacity: 0.72,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 14,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
