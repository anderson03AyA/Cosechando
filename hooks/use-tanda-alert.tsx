import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    Vibration,
    View,
} from "react-native";
import { Colors } from "../constants/theme";
import {
    consumeTandaAlert,
    resetTandaAlertProgress,
    type TandaAlertEvent,
} from "../lib/database";
import { useColorScheme } from "./use-color-scheme";

type TandaAlertContextValue = {
  activeAlert: TandaAlertEvent | null;
  refreshAlert: () => Promise<void>;
  dismissAlert: () => void;
  resetAlert: () => Promise<void>;
};

const TandaAlertContext = React.createContext<TandaAlertContextValue | null>(
  null,
);

function formatNumber(value: number) {
  return value.toFixed(2);
}

export function TandaAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const [activeAlert, setActiveAlert] = React.useState<TandaAlertEvent | null>(
    null,
  );
  const lastAlertSignatureRef = React.useRef<string | null>(null);

  const triggerAlertFeedback = React.useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Si el motor háptico no está disponible, usamos vibración nativa.
    }

    try {
      Vibration.vibrate([0, 180, 70, 220]);
    } catch {
      // Algunos dispositivos o emuladores no soportan vibración.
    }
  }, []);

  const refreshAlert = React.useCallback(async () => {
    const alertEvent = await consumeTandaAlert();

    if (alertEvent) {
      setActiveAlert(alertEvent);
    }
  }, []);

  const dismissAlert = React.useCallback(() => {
    setActiveAlert(null);
  }, []);

  const resetAlert = React.useCallback(async () => {
    await resetTandaAlertProgress();
    setActiveAlert(null);
  }, []);

  const overflowArrobas = activeAlert?.overflowArrobas ?? 0;
  const overflowKg = activeAlert?.overflowKg ?? 0;
  const reachedGoalArrobas = activeAlert?.reachedArrobas ?? 0;

  React.useEffect(() => {
    void refreshAlert();
  }, [refreshAlert]);

  React.useEffect(() => {
    if (!activeAlert) {
      lastAlertSignatureRef.current = null;
      return;
    }
  }, [activeAlert]);

  React.useEffect(() => {
    if (!activeAlert) {
      return;
    }

    const signature = [
      activeAlert.milestone,
      activeAlert.targetArrobas,
      activeAlert.totalArrobas,
      activeAlert.progressArrobas,
    ].join(":");

    if (lastAlertSignatureRef.current === signature) {
      return;
    }

    lastAlertSignatureRef.current = signature;
    void triggerAlertFeedback();
  }, [activeAlert, triggerAlertFeedback]);

  const handleOpenTandas = React.useCallback(() => {
    setActiveAlert(null);
    router.push("/tandas");
  }, []);

  const accentColor = Colors[colorScheme].tint;
  const textColor = Colors[colorScheme].text;
  const backgroundColor =
    colorScheme === "dark"
      ? "rgba(15, 20, 27, 0.98)"
      : "rgba(255, 255, 255, 0.98)";
  const borderColor = Colors[colorScheme].icon;
  const accentTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const cardAuraColor =
    colorScheme === "dark"
      ? "rgba(123, 211, 199, 0.14)"
      : "rgba(10, 126, 164, 0.08)";

  return (
    <TandaAlertContext.Provider
      value={{ activeAlert, refreshAlert, dismissAlert, resetAlert }}
    >
      {children}

      <Modal transparent visible={activeAlert !== null} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.cardAura, { backgroundColor: cardAuraColor }]} />

          <View style={[styles.card, { backgroundColor, borderColor }]}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: accentColor }]}>
                <Text style={[styles.badgeText, { color: accentTextColor }]}>
                  Meta completa
                </Text>
              </View>
            </View>

            <Text style={[styles.title, { color: textColor }]}>
              Meta alcanzada: {formatNumber(reachedGoalArrobas)} arrobas
            </Text>
            <Text style={[styles.description, { color: textColor }]}>
              {activeAlert?.workerName
                ? `${activeAlert.workerName} disparo la meta con ${formatNumber(activeAlert.triggerKg ?? 0)} kg.`
                : "La meta se completo con el ultimo registro."}{" "}
              Te sobran {formatNumber(overflowArrobas)} arrobas (
              {formatNumber(overflowKg)} kg) para el proximo conteo.
            </Text>

            <Text style={[styles.compactHint, { color: textColor }]}>
              Puedes aceptar esta alerta o cambiar la meta desde el panel de
              Tandas.
            </Text>

            <View style={styles.actionsColumn}>
              <Pressable
                onPress={dismissAlert}
                style={[styles.primaryButton, { backgroundColor: accentColor }]}
              >
                <Text
                  style={[styles.primaryButtonText, { color: accentTextColor }]}
                >
                  Aceptar
                </Text>
              </Pressable>

              <Pressable
                onPress={handleOpenTandas}
                style={[styles.secondaryButton, { borderColor }]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: textColor }]}
                >
                  Cambiar meta
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </TandaAlertContext.Provider>
  );
}

export function useTandaAlertController() {
  const context = React.useContext(TandaAlertContext);

  if (!context) {
    throw new Error(
      "useTandaAlertController must be used inside TandaAlertProvider",
    );
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.46)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardAura: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    transform: [{ scale: 1.1 }],
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  badgeRow: {
    marginBottom: 14,
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
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.82,
  },
  compactHint: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.74,
  },
  actionsColumn: {
    marginTop: 20,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
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
});
