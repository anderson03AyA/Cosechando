import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Animated,
  type DimensionValue,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  getCurrentTandaFeed,
  getTandaOverview,
  setTandaTargetArrobas,
  type TandaCurrentEntry,
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function TandasScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const buttonBackgroundColor = Colors[colorScheme].tint;
  const buttonTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const borderColor = Colors[colorScheme].icon;
  const { dismissAlert, refreshAlert, resetAlert } = useTandaAlertController();

  const [overview, setOverview] = React.useState<TandaOverview>(
    DEFAULT_TANDA_OVERVIEW,
  );
  const [targetInput, setTargetInput] = React.useState("35");
  const [currentTandaEntries, setCurrentTandaEntries] = React.useState<
    TandaCurrentEntry[]
  >([]);
  const [isTargetModalVisible, setIsTargetModalVisible] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [targetError, setTargetError] = React.useState<string | null>(null);
  const jellyPulse = React.useRef(new Animated.Value(0)).current;
  const jellySweep = React.useRef(new Animated.Value(0)).current;

  const loadData = React.useCallback(async () => {
    const [currentOverview, tandaCurrentEntries] = await Promise.all([
      getTandaOverview(),
      getCurrentTandaFeed(20),
    ]);

    setOverview(currentOverview);
    setTargetInput(formatTargetInput(currentOverview.targetArrobas));
    setCurrentTandaEntries(tandaCurrentEntries);
  }, []);

  React.useEffect(() => {
    loadData().catch(() => {
      setCurrentTandaEntries([]);
      setOverview(DEFAULT_TANDA_OVERVIEW);
    });
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  React.useEffect(() => {
    const jellyAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(jellyPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(jellyPulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const sweepAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(jellySweep, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(jellySweep, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    jellyAnimation.start();
    sweepAnimation.start();

    return () => {
      jellyAnimation.stop();
      sweepAnimation.stop();
      jellyPulse.setValue(0);
      jellySweep.setValue(0);
    };
  }, [jellyPulse, jellySweep]);

  const progressRatio =
    overview.targetArrobas > 0
      ? Math.min(
          Math.max(overview.progressArrobas / overview.targetArrobas, 0),
          1,
        )
      : 0;
  const currentProgressKg = overview.progressArrobas * 12.5;
  const remainingKg = overview.remainingArrobas * 12.5;
  const progressWidth =
    `${Math.max(progressRatio * 100, progressRatio > 0 ? 6 : 0)}%` as const;
  const jellyScaleX = jellyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const jellyScaleY = jellyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.91],
  });
  const jellyLift = jellyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });
  const jellyGlowOpacity = jellyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.14, 0.34],
  });
  const jellySweepTranslateX = jellySweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-56, 240],
  });
  const jellySweepOpacity = jellySweep.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.08, 0.2, 0.08],
  });
  const particleOpacity = jellySweep.interpolate({
    inputRange: [0, 0.2, 0.7, 1],
    outputRange: [0, 0.95, 0.45, 0],
  });
  const particleRisePrimary = jellySweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });
  const particleRiseSecondary = jellySweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });
  const particleDriftLeft = jellySweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });
  const particleDriftRight = jellySweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });
  const particleScale = jellySweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.15],
  });
  const progressTrackBackgroundColor = isDarkMode
    ? "rgba(125, 139, 153, 0.10)"
    : "rgba(10, 126, 164, 0.16)";
  const progressTrackInnerColor = isDarkMode
    ? "rgba(125, 139, 153, 0.12)"
    : "rgba(10, 126, 164, 0.12)";
  const progressSweepColor = isDarkMode
    ? "rgba(255,255,255,0.28)"
    : "rgba(255,255,255,0.44)";
  const progressGlowColor = isDarkMode
    ? "rgba(255,255,255,0.22)"
    : "rgba(10,126,164,0.26)";
  const progressBlobColor = isDarkMode
    ? "rgba(255,255,255,0.3)"
    : "rgba(10,126,164,0.34)";
  const progressHighlightColor = isDarkMode
    ? "rgba(255,255,255,0.56)"
    : "rgba(255,255,255,0.72)";
  const progressDropColor = isDarkMode
    ? "rgba(255,255,255,0.2)"
    : "rgba(10,126,164,0.24)";
  const progressParticlePrimaryColor = isDarkMode
    ? "rgba(255, 244, 214, 0.92)"
    : "rgba(10, 126, 164, 0.82)";
  const progressParticleSecondaryColor = isDarkMode
    ? "rgba(255, 255, 255, 0.78)"
    : "rgba(255, 255, 255, 0.96)";
  const progressParticleTinyColor = isDarkMode
    ? "rgba(255, 255, 255, 0.92)"
    : "rgba(10, 126, 164, 0.9)";

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
      await refreshAlert();
      setTargetError(null);
      setIsTargetModalVisible(false);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }, [dismissAlert, loadData, refreshAlert, targetInput]);

  const handleResetAlert = React.useCallback(async () => {
    await resetAlert();
    await loadData();
  }, [loadData, resetAlert]);

  const handleConfirmReset = React.useCallback(() => {
    Alert.alert(
      "Reiniciar contador",
      "Se borrara el conteo actual y el historial reciente de tandas. Esta accion no se puede deshacer.",
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

  const handleOpenTargetModal = React.useCallback(() => {
    setTargetInput(formatTargetInput(overview.targetArrobas));
    setTargetError(null);
    setIsTargetModalVisible(true);
  }, [overview.targetArrobas]);

  const handleCloseTargetModal = React.useCallback(() => {
    if (isSaving) {
      return;
    }

    setIsTargetModalVisible(false);
    setTargetError(null);
    setTargetInput(formatTargetInput(overview.targetArrobas));
  }, [isSaving, overview.targetArrobas]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "web" ? undefined : "padding"}
    >
      <FlatList
        data={currentTandaEntries}
        keyExtractor={(item) => String(item.id)}
        style={styles.list }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text
                style={[
                  styles.backButtonText,
                  { color: Colors[colorScheme].tint },
                  { paddingLeft: 10 },
                ]}
              >
                ←Volver
              </Text>
            </Pressable>

            <View style={styles.headerBlock}>
              <Text style={[styles.title, { color: textColor }]}>Tandas</Text>
            </View>

            <View style={[styles.summaryCard, { borderColor }]}>
              <Text style={[styles.summaryCardTitle, { color: textColor }]}>
                Contador actual
              </Text>

              <View style={[styles.targetHeroCard, { borderColor }]}>
                <View style={styles.targetHeroTextBlock}>
                  <Text style={[styles.targetHeroLabel, { color: textColor }]}>
                    Meta por tanda
                  </Text>
                  <Text style={[styles.targetHeroValue, { color: textColor }]}>
                    {formatNumber(overview.targetArrobas)} arrobas
                  </Text>
                </View>

                <Pressable
                  onPress={handleOpenTargetModal}
                  style={[
                    styles.targetHeroButton,
                    { backgroundColor: buttonBackgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.targetHeroButtonText,
                      { color: buttonTextColor },
                    ]}
                  >
                    Actualizar
                  </Text>
                </Pressable>
              </View>

              <View style={styles.summaryCardStatsRow}>
                <View style={styles.summaryCardStatItem}>
                  <Text
                    style={[styles.summaryCardStatLabel, { color: textColor }]}
                  >
                    Contando
                  </Text>
                  <Text
                    style={[styles.summaryCardStatValue, { color: textColor }]}
                  >
                    {formatNumber(overview.progressArrobas)} arrobas
                  </Text>
                  <Text
                    style={[styles.summaryCardStatMeta, { color: textColor }]}
                  >
                    {formatNumber(currentProgressKg)} kg
                  </Text>
                </View>

                <View style={styles.summaryCardStatItem}>
                  <Text
                    style={[styles.summaryCardStatLabel, { color: textColor }]}
                  >
                    Faltan
                  </Text>
                  <Text
                    style={[styles.summaryCardStatValue, { color: textColor }]}
                  >
                    {formatNumber(overview.remainingArrobas)} arrobas
                  </Text>
                  <Text
                    style={[styles.summaryCardStatMeta, { color: textColor }]}
                  >
                    {formatNumber(remainingKg)} kg
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: progressTrackBackgroundColor },
                ]}
              >
                <View
                  style={[
                    styles.progressTrackInner,
                    { backgroundColor: progressTrackInnerColor },
                  ]}
                >
                  <View
                    style={[
                      styles.progressActive,
                      {
                        width: progressWidth as DimensionValue,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: buttonBackgroundColor },
                      ]}
                    >
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.progressJellySweep,
                          { backgroundColor: progressSweepColor },
                          {
                            opacity: jellySweepOpacity,
                            transform: [{ translateX: jellySweepTranslateX }],
                          },
                        ]}
                      />
                    </View>

                    {progressRatio > 0 ? (
                      <>
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressJellyGlow,
                            { backgroundColor: progressGlowColor },
                            {
                              opacity: jellyGlowOpacity,
                              transform: [
                                { translateY: jellyLift },
                                { scaleX: jellyScaleX },
                                { scaleY: jellyScaleY },
                              ],
                            },
                          ]}
                        />
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressJellyBlob,
                            { backgroundColor: progressBlobColor },
                            {
                              transform: [
                                { translateY: jellyLift },
                                { scaleX: jellyScaleX },
                                { scaleY: jellyScaleY },
                              ],
                            },
                          ]}
                        />
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressJellyHighlight,
                            { backgroundColor: progressHighlightColor },
                            {
                              transform: [
                                { translateY: jellyLift },
                                { scaleX: jellyScaleX },
                                { scaleY: jellyScaleY },
                              ],
                            },
                          ]}
                        />
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressJellyDrop,
                            { backgroundColor: progressDropColor },
                            {
                              transform: [
                                { translateY: jellyLift },
                                { scaleX: jellyScaleX },
                                { scaleY: jellyScaleY },
                              ],
                            },
                          ]}
                        />
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressParticle,
                            styles.progressParticlePrimary,
                            { backgroundColor: progressParticlePrimaryColor },
                            {
                              opacity: particleOpacity,
                              transform: [
                                { translateY: particleRisePrimary },
                                { translateX: particleDriftRight },
                                { scale: particleScale },
                              ],
                            },
                          ]}
                        />
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressParticle,
                            styles.progressParticleSecondary,
                            { backgroundColor: progressParticleSecondaryColor },
                            {
                              opacity: particleOpacity,
                              transform: [
                                { translateY: particleRiseSecondary },
                                { translateX: particleDriftLeft },
                                { scale: particleScale },
                              ],
                            },
                          ]}
                        />
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.progressParticle,
                            styles.progressParticleTiny,
                            { backgroundColor: progressParticleTinyColor },
                            {
                              opacity: particleOpacity,
                              transform: [
                                { translateY: particleRisePrimary },
                                { translateX: particleDriftLeft },
                                { scale: particleScale },
                              ],
                            },
                          ]}
                        />
                      </>
                    ) : null}
                  </View>
                </View>
              </View>

              <Pressable
                onPress={handleConfirmReset}
                style={[styles.resetButton, { borderColor }]}
              >
                <Text style={[styles.resetButtonText, { color: textColor }]}>
                  Reiniciar contador desde cero
                </Text>
              </Pressable>

              <Text style={[styles.sectionHint, { color: textColor }]}>
                Cuando se completa la meta, el contador arranca otra vez con el
                sobrante automaticamente.
              </Text>
            </View>

            <Text
              style={[
                styles.sectionTitle,
                styles.feedTitle,
                { color: textColor },
              ]}
            >
              Registros de esta tanda
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: textColor }]}>
            Todavia no hay registros sumados en la tanda actual.
          </Text>
        }
        renderItem={({ item }) => {
          return (
            <View style={[styles.feedItem, { borderColor }]}>
              <View style={styles.feedItemRow}>
                <View style={styles.feedItemMain}>
                  <Text style={[styles.feedWorkerName, { color: textColor }]}>
                    {item.workerName}
                  </Text>
                  <Text style={[styles.feedMeta, { color: textColor }]}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.feedAlertBadge,
                    { backgroundColor: buttonBackgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.feedAlertBadgeText,
                      { color: buttonTextColor },
                    ]}
                  >
                    En tanda
                  </Text>
                </View>
              </View>

              <Text style={[styles.feedCumulative, { color: textColor }]}>
                {formatNumber(item.countedKg)} kg ·{" "}
                {formatNumber(item.countedArrobas)} arrobas
              </Text>
            </View>
          );
        }}
      />

      <Modal
        transparent
        visible={isTargetModalVisible}
        animationType="fade"
        onRequestClose={handleCloseTargetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor, borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Actualizar meta
            </Text>
            <Text style={[styles.modalDescription, { color: textColor }]}>
              Cambia la meta de la tanda sin borrar el sobrante ni el conteo
              actual.
            </Text>

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
              style={[styles.modalInput, { color: textColor, borderColor }]}
            />

            {targetError ? (
              <Text style={styles.targetErrorText}>{targetError}</Text>
            ) : null}

            <View style={styles.modalActionsRow}>
              <Pressable
                onPress={handleCloseTargetModal}
                disabled={isSaving}
                style={[styles.modalSecondaryButton, { borderColor }]}
              >
                <Text
                  style={[
                    styles.modalSecondaryButtonText,
                    { color: textColor },
                  ]}
                >
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void handleSaveTarget()}
                disabled={isSaving}
                style={[
                  styles.modalPrimaryButton,
                  { backgroundColor: buttonBackgroundColor },
                  isSaving && styles.disabledButton,
                ]}
              >
                <Text
                  style={[
                    styles.modalPrimaryButtonText,
                    { color: buttonTextColor },
                  ]}
                >
                  {isSaving ? "Guardando" : "Guardar meta"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  list: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 28,
  },
  backButton: {
    alignSelf: "flex-start",
    marginTop: 16,
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    backgroundColor: "rgba(123, 211, 199, 0.06)",
  },
  summaryCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCardTextBlock: {
    flex: 1,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryCardSubtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.76,
  },
  targetHeroCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(123, 211, 199, 0.08)",
  },
  targetHeroTextBlock: {
    flex: 1,
  },
  targetHeroLabel: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.76,
  },
  targetHeroValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "900",
  },
  targetHeroButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  targetHeroButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  summaryCardChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryCardChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  summaryCardStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  summaryCardStatItem: {
    flex: 1,
  },
  summaryCardStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.72,
  },
  summaryCardStatValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "900",
  },
  summaryCardStatMeta: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.8,
  },
  summaryCardFooter: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.78,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    backgroundColor: "rgba(125, 211, 199, 0.06)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  heroMetricBlock: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.74,
  },
  heroValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "800",
  },
  heroHint: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.74,
  },
  goalChip: {
    minWidth: 92,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goalChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
  },
  goalChipValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
  },
  progressTrack: {
    marginTop: 18,
    height: 18,
    borderRadius: 999,
    padding: 2,
  },
  progressTrackInner: {
    flex: 1,
    borderRadius: 999,
    overflow: "visible",
  },
  progressActive: {
    height: "100%",
    borderRadius: 999,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    width: "100%",
    overflow: "hidden",
  },
  progressJellySweep: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 44,
    borderRadius: 999,
  },
  progressJellyGlow: {
    position: "absolute",
    right: -12,
    top: -6,
    width: 28,
    height: 22,
    borderRadius: 999,
  },
  progressJellyBlob: {
    position: "absolute",
    right: -7,
    top: -2,
    width: 20,
    height: 15,
    borderRadius: 999,
  },
  progressJellyHighlight: {
    position: "absolute",
    right: 2,
    top: 1,
    width: 8,
    height: 4,
    borderRadius: 999,
  },
  progressJellyDrop: {
    position: "absolute",
    right: -1,
    top: 9,
    width: 7,
    height: 10,
    borderRadius: 999,
  },
  progressParticle: {
    position: "absolute",
    borderRadius: 999,
  },
  progressParticlePrimary: {
    right: 6,
    top: -3,
    width: 6,
    height: 6,
  },
  progressParticleSecondary: {
    right: 1,
    top: 1,
    width: 5,
    height: 5,
  },
  progressParticleTiny: {
    right: 10,
    top: 4,
    width: 3,
    height: 3,
  },
  heroFooterRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  heroFooterItem: {
    flex: 1,
  },
  heroFooterLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
  },
  heroFooterValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
  },
  heroFooterHint: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.72,
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
  resetButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  targetErrorText: {
    marginTop: 8,
    color: "#ff7b7b",
    fontSize: 13,
    fontWeight: "600",
  },
  liveCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  liveHeadline: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
  },
  liveDetail: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.78,
  },
  feedTitle: {
    marginBottom: 10,
  },
  feedItem: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  feedItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  feedItemMain: {
    flex: 1,
  },
  feedWorkerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  feedMeta: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.72,
  },
  feedCumulative: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  feedAlertBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feedAlertBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 4,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.65,
  },
});
