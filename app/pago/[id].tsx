import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
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
import { useThemeColor } from "../../hooks/use-theme-color";
import {
    getOverallTotalKg,
    getPricePerArroba,
    getWorkerById,
    getWorkerTotalKg,
    setPricePerArroba,
    type Worker,
} from "../../lib/database";

function formatNumber(value: number) {
  return value.toFixed(2);
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export default function PagoScreen() {
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
  const insets = useSafeAreaInsets();

  const [worker, setWorker] = React.useState<Worker | null>(null);
  const [totalKg, setTotalKg] = React.useState(0);
  const [pricePerArroba, setPricePerArrobaState] = React.useState(9000);
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [newPrice, setNewPrice] = React.useState("");

  const loadData = React.useCallback(async () => {
    if (isTotalView) {
      const [kgTotal, price] = await Promise.all([
        getOverallTotalKg(),
        getPricePerArroba(),
      ]);

      setWorker(null);
      setTotalKg(kgTotal);
      setPricePerArrobaState(price);
      return;
    }

    if (!Number.isFinite(workerId)) {
      return;
    }

    const [workerRow, kgTotal, price] = await Promise.all([
      getWorkerById(workerId),
      getWorkerTotalKg(workerId),
      getPricePerArroba(),
    ]);

    setWorker(workerRow);
    setTotalKg(kgTotal);
    setPricePerArrobaState(price);
  }, [isTotalView, workerId]);

  React.useEffect(() => {
    loadData().catch(() => {
      setWorker(null);
      setTotalKg(0);
      setPricePerArrobaState(9000);
    });
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const totalArrobas = totalKg / 12.5;
  const totalToPay = totalArrobas * pricePerArroba;

  const handleOpenModal = () => {
    setNewPrice(String(pricePerArroba));
    setIsModalVisible(true);
  };

  const handleSavePrice = async () => {
    const parsed = Number(newPrice.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    await setPricePerArroba(parsed);
    setPricePerArrobaState(parsed);
    setIsModalVisible(false);
  };

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
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={Platform.OS === "web"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom + 24, 32) },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text
              style={[
                styles.backButtonText,
                { color: Colors[colorScheme].tint },
              ]}
            >
              ← Volver
            </Text>
          </Pressable>

          <Text style={[styles.title, { color: textColor }]}>
            {isTotalView ? "Total general" : worker?.name}
          </Text>

          <Text style={[styles.label, { color: textColor }]}>
            Precio de la arroba
          </Text>
          <Text style={[styles.value, { color: textColor }]}>
            {formatMoney(pricePerArroba)}
          </Text>

          <Pressable
            onPress={handleOpenModal}
            style={[
              styles.button,
              {
                backgroundColor: buttonBackgroundColor,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>
              Cambiar precio
            </Text>
          </Pressable>

          <View style={styles.summaryBlock}>
            <Text style={[styles.label, { color: textColor }]}>
              Total de arrobas
            </Text>
            <Text style={[styles.value, { color: textColor }]}>
              {formatNumber(totalArrobas)}
            </Text>

            <Text style={[styles.label, { color: textColor }]}>
              Total a pagar
            </Text>
            <Text style={[styles.value, { color: textColor }]}>
              {formatMoney(totalToPay)}
            </Text>
          </View>

          <Modal
            visible={isModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.modalCard, { backgroundColor }]}>
                    <Text style={[styles.modalTitle, { color: textColor }]}>
                      Nuevo precio por arroba
                    </Text>

                    <TextInput
                      value={newPrice}
                      onChangeText={setNewPrice}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleSavePrice}
                      placeholder="Escribe el nuevo precio"
                      placeholderTextColor={Colors[colorScheme].icon}
                      style={[styles.input, { color: textColor, borderColor }]}
                    />

                    <Pressable
                      onPress={handleSavePrice}
                      style={[
                        styles.button,
                        styles.modalButton,
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
                      onPress={() => setIsModalVisible(false)}
                      style={[
                        styles.button,
                        styles.modalButton,
                        { backgroundColor: buttonBackgroundColor },
                      ]}
                    >
                      <Text
                        style={[styles.buttonText, { color: buttonTextColor }]}
                      >
                        Cancelar
                      </Text>
                    </Pressable>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 14,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  summaryBlock: {
    marginTop: 16,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14, // Tus 14px originales por defecto
    alignItems: "center",
    marginTop: 16,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
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
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalButton: {
    marginTop: 10,
  },
});
