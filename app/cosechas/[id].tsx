import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useThemeColor } from "../../hooks/use-theme-color";
import {
  getCurrentHarvestLabel,
  getSavedHarvestPreview,
  type HarvestEntry,
  type SavedHarvestPreview,
} from "../../lib/database";

function formatNumber(value: number) {
  return value.toFixed(2);
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
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

export default function SavedHarvestPreviewScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const savedHarvestId = Number(params.id ?? "");

  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const buttonBackgroundColor = Colors[colorScheme].tint;
  const buttonTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const borderColor = Colors[colorScheme].icon;
  const mutedColor = colorScheme === "dark" ? "#9BA1A6" : "#5b6470";

  const [preview, setPreview] = React.useState<SavedHarvestPreview | null>(
    null,
  );
  const [currentHarvestLabel, setCurrentHarvestLabel] = React.useState<
    string | null
  >(null);
  const [expandedWorkerId, setExpandedWorkerId] = React.useState<number | null>(
    null,
  );

  const loadData = React.useCallback(async () => {
    if (!Number.isFinite(savedHarvestId)) {
      setPreview(null);
      return;
    }

    const [previewData, currentLabel] = await Promise.all([
      getSavedHarvestPreview(savedHarvestId),
      getCurrentHarvestLabel(),
    ]);

    setPreview(previewData);
    setCurrentHarvestLabel(currentLabel);
  }, [savedHarvestId]);

  React.useEffect(() => {
    loadData().catch(() => {
      setPreview(null);
      setCurrentHarvestLabel(null);
    });
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const isCurrentPrincipal =
    preview !== null && currentHarvestLabel === preview.harvest.name;

  if (!Number.isFinite(savedHarvestId) || !preview) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.title, { color: textColor }]}>
          Cosecha no encontrada
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.primaryButton,
            { backgroundColor: buttonBackgroundColor },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>
            Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  const totalArrobas = preview.harvest.totalKg / 12.5;
  const totalPago = totalArrobas * preview.harvest.pricePerArroba;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text
            style={[styles.backButtonText, { color: Colors[colorScheme].tint }]}
          >
            ← Volver
          </Text>
        </Pressable>

        <View style={[styles.heroCard, { borderColor }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleBlock}>
              <Text style={[styles.title, { color: textColor }]}>
                {preview.harvest.name}
              </Text>
            </View>

          </View>

          <Text style={[styles.metaText, { color: mutedColor }]}>
            Guardada el {formatShortDate(preview.harvest.createdAt)}
          </Text>

          <Text style={[styles.readOnlyNote, { color: mutedColor }]}>
            Vista de consulta. Aqui solo puedes revisar la informacion guardada.
          </Text>

          <View style={[styles.priceCard, { borderColor }]}>
            <Text style={[styles.summaryLabel, { color: mutedColor }]}>
              Precio por arroba
            </Text>
            <Text style={[styles.priceValue, { color: textColor }]}>
              {formatMoney(preview.harvest.pricePerArroba)}
            </Text>
          </View>

          <View style={[styles.totalCard, { borderColor }]}>
            <Text style={[styles.summaryLabel, { color: mutedColor }]}>
              Resumen total
            </Text>
            <Text style={[styles.totalValue, { color: textColor }]}>
              {formatMoney(totalPago)}
            </Text>
            <Text style={[styles.totalMeta, { color: mutedColor }]}>
              {formatNumber(preview.harvest.totalKg)} kg ·{" "}
              {formatNumber(totalArrobas)} arrobas
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Obreros y registros
          </Text>
         
        </View>

        <FlatList
          data={preview.workers}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          contentContainerStyle={styles.workerList}
          renderItem={({ item }) => {
            const isExpanded = expandedWorkerId === item.id;
            const workerArrobas = item.totalKg / 12.5;
            const workerPayment =
              workerArrobas * preview.harvest.pricePerArroba;

            return (
              <View style={[styles.workerCard, { borderColor }]}>
                <Pressable
                  onPress={() =>
                    setExpandedWorkerId((currentId) =>
                      currentId === item.id ? null : item.id,
                    )
                  }
                  style={styles.workerHeader}
                >
                  <View style={styles.workerNameBlock}>
                    <Text style={[styles.workerName, { color: textColor }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.workerMeta, { color: mutedColor }]}>
                      {formatNumber(item.totalKg)} kg {"  >>  "} {formatNumber(item.totalKg/12.5)} arrobas
                    </Text>
                    <Text
                      style={[styles.workerPaymentMeta, { color: mutedColor }]}
                    >
                      Precio: {formatMoney(preview.harvest.pricePerArroba)} por
                      arroba {"  >>  "} Total: {formatMoney(workerPayment)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.expandHint,
                      { color: Colors[colorScheme].tint },
                    ]}
                  >
                    {isExpanded ? "Ocultar" : "Ver"}
                  </Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.entriesBlock}>
                    {item.entries.length === 0 ? (
                      <Text
                        style={[styles.emptyStateText, { color: mutedColor }]}
                      >
                        Sin registros guardados.
                      </Text>
                    ) : (
                      item.entries.map((entry: HarvestEntry) => (
                        <View
                          key={entry.id}
                          style={[styles.entryRow, { borderColor }]}
                        >
                          <Text
                            style={[styles.entryDate, { color: mutedColor }]}
                          >
                            {formatShortDate(entry.createdAt)}
                          </Text>
                          <Text style={[styles.entryKg, { color: textColor }]}>
                            {formatNumber(entry.kg)} kg
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  metaText: {
    marginTop: 8,
    fontSize: 14,
  },
  readOnlyNote: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  priceCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  priceValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
  },
  totalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  totalValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
  },
  totalMeta: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  sectionText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
  },
  workerList: {
    gap: 12,
    paddingBottom: 24,
  },
  workerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  workerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  workerNameBlock: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: "700",
  },
  workerMeta: {
    marginTop: 4,
    fontSize: 13,
  },
  workerPaymentMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  expandHint: {
    fontSize: 14,
    fontWeight: "700",
  },
  entriesBlock: {
    marginTop: 14,
    gap: 8,
  },
  entryRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDate: {
    fontSize: 13,
  },
  entryKg: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyStateText: {
    fontSize: 14,
  },
});
