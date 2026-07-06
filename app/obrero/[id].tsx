import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  Animated,
  AppState,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTandaAlertController } from "../../hooks/use-tanda-alert";
import { useThemeColor } from "../../hooks/use-theme-color";
import {
  addHarvest,
  deleteHarvest,
  getHarvestsByWorker,
  getWorkerById,
  getWorkersWithTotalKg,
  updateHarvest,
  type HarvestEntry,
  type Worker,
  type WorkerTotalKg,
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

export default function WorkerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        Keyboard.dismiss();
        isKeyboardVisibleRef.current = false;
      }
      if (nextAppState === "active" && Platform.OS === "android") {
        requestAnimationFrame(() => {
          Keyboard.dismiss();
          isKeyboardVisibleRef.current = false;
        });
      }
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      Keyboard.dismiss();
      if (setHarvests) setHarvests([]);
      if (setWorkerTotals) setWorkerTotals([]);
      if (setKg) setKg("");
    });

    return () => {
      subscription.remove();
      unsubscribeBlur();
    };
  }, [navigation]);

  const params = useLocalSearchParams<{ id?: string }>();
  const workerParam = params.id ?? "";
  const isTotalView = workerParam.toLocaleLowerCase("es-CO") === "total";
  const workerId = Number(workerParam);

  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const buttonBackgroundColor = Colors[colorScheme].tint;
  const buttonTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const borderColor = Colors[colorScheme].icon;
  const { refreshAlert } = useTandaAlertController();

  const [worker, setWorker] = React.useState<Worker | null>(null);
  const [kg, setKg] = React.useState("");
  const [harvests, setHarvests] = React.useState<HarvestEntry[]>([]);
  const [workerTotals, setWorkerTotals] = React.useState<WorkerTotalKg[]>([]);
  const [selectedHarvestForActions, setSelectedHarvestForActions] =
    React.useState<HarvestEntry | null>(null);
  const [editingHarvest, setEditingHarvest] =
    React.useState<HarvestEntry | null>(null);
  const [editingHarvestKg, setEditingHarvestKg] = React.useState("");
  const listRef = React.useRef<FlatList<HarvestEntry>>(null);
  const kgInputRef = React.useRef<TextInput>(null);
  const isKgInputFocusedRef = React.useRef(false);
  const reopenKgKeyboardTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const shouldScrollToEndRef = React.useRef(false);
  const isKeyboardVisibleRef = React.useRef(false);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  const toastTranslateY = React.useRef(new Animated.Value(-12)).current;
  const toastHideTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [toastMessage, setToastMessage] = React.useState("");
  const [isToastVisible, setIsToastVisible] = React.useState(false);

  const showValidationToast = React.useCallback(
    (message: string) => {
      setToastMessage(message);
      setIsToastVisible(true);

      if (toastHideTimeoutRef.current !== null) {
        clearTimeout(toastHideTimeoutRef.current);
      }

      toastOpacity.stopAnimation();
      toastTranslateY.stopAnimation();
      toastOpacity.setValue(0);
      toastTranslateY.setValue(-12);

      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      toastHideTimeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: -12,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsToastVisible(false);
        });
      }, 1900);
    },
    [toastOpacity, toastTranslateY],
  );

  React.useEffect(() => {
    return () => {
      if (reopenKgKeyboardTimeoutRef.current !== null) {
        clearTimeout(reopenKgKeyboardTimeoutRef.current);
        reopenKgKeyboardTimeoutRef.current = null;
      }

      if (toastHideTimeoutRef.current !== null) {
        clearTimeout(toastHideTimeoutRef.current);
        toastHideTimeoutRef.current = null;
      }
    };
  }, []);

  const focusKgInputAndOpenKeyboard = React.useCallback(() => {
    const input = kgInputRef.current;

    if (!input) {
      return;
    }

    if (Platform.OS === "web") {
      input.focus();
      return;
    }

    if (reopenKgKeyboardTimeoutRef.current !== null) {
      clearTimeout(reopenKgKeyboardTimeoutRef.current);
      reopenKgKeyboardTimeoutRef.current = null;
    }

    if (isKgInputFocusedRef.current || !isKeyboardVisibleRef.current) {
      input.blur();
      reopenKgKeyboardTimeoutRef.current = setTimeout(() => {
        input.focus();
        reopenKgKeyboardTimeoutRef.current = null;
      }, 40);
      return;
    }

    input.focus();
  }, []);

  const loadData = React.useCallback(async () => {
    if (isTotalView) {
      const totals = await getWorkersWithTotalKg();

      setWorker(null);
      setHarvests([]);
      setWorkerTotals(totals);
      return;
    }

    if (!Number.isFinite(workerId)) {
      return;
    }

    const [workerRow, harvestRows] = await Promise.all([
      getWorkerById(workerId),
      getHarvestsByWorker(workerId),
    ]);

    setWorker(workerRow);
    setHarvests(harvestRows);
    setWorkerTotals([]);
  }, [isTotalView, workerId]);

  React.useEffect(() => {
    loadData().catch(() => {
      setWorker(null);
      setHarvests([]);
      setWorkerTotals([]);
    });
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      Keyboard.dismiss();
      isKeyboardVisibleRef.current = false;
      void loadData();

      return () => {
        Keyboard.dismiss();
        isKeyboardVisibleRef.current = false;
      };
    }, [loadData]),
  );

  React.useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        isKeyboardVisibleRef.current = true;
      },
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        isKeyboardVisibleRef.current = false;
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const totalKg = React.useMemo(() => {
    if (isTotalView) {
      return workerTotals.reduce((sum, item) => sum + item.totalKg, 0);
    }

    return harvests.reduce((sum, item) => sum + item.kg, 0);
  }, [isTotalView, workerTotals, harvests]);
  const totalArrobas = totalKg / 12.5;

  const handleAddHarvest = async () => {
    if (isTotalView || !Number.isFinite(workerId)) {
      return;
    }

    const cleanKg = kg.trim();

    if (!cleanKg) {
      showValidationToast("Ingresa los kg para registrar.");
      focusKgInputAndOpenKeyboard();
      return;
    }

    const parsedKg = Number(cleanKg.replace(",", "."));

    if (!Number.isFinite(parsedKg) || parsedKg <= 0) {
      showValidationToast("Ingresa un numero valido mayor a 0.");
      focusKgInputAndOpenKeyboard();
      return;
    }

    shouldScrollToEndRef.current = true;
    await addHarvest(workerId, parsedKg);
    setKg("");
    await loadData();
    await refreshAlert();
  };

  const handleSubmitHarvestFromKeyboard = () => {
    if (isTotalView) {
      return;
    }

    if (Platform.OS !== "web" && !isKeyboardVisibleRef.current) {
      return;
    }

    void handleAddHarvest();
  };

  const handleOpenHarvestActions = (entry: HarvestEntry) => {
    setSelectedHarvestForActions(entry);
  };

  const handleOpenEditHarvest = (entry: HarvestEntry) => {
    setEditingHarvest(entry);
    setEditingHarvestKg(String(entry.kg));
  };

  const handleSaveEditedHarvest = async () => {
    if (!editingHarvest) {
      return;
    }

    const parsedKg = Number(editingHarvestKg.replace(",", "."));

    if (!Number.isFinite(parsedKg) || parsedKg <= 0) {
      return;
    }

    await updateHarvest(editingHarvest.id, parsedKg);
    setEditingHarvest(null);
    setEditingHarvestKg("");
    await loadData();
    await refreshAlert();
  };

  const handleCancelEditHarvest = () => {
    setEditingHarvest(null);
    setEditingHarvestKg("");
  };

  const handleStartEditFromActions = () => {
    if (!selectedHarvestForActions) {
      return;
    }

    const entry = selectedHarvestForActions;
    setSelectedHarvestForActions(null);
    handleOpenEditHarvest(entry);
  };

  const handleDeleteFromActions = () => {
    if (!selectedHarvestForActions) {
      return;
    }

    const entry = selectedHarvestForActions;
    setSelectedHarvestForActions(null);
    handleDeleteHarvest(entry);
  };

  const handleConfirmDeleteHarvest = async (harvestId: number) => {
    await deleteHarvest(harvestId);
    await loadData();
    await refreshAlert();
  };

  const handleDeleteHarvest = (entry: HarvestEntry) => {
    Alert.alert(
      "Eliminar registro",
      `¿Eliminar ${formatNumber(entry.kg)} kg?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void handleConfirmDeleteHarvest(entry.id);
          },
        },
      ],
    );
  };

  React.useEffect(() => {
    if (isTotalView || !shouldScrollToEndRef.current || harvests.length === 0) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
        shouldScrollToEndRef.current = false;
      });
    });

    return () => task.cancel();
  }, [isTotalView, harvests.length]);

  if (!isTotalView && (!Number.isFinite(workerId) || !worker)) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: textColor }]}>
            Obrero no encontrado
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: buttonBackgroundColor }]}
          >
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>
              Volver
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        enabled={Platform.OS === "ios" || Platform.OS === "android"}
      >
        {isToastVisible && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text
            style={[styles.backButtonText, { color: Colors[colorScheme].tint }]}
          >
            ← Volver
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: textColor }]}>
          {isTotalView ? "Total" : worker?.name}
        </Text>

        {!isTotalView && (
          <>
            <TextInput
              ref={kgInputRef}
              value={kg}
              onChangeText={setKg}
              onFocus={() => {
                isKgInputFocusedRef.current = true;
              }}
              onBlur={() => {
                isKgInputFocusedRef.current = false;
                isKeyboardVisibleRef.current = false;
              }}
              placeholder="Cuantos kg cosecho"
              placeholderTextColor={Colors[colorScheme].icon}
              keyboardType="decimal-pad"
              blurOnSubmit={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmitHarvestFromKeyboard}
              style={[styles.input, { color: textColor, borderColor }]}
            />

            <Pressable
              onPress={handleAddHarvest}
              style={[
                styles.button,
                { backgroundColor: buttonBackgroundColor },
              ]}
            >
              <Text style={[styles.buttonText, { color: buttonTextColor }]}>
                Registrar kg
              </Text>
            </Pressable>
          </>
        )}

        {isTotalView ? (
          <FlatList
            data={workerTotals}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: textColor }]}>
                No hay obreros para sumar.
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={[styles.item, styles.workerTotalItem, { borderColor }]}
              >
                <Text style={[styles.itemText, { color: textColor }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemValueText, { color: textColor }]}>
                  {formatNumber(item.totalKg)} kg
                </Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={harvests}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: textColor }]}>
                No hay registros de kilos.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.item, styles.harvestItem, { borderColor }]}>
                <Text style={[styles.itemText, { color: textColor }]}>
                  {formatNumber(item.kg)} kg
                </Text>

                <Text style={[styles.itemMetaText, { color: textColor }]}>
                  {formatShortDate(item.createdAt)}
                </Text>

                <Pressable
                  onPress={() => handleOpenHarvestActions(item)}
                  style={styles.moreButton}
                >
                  <Text style={[styles.moreButtonText, { color: textColor }]}>
                    ⋮
                  </Text>
                </Pressable>
              </View>
            )}
          />
        )}

        <Text style={[styles.summaryText, { color: textColor }]}>
          Total de kg: {formatNumber(totalKg)}
        </Text>
        <Text style={[styles.summaryText, { color: textColor }]}>
          Total de arrobas: {formatNumber(totalArrobas)}
        </Text>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/pago/[id]",
              params: { id: isTotalView ? "total" : String(worker?.id ?? "") },
            })
          }
          style={[
            styles.button,
            styles.payButton,
            { backgroundColor: buttonBackgroundColor },
          ]}
        >
          <Text style={[styles.buttonText, { color: buttonTextColor }]}>
            Calcular pago
          </Text>
        </Pressable>

        <Modal
          visible={selectedHarvestForActions !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedHarvestForActions(null)}
        >
          <TouchableWithoutFeedback
            onPress={() => setSelectedHarvestForActions(null)}
          >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalCard, { backgroundColor }]}>
                  <Pressable
                    style={styles.modalBackButton}
                    onPress={() => setSelectedHarvestForActions(null)}
                  >
                    <Text
                      style={[
                        styles.modalBackButtonText,
                        { color: Colors[colorScheme].tint },
                      ]}
                    >
                      ← Volver
                    </Text>
                  </Pressable>

                  <Text style={[styles.modalTitle, { color: textColor }]}>
                    {selectedHarvestForActions
                      ? `${formatNumber(selectedHarvestForActions.kg)} kg`
                      : "Registro"}
                  </Text>

                  <Pressable
                    onPress={handleStartEditFromActions}
                    style={[
                      styles.button,
                      { backgroundColor: buttonBackgroundColor },
                    ]}
                  >
                    <Text
                      style={[styles.buttonText, { color: buttonTextColor }]}
                    >
                      Editar
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteFromActions}
                    style={[styles.button, { backgroundColor: "#ff4444" }]}
                  >
                    <Text style={[styles.buttonText, { color: "#fff" }]}>
                      Eliminar
                    </Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={editingHarvest !== null}
          transparent
          animationType="fade"
          onRequestClose={handleCancelEditHarvest}
        >
          <TouchableWithoutFeedback onPress={handleCancelEditHarvest}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalCard, { backgroundColor }]}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>
                    Editar kilos
                  </Text>

                  <TextInput
                    value={editingHarvestKg}
                    onChangeText={setEditingHarvestKg}
                    placeholder="Nuevo valor en kg"
                    placeholderTextColor={Colors[colorScheme].icon}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveEditedHarvest}
                    style={[styles.input, { color: textColor, borderColor }]}
                  />

                  <Pressable
                    onPress={() => void handleSaveEditedHarvest()}
                    style={[
                      styles.button,
                      { backgroundColor: buttonBackgroundColor },
                    ]}
                  >
                    <Text
                      style={[styles.buttonText, { color: buttonTextColor }]}
                    >
                      Guardar
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCancelEditHarvest}
                    style={[
                      styles.button,
                      styles.modalCancelButton,
                      { borderColor },
                    ]}
                  >
                    <Text style={[styles.buttonText, { color: textColor }]}>
                      Cancelar
                    </Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 26,
    paddingBottom: 22,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 34,
    left: 20,
    right: 20,
    zIndex: 20,
    backgroundColor: "#1f2937",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 6,
    marginBottom: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  payButton: {
    marginTop: 10,
    marginBottom: 10,
    paddingBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  harvestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingRight: 2,
  },
  moreButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -6,
  },
  moreButtonText: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 20,
  },
  workerTotalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemValueText: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemMetaText: {
    fontSize: 12,
    opacity: 0.72,
    marginLeft: "auto",
    marginRight: 8,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalBackButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  modalBackButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalCancelButton: {
    marginTop: 10,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
});
