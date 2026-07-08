import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTandaAlertController } from "../../hooks/use-tanda-alert";
import { useThemeColor } from "../../hooks/use-theme-color";
import {
    getTandaOverview,
    getTandaTargetArrobas,
    setTandaTargetArrobas,
    type TandaOverview,
} from "../../lib/database";

const DEFAULT_TANDA_OVERVIEW: TandaOverview = {
  targetArrobas: 35,
  totalKg: 0,
  totalArrobas: 0,
  checkpointArrobas: 0,
  progressArrobas: 0,
  completedTandas: 0,
  nextAlertAtArrobas: 10,
  remainingArrobas: 10,
};

function formatNumber(value: number) {
  return value.toFixed(2);
}

function formatTargetInput(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

export default function TandaAlertScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const accentColor = Colors[colorScheme].tint;
  const accentTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const borderColor = Colors[colorScheme].icon;
  const { activeAlert, dismissAlert, resetAlert } = useTandaAlertController();

  const [overview, setOverview] = React.useState<TandaOverview>(
    DEFAULT_TANDA_OVERVIEW,
  );
  const [targetInput, setTargetInput] = React.useState("35");
  const [targetError, setTargetError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const [currentOverview, currentTarget] = await Promise.all([
      getTandaOverview(),
      getTandaTargetArrobas(),
    ]);

    setOverview(currentOverview);
    setTargetInput(formatTargetInput(currentTarget));
  }, []);

  React.useEffect(() => {
    loadData().catch(() => {
      setOverview(DEFAULT_TANDA_OVERVIEW);
    });
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleSaveTarget = React.useCallback(async () => {
    const parsedTarget = Number(targetInput.replace(",", ".").trim());

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setTargetError("Ingresa una meta valida mayor a 0.");
      return;
    }

    setIsSaving(true);

    try {
      await setTandaTargetArrobas(parsedTarget);
      dismissAlert();
      setTargetError(null);
      await loadData();
      router.back();
    } finally {
      setIsSaving(false);
    }
  }, [dismissAlert, loadData, targetInput]);

  const handleResetAlert = React.useCallback(async () => {
    await resetAlert();
    await loadData();
    router.back();
  }, [loadData, resetAlert]);

  const handleConfirmReset = React.useCallback(() => {
    Alert.alert(
      "Reiniciar contador",
      "Se borrara el conteo actual y el historial reciente de tandas.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Reiniciar",
          style: "destructive",
          onPress: () => {
            void handleResetAlert();
          },
        },
      ],
    );
  }, [handleResetAlert]);

  const handleDismiss = React.useCallback(() => {
    dismissAlert();
    router.back();
  }, [dismissAlert]);

  const remainingKg = overview.remainingArrobas * 12.5;
  const reachedGoalArrobas = activeAlert?.reachedArrobas ?? 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "web" ? undefined : "padding"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: accentColor }]}>
            Volver
          </Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: textColor }]}>
            Alerta de Tanda
          </Text>
          <Text style={[styles.subtitle, { color: textColor }]}>
            Gestiona la alerta actual sin cargar el modal principal.
          </Text>
        </View>

        {activeAlert ? (
          <>
            <View style={[styles.heroCard, { borderColor }]}>
              <View style={[styles.badge, { backgroundColor: accentColor }]}>
                <Text style={[styles.badgeText, { color: accentTextColor }]}>
                  Meta completa
                </Text>
              </View>

              <Text style={[styles.heroTitle, { color: textColor }]}>
                Meta alcanzada: {formatNumber(reachedGoalArrobas)} arrobas
              </Text>
              <Text style={[styles.heroDescription, { color: textColor }]}>
                {activeAlert.workerName
                  ? `${activeAlert.workerName} disparo la meta con ${formatNumber(activeAlert.triggerKg ?? 0)} kg.`
                  : "La meta se completo con el ultimo registro de la cosecha."}{" "}
                Quedaron {formatNumber(activeAlert.overflowKg)} kg (
                {formatNumber(activeAlert.overflowArrobas)} arrobas) para la
                nueva tanda.
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: textColor }]}>
                    Meta actual
                  </Text>
                  <Text style={[styles.metricValue, { color: textColor }]}>
                    {formatNumber(overview.targetArrobas)} arrobas
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: textColor }]}>
                    Faltan
                  </Text>
                  <Text style={[styles.metricValue, { color: textColor }]}>
                    {formatNumber(overview.remainingArrobas)} arrobas
                  </Text>
                  <Text style={[styles.metricHint, { color: textColor }]}>
                    {formatNumber(remainingKg)} kg
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Cambiar meta ahora
              </Text>
              <Text style={[styles.sectionHint, { color: textColor }]}>
                Guarda una nueva meta y el conteo arrancara desde este momento.
              </Text>

              <View style={styles.formRow}>
                <TextInput
                  value={targetInput}
                  onChangeText={(value) => {
                    setTargetInput(value);
                    if (targetError) {
                      setTargetError(null);
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Ej: 10"
                  placeholderTextColor={Colors[colorScheme].icon}
                  style={[styles.input, { color: textColor, borderColor }]}
                />

                <Pressable
                  onPress={() => void handleSaveTarget()}
                  disabled={isSaving}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: accentColor },
                    isSaving && styles.disabledButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: accentTextColor },
                    ]}
                  >
                    {isSaving ? "Guardando" : "Guardar"}
                  </Text>
                </Pressable>
              </View>

              {targetError ? (
                <Text style={styles.errorText}>{targetError}</Text>
              ) : null}
            </View>

            <View style={styles.actionsColumn}>
              <Pressable
                onPress={handleConfirmReset}
                style={[
                  styles.primaryWideButton,
                  { backgroundColor: accentColor },
                ]}
              >
                <Text
                  style={[
                    styles.primaryWideButtonText,
                    { color: accentTextColor },
                  ]}
                >
                  Reiniciar conteo desde ahora
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/tandas")}
                style={[styles.secondaryButton, { borderColor }]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: textColor }]}
                >
                  Abrir panel completo de Tandas
                </Text>
              </Pressable>

              <Pressable onPress={handleDismiss} style={styles.ghostButton}>
                <Text style={[styles.ghostButtonText, { color: textColor }]}>
                  Seguir sin reiniciar
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={[styles.card, { borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              No hay alerta activa
            </Text>
            <Text style={[styles.sectionHint, { color: textColor }]}>
              Esta pantalla queda disponible para cuando se alcance una nueva
              tanda.
            </Text>
            <Pressable
              onPress={() => router.push("/tandas")}
              style={[
                styles.secondaryButton,
                styles.emptyAction,
                { borderColor },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: textColor }]}>
                Ir al panel de Tandas
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 28,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerBlock: {
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.78,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    backgroundColor: "rgba(125, 211, 199, 0.06)",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: "800",
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.82,
  },
  metricsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
  },
  metricHint: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.72,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.74,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    color: "#ff7b7b",
    fontSize: 13,
    fontWeight: "600",
  },
  actionsColumn: {
    gap: 10,
  },
  primaryButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  primaryWideButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryWideButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.82,
  },
  emptyAction: {
    marginTop: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
