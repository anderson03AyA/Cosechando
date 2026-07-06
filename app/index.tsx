import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
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
    ToastAndroid,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { AdBanner, ThemeToggle, type Ad } from "../components/ui";
import { Colors } from "../constants/theme";
import {
    useColorScheme,
    useColorSchemeController,
} from "../hooks/use-color-scheme";
import { useThemeColor } from "../hooks/use-theme-color";
import {
    addWorker,
    clearCurrentHarvest,
    deleteWorker,
    getCurrentHarvestLabel,
    getOverallTotalKg,
    getPricePerArroba,
    getWorkersWithTotalKg,
    saveCurrentHarvest,
    savedHarvestNameExists,
    updateWorker,
    type WorkerTotalKg,
} from "../lib/database";

function normalizeWorkerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-CO");
}

function formatNumber(value: number) {
  return value.toFixed(2);
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

const RESERVED_WORKER_NAMES = new Set(["total"]);
export default function IndexScreen() {
  const { toggleColorScheme } = useColorSchemeController();
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const buttonBackgroundColor = Colors[colorScheme].tint;
  const buttonTextColor = colorScheme === "dark" ? "#151718" : "#fff";
  const borderColor = Colors[colorScheme].icon;

  const [name, setName] = React.useState("");
  const [workers, setWorkers] = React.useState<WorkerTotalKg[]>([]);
  const [overallTotalKg, setOverallTotalKg] = React.useState(0);
  const [pricePerArroba, setPricePerArroba] = React.useState(9000);
  const [currentHarvestLabel, setCurrentHarvestLabel] = React.useState<
    string | null
  >(null);
  const [selectedWorker, setSelectedWorker] =
    React.useState<WorkerTotalKg | null>(null);
  const [editingWorkerName, setEditingWorkerName] = React.useState("");
  const [isEditingWorkerName, setIsEditingWorkerName] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [isQuickMenuVisible, setIsQuickMenuVisible] = React.useState(false);
  const [isNewHarvestMenuVisible, setIsNewHarvestMenuVisible] =
    React.useState(false);
  const [isSaveHarvestVisible, setIsSaveHarvestVisible] = React.useState(false);
  const [isDiscardHarvestVisible, setIsDiscardHarvestVisible] =
    React.useState(false);
  const [newHarvestName, setNewHarvestName] = React.useState("");
  const [isHarvestActionLoading, setIsHarvestActionLoading] =
    React.useState(false);
  const [isNavigatingToWorker, setIsNavigatingToWorker] = React.useState(false);
  const listRef = React.useRef<FlatList<WorkerTotalKg>>(null);
  const shouldScrollToEndRef = React.useRef(false);
  const isKeyboardVisibleRef = React.useRef(false);
  const isNameInputFocusedRef = React.useRef(false);
  const nameInputRef = React.useRef<TextInput>(null);
  const reopenNameKeyboardTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const keyboardDismissTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const navigationReleaseTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isNavigatingToWorkerRef = React.useRef(false);
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
      if (reopenNameKeyboardTimeoutRef.current !== null) {
        clearTimeout(reopenNameKeyboardTimeoutRef.current);
        reopenNameKeyboardTimeoutRef.current = null;
      }

      if (toastHideTimeoutRef.current !== null) {
        clearTimeout(toastHideTimeoutRef.current);
        toastHideTimeoutRef.current = null;
      }
    };
  }, []);

  const focusNameInputAndOpenKeyboard = React.useCallback(() => {
    const input = nameInputRef.current;

    if (!input) {
      return;
    }

    if (Platform.OS === "web") {
      input.focus();
      return;
    }

    if (reopenNameKeyboardTimeoutRef.current !== null) {
      clearTimeout(reopenNameKeyboardTimeoutRef.current);
      reopenNameKeyboardTimeoutRef.current = null;
    }

    input.blur();
    reopenNameKeyboardTimeoutRef.current = setTimeout(() => {
      input.focus();
      reopenNameKeyboardTimeoutRef.current = null;
    }, 40);
  }, []);

  const showDuplicateWorkerToast = React.useCallback(() => {
    const message = "El obrero ya esta creado, intente con otro nombre.";

    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }

    Alert.alert("Obrero existente", message);
  }, []);

  const showReservedWorkerNameToast = React.useCallback(() => {
    const message =
      "No se puede usar el nombre 'total' porque calcula automáticamente el total de kilos cosechados. Por favor, elige otro nombre.";

    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }

    Alert.alert("Nombre no permitido", message);
  }, []);

  const loadWorkers = React.useCallback(async () => {
    const [rows, totalKg, harvestLabel, currentPricePerArroba] =
      await Promise.all([
        getWorkersWithTotalKg(),
        getOverallTotalKg(),
        getCurrentHarvestLabel(),
        getPricePerArroba(),
      ]);

    setWorkers(rows);
    setOverallTotalKg(totalKg);
    setCurrentHarvestLabel(harvestLabel);
    setPricePerArroba(currentPricePerArroba);
  }, []);

  const overallTotalArrobas = overallTotalKg / 12.5;
  const overallTotalToPay = overallTotalArrobas * pricePerArroba;

  React.useEffect(() => {
    loadWorkers().catch(() => {
      setWorkers([]);
      setOverallTotalKg(0);
      setCurrentHarvestLabel(null);
    });
  }, [loadWorkers]);

  useFocusEffect(
    React.useCallback(() => {
      if (navigationReleaseTimeoutRef.current !== null) {
        clearTimeout(navigationReleaseTimeoutRef.current);
        navigationReleaseTimeoutRef.current = null;
      }

      isNavigatingToWorkerRef.current = false;
      setIsNavigatingToWorker(false);
      void loadWorkers();

      return () => {
        if (keyboardDismissTimeoutRef.current !== null) {
          clearTimeout(keyboardDismissTimeoutRef.current);
          keyboardDismissTimeoutRef.current = null;
        }

        if (navigationReleaseTimeoutRef.current !== null) {
          clearTimeout(navigationReleaseTimeoutRef.current);
          navigationReleaseTimeoutRef.current = null;
        }

        Keyboard.dismiss();
        isKeyboardVisibleRef.current = false;
        isNameInputFocusedRef.current = false;
        isNavigatingToWorkerRef.current = false;
      };
    }, [loadWorkers]),
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

  const handleAddWorker = async () => {
    const cleanName = name.trim();

    if (!cleanName) {
      showValidationToast("Escribe el nombre del cosechero.");
      focusNameInputAndOpenKeyboard();
      return;
    }

    const normalizedWorkerName = normalizeWorkerName(cleanName);

    if (RESERVED_WORKER_NAMES.has(normalizedWorkerName)) {
      showReservedWorkerNameToast();
      return;
    }

    const workerAlreadyExists = workers.some(
      (worker) => normalizeWorkerName(worker.name) === normalizedWorkerName,
    );

    if (workerAlreadyExists) {
      showDuplicateWorkerToast();
      return;
    }

    shouldScrollToEndRef.current = true;
    await addWorker(cleanName);
    setName("");
    await loadWorkers();
  };

  const navigateToWorkerScreen = React.useCallback((workerId: string) => {
    if (isNavigatingToWorkerRef.current) {
      return;
    }

    isNavigatingToWorkerRef.current = true;
    setIsNavigatingToWorker(true);

    const scheduleNavigationRelease = () => {
      if (navigationReleaseTimeoutRef.current !== null) {
        clearTimeout(navigationReleaseTimeoutRef.current);
      }

      navigationReleaseTimeoutRef.current = setTimeout(() => {
        navigationReleaseTimeoutRef.current = null;
        isNavigatingToWorkerRef.current = false;
        setIsNavigatingToWorker(false);
      }, 1000);
    };

    const openWorkerScreen = () => {
      if (keyboardDismissTimeoutRef.current !== null) {
        clearTimeout(keyboardDismissTimeoutRef.current);
        keyboardDismissTimeoutRef.current = null;
      }

      scheduleNavigationRelease();

      router.push({
        pathname: "/obrero/[id]",
        params: { id: workerId },
      });
    };

    if (Platform.OS === "web") {
      openWorkerScreen();
      return;
    }

    if (!isKeyboardVisibleRef.current) {
      openWorkerScreen();
      return;
    }

    if (keyboardDismissTimeoutRef.current !== null) {
      clearTimeout(keyboardDismissTimeoutRef.current);
      keyboardDismissTimeoutRef.current = null;
    }

    isNameInputFocusedRef.current = false;
    const keyboardHideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    let didHandleDismiss = false;

    const handleKeyboardDismissed = () => {
      if (didHandleDismiss) {
        return;
      }

      didHandleDismiss = true;
      hideSubscription.remove();

      if (keyboardDismissTimeoutRef.current !== null) {
        clearTimeout(keyboardDismissTimeoutRef.current);
        keyboardDismissTimeoutRef.current = null;
      }

      InteractionManager.runAfterInteractions(openWorkerScreen);
    };

    const hideSubscription = Keyboard.addListener(
      keyboardHideEvent,
      handleKeyboardDismissed,
    );

    keyboardDismissTimeoutRef.current = setTimeout(() => {
      handleKeyboardDismissed();
    }, 300);

    Keyboard.dismiss();
    isKeyboardVisibleRef.current = false;
  }, []);

  const handleSubmitWorkerFromKeyboard = () => {
    const canSubmitFromKeyboard =
      Platform.OS === "web"
        ? isNameInputFocusedRef.current
        : isNameInputFocusedRef.current && isKeyboardVisibleRef.current;

    if (!canSubmitFromKeyboard) {
      return;
    }

    void handleAddWorker();
  };

  const handleUpdateWorkerName = async () => {
    if (!selectedWorker) return;

    const cleanNewName = editingWorkerName.trim();

    if (!cleanNewName) {
      return;
    }

    const normalizedNewName = normalizeWorkerName(cleanNewName);
    const normalizedCurrentName = normalizeWorkerName(selectedWorker.name);

    if (normalizedNewName === normalizedCurrentName) {
      setIsEditingWorkerName(false);
      setEditingWorkerName("");
      return;
    }

    if (RESERVED_WORKER_NAMES.has(normalizedNewName)) {
      showReservedWorkerNameToast();
      return;
    }

    const workerWithNameExists = workers.some(
      (worker) =>
        worker.id !== selectedWorker.id &&
        normalizeWorkerName(worker.name) === normalizedNewName,
    );

    if (workerWithNameExists) {
      showDuplicateWorkerToast();
      return;
    }

    await updateWorker(selectedWorker.id, cleanNewName);
    setIsEditingWorkerName(false);
    setEditingWorkerName("");
    setSelectedWorker(null);
    await loadWorkers();
  };

  const handleDeleteWorker = () => {
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedWorker) return;

    await deleteWorker(selectedWorker.id);
    setIsConfirmingDelete(false);
    setSelectedWorker(null);
    await loadWorkers();
  };

  const handleAdPress = (ad: Ad) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(`Anuncio: ${ad.title}`, ToastAndroid.SHORT);
    } else {
      Alert.alert(ad.title, ad.description);
    }
  };

  const closeHarvestModals = React.useCallback(() => {
    setIsNewHarvestMenuVisible(false);
    setIsSaveHarvestVisible(false);
    setIsDiscardHarvestVisible(false);
    setNewHarvestName("");
  }, []);

  const handleOpenNewHarvestMenu = React.useCallback(() => {
    setIsQuickMenuVisible(false);
    Keyboard.dismiss();
    setIsNewHarvestMenuVisible(true);
  }, []);

  const handleOpenSavedHarvests = React.useCallback(() => {
    setIsQuickMenuVisible(false);
    router.push("/cosechas");
  }, []);

  const handleOpenTandas = React.useCallback(() => {
    setIsQuickMenuVisible(false);
    router.push("/tandas");
  }, []);

  const handleConfirmSaveHarvest = React.useCallback(async () => {
    const trimmedName = newHarvestName.trim();

    if (!trimmedName) {
      showValidationToast("Escribe un nombre para la cosecha.");
      return;
    }

    if (workers.length === 0) {
      showValidationToast("No hay datos para guardar en esta cosecha.");
      return;
    }

    const exists = await savedHarvestNameExists(trimmedName);

    if (exists) {
      showValidationToast("Ya existe una cosecha guardada con ese nombre.");
      return;
    }

    setIsHarvestActionLoading(true);

    try {
      await saveCurrentHarvest(trimmedName);
      await clearCurrentHarvest();
      closeHarvestModals();
      await loadWorkers();
    } finally {
      setIsHarvestActionLoading(false);
    }
  }, [
    closeHarvestModals,
    loadWorkers,
    newHarvestName,
    workers.length,
    showValidationToast,
  ]);

  const handleConfirmDiscardHarvest = React.useCallback(async () => {
    setIsHarvestActionLoading(true);

    try {
      await clearCurrentHarvest();
      closeHarvestModals();
      await loadWorkers();
    } finally {
      setIsHarvestActionLoading(false);
    }
  }, [closeHarvestModals, loadWorkers]);

  React.useEffect(() => {
    if (!shouldScrollToEndRef.current || workers.length === 0) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
        shouldScrollToEndRef.current = false;
      });
    });

    return () => task.cancel();
  }, [workers.length]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "web" ? undefined : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 12}
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

      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: textColor }]}>Obreros</Text>
          {currentHarvestLabel ? (
            <Text style={[styles.subtitle, { color: textColor }]}>
              Cosecha abierta: {currentHarvestLabel}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => setIsQuickMenuVisible(true)}
          style={[
            styles.menuButton,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(27, 34, 46, 0.92)"
                  : "rgba(255, 255, 255, 0.92)",
              borderColor,
            },
          ]}
        >
          <Text style={[styles.menuButtonText, { color: textColor }]}>
            Menu
          </Text>
        </Pressable>
      </View>

      <AdBanner onAdPress={handleAdPress} />

      <TextInput
        ref={nameInputRef}
        placeholder="Nombre del cosechero"
        placeholderTextColor={Colors[colorScheme].icon}
        style={[styles.input, { color: textColor, borderColor }]}
        value={name}
        onChangeText={(value) => setName(value.replace(/^\s+/, ""))}
        onFocus={() => {
          isNameInputFocusedRef.current = true;
        }}
        onBlur={() => {
          isNameInputFocusedRef.current = false;
          isKeyboardVisibleRef.current = false;
        }}
        blurOnSubmit={false}
        submitBehavior="submit"
        returnKeyType="done"
        onSubmitEditing={handleSubmitWorkerFromKeyboard}
      />

      <Pressable
        onPress={handleAddWorker}
        style={[
          styles.button,
          styles.addButton,
          { backgroundColor: buttonBackgroundColor },
        ]}
      >
        <Text style={[styles.buttonText, { color: buttonTextColor }]}>
          Agregar cosechero
        </Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={workers}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={[styles.totalSummary, { borderColor }]}>
            <Text style={[styles.totalSummaryTitle, { color: textColor }]}>
              Total
            </Text>
            <Text style={[styles.totalSummaryValue, { color: textColor }]}>
              {formatNumber(overallTotalKg)} kg ·{" "}
              {formatNumber(overallTotalArrobas)} arrobas
            </Text>
            <Text style={[styles.totalSummaryMeta, { color: textColor }]}>
              Debe pagar: {formatMoney(overallTotalToPay)}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: textColor }]}>
            No hay cosecheros.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.item, styles.workerItem, { borderColor }]}>
            <Pressable
              onPress={() => navigateToWorkerScreen(String(item.id))}
              style={styles.workerMainButton}
            >
              <Text style={[styles.itemText, { color: textColor }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemMetaText, { color: textColor }]}>
                {formatNumber(item.totalKg)} kg ·{" "}
                {formatNumber(item.totalKg / 12.5)} arrobas
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsEditingWorkerName(false);
                setEditingWorkerName("");
                setSelectedWorker(item);
              }}
              style={styles.moreButton}
            >
              <Text style={[styles.moreButtonText, { color: textColor }]}>
                ⋮
              </Text>
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={isConfirmingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmingDelete(false)}
      >
        {selectedWorker !== null && (
          <TouchableWithoutFeedback
            onPress={() => setIsConfirmingDelete(false)}
          >
            <View style={styles.overlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalBox, { backgroundColor }]}>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: "#ff4444", fontSize: 24, fontWeight: "900" },
                    ]}
                  >
                    ⚠️ Advertencia
                  </Text>
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color: textColor,
                        fontSize: 18,
                        marginTop: 12,
                        marginBottom: 16,
                      },
                    ]}
                  >
                    ¿Eliminar a {selectedWorker.name}?
                  </Text>
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: textColor,
                        marginBottom: 20,
                        textAlign: "center",
                      },
                    ]}
                  >
                    Esta acción no se puede deshacer. También se eliminarán
                    todos sus registros de cosecha.
                  </Text>
                  <Pressable
                    style={[
                      styles.modalOption,
                      { backgroundColor: buttonBackgroundColor },
                    ]}
                    onPress={() => setIsConfirmingDelete(false)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: buttonTextColor },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalOption, { backgroundColor: "#ff4444" }]}
                    onPress={() => void handleConfirmDelete()}
                  >
                    <Text style={[styles.modalOptionText, { color: "#fff" }]}>
                      Sí, eliminar
                    </Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      <Modal
        visible={isQuickMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuickMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsQuickMenuVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalBox,
                  styles.quickMenuBox,
                  { backgroundColor },
                ]}
              >
                <View style={styles.quickMenuHeader}>
                  <View style={styles.quickMenuTitleBlock}>
                    <Text
                      style={[
                        styles.modalTitle,
                        styles.quickMenuTitle,
                        { color: textColor },
                      ]}
                    >
                      Menu
                    </Text>
                    <Text
                      style={[styles.quickMenuSubtitle, { color: borderColor }]}
                    >
                      Accesos rapidos
                    </Text>
                  </View>

                  <ThemeToggle
                    value={colorScheme}
                    onToggle={toggleColorScheme}
                    variant="icon"
                  />
                </View>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.quickMenuOption,
                    { backgroundColor: buttonBackgroundColor },
                  ]}
                  onPress={handleOpenNewHarvestMenu}
                >
                  <Text
                    style={[styles.modalOptionText, { color: buttonTextColor }]}
                  >
                    Iniciar nueva cosecha
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.quickMenuOption,
                    { backgroundColor: buttonBackgroundColor },
                  ]}
                  onPress={handleOpenTandas}
                >
                  <Text
                    style={[styles.modalOptionText, { color: buttonTextColor }]}
                  >
                    Cambiar limite de tandas
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.quickMenuOption,
                    { backgroundColor: buttonBackgroundColor },
                  ]}
                  onPress={handleOpenSavedHarvests}
                >
                  <Text
                    style={[styles.modalOptionText, { color: buttonTextColor }]}
                  >
                    Cosechas guardadas
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={selectedWorker !== null && !isConfirmingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWorker(null)}
      >
        {selectedWorker !== null && (
          <TouchableWithoutFeedback onPress={() => setSelectedWorker(null)}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalBox, { backgroundColor }]}>
                  {isEditingWorkerName ? (
                    <>
                      <Pressable
                        style={styles.modalBackButton}
                        onPress={() => {
                          setIsEditingWorkerName(false);
                          setEditingWorkerName("");
                        }}
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

                      <TextInput
                        value={editingWorkerName}
                        onChangeText={(value) =>
                          setEditingWorkerName(value.replace(/^\s+/, ""))
                        }
                        placeholder="Nuevo nombre"
                        placeholderTextColor={Colors[colorScheme].icon}
                        style={[
                          styles.input,
                          { color: textColor, borderColor },
                        ]}
                        autoFocus
                      />
                      <Pressable
                        style={[
                          styles.modalOption,
                          { backgroundColor: buttonBackgroundColor },
                        ]}
                        onPress={() => void handleUpdateWorkerName()}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            { color: buttonTextColor },
                          ]}
                        >
                          Guardar
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        style={styles.modalBackButton}
                        onPress={() => setSelectedWorker(null)}
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
                        {selectedWorker.name}
                      </Text>

                      <Pressable
                        style={[
                          styles.modalOption,
                          { backgroundColor: buttonBackgroundColor },
                        ]}
                        onPress={() => {
                          router.push({
                            pathname: "/pago/[id]",
                            params: { id: String(selectedWorker.id) },
                          });
                          setSelectedWorker(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            { color: buttonTextColor },
                          ]}
                        >
                          Calcular pago
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.modalOption,
                          { backgroundColor: buttonBackgroundColor },
                        ]}
                        onPress={() => {
                          setIsEditingWorkerName(true);
                          setEditingWorkerName(selectedWorker.name);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            { color: buttonTextColor },
                          ]}
                        >
                          Editar nombre
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.modalOption,
                          { backgroundColor: "#ff4444" },
                        ]}
                        onPress={() => void handleDeleteWorker()}
                      >
                        <Text
                          style={[styles.modalOptionText, { color: "#fff" }]}
                        >
                          Eliminar
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      <Modal
        visible={isNewHarvestMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeHarvestModals}
      >
        <TouchableWithoutFeedback onPress={closeHarvestModals}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalBox, { backgroundColor }]}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Iniciar nueva cosecha
                </Text>

                <Text style={[styles.modalDescription, { color: textColor }]}>
                  Elige si quieres guardar la cosecha actual antes de limpiar la
                  pantalla principal.
                </Text>

                <Pressable
                  style={[
                    styles.modalOption,
                    { backgroundColor: buttonBackgroundColor },
                  ]}
                  onPress={() => {
                    setIsNewHarvestMenuVisible(false);
                    setIsSaveHarvestVisible(true);
                  }}
                >
                  <Text
                    style={[styles.modalOptionText, { color: buttonTextColor }]}
                  >
                    Guardar datos
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.secondaryModalOption,
                    { borderColor },
                  ]}
                  onPress={() => {
                    setIsNewHarvestMenuVisible(false);
                    setIsDiscardHarvestVisible(true);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: textColor }]}>
                    No guardar
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.secondaryModalOption,
                    { borderColor },
                  ]}
                  onPress={closeHarvestModals}
                >
                  <Text style={[styles.modalOptionText, { color: textColor }]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isSaveHarvestVisible}
        transparent
        animationType="fade"
        onRequestClose={closeHarvestModals}
      >
        <TouchableWithoutFeedback onPress={closeHarvestModals}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalBox, { backgroundColor }]}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Guardar cosecha
                </Text>

                <Text style={[styles.modalDescription, { color: textColor }]}>
                  Asigna un nombre para guardar esta cosecha y luego dejar la
                  pantalla principal vacia.
                </Text>

                <TextInput
                  value={newHarvestName}
                  onChangeText={(value) =>
                    setNewHarvestName(value.replace(/^\s+/, ""))
                  }
                  placeholder="Nombre de la cosecha"
                  placeholderTextColor={Colors[colorScheme].icon}
                  style={[styles.input, { color: textColor, borderColor }]}
                  editable={!isHarvestActionLoading}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => void handleConfirmSaveHarvest()}
                />

                <Pressable
                  style={[
                    styles.modalOption,
                    { backgroundColor: buttonBackgroundColor },
                    isHarvestActionLoading && styles.disabledButton,
                  ]}
                  onPress={() => void handleConfirmSaveHarvest()}
                  disabled={isHarvestActionLoading}
                >
                  <Text
                    style={[styles.modalOptionText, { color: buttonTextColor }]}
                  >
                    {isHarvestActionLoading ? "Guardando..." : "Guardar"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.secondaryModalOption,
                    { borderColor },
                  ]}
                  onPress={closeHarvestModals}
                  disabled={isHarvestActionLoading}
                >
                  <Text style={[styles.modalOptionText, { color: textColor }]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isDiscardHarvestVisible}
        transparent
        animationType="fade"
        onRequestClose={closeHarvestModals}
      >
        <TouchableWithoutFeedback onPress={closeHarvestModals}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalBox, { backgroundColor }]}>
                <Text style={[styles.modalTitle, { color: "#ff4444" }]}>
                  Advertencia
                </Text>

                <Text style={[styles.modalDescription, { color: textColor }]}>
                  Se van a perder todos los datos de la cosecha actual y la
                  pantalla principal quedara sin obreros.
                </Text>

                <Pressable
                  style={[
                    styles.modalOption,
                    { backgroundColor: "#ff4444" },
                    isHarvestActionLoading && styles.disabledButton,
                  ]}
                  onPress={() => void handleConfirmDiscardHarvest()}
                  disabled={isHarvestActionLoading}
                >
                  <Text style={[styles.modalOptionText, { color: "#fff" }]}>
                    {isHarvestActionLoading ? "Borrando..." : "Borrar todo"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.secondaryModalOption,
                    { borderColor },
                  ]}
                  onPress={closeHarvestModals}
                  disabled={isHarvestActionLoading}
                >
                  <Text style={[styles.modalOptionText, { color: textColor }]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {isNavigatingToWorker && (
        <View style={styles.navigationOverlay} pointerEvents="auto">
          <View
            style={[
              styles.navigationOverlayCard,
              { backgroundColor, borderColor },
            ]}
          >
            <ActivityIndicator color={buttonBackgroundColor} size="small" />
            <Text style={[styles.navigationOverlayText, { color: textColor }]}>
              Abriendo registro...
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  button: {
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButton: {
    marginTop: 12,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.72,
  },
  titleRow: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuButton: {
    minWidth: 82,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  menuButtonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  totalSummary: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  totalSummaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.72,
  },
  totalSummaryValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "700",
  },
  totalSummaryMeta: {
    marginTop: 2,
    fontSize: 13,
    opacity: 0.72,
  },
  workerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 2,
  },
  workerMainButton: {
    flex: 1,
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
  itemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemMetaText: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.72,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  quickMenuBox: {
    width: "82%",
    maxWidth: 332,
    padding: 18,
    gap: 10,
  },
  quickMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  quickMenuTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  quickMenuTitle: {
    marginBottom: 0,
    textAlign: "left",
    fontSize: 18,
  },
  quickMenuSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  quickMenuOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalBackButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  modalBackButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 4,
  },
  modalOption: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryModalOption: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  navigationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 20,
  },
  navigationOverlayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  navigationOverlayText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
