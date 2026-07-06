import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import "react-native-reanimated";
import { Colors } from "../constants/theme";
import {
    ColorSchemeContext,
    useSystemColorScheme,
    type AppColorScheme,
} from "../hooks/use-color-scheme";
import { TandaAlertProvider } from "../hooks/use-tanda-alert";
import { getAppUpdatePrompt, type AppUpdatePrompt } from "../lib/app-update";
import { initializeMobileAds } from "../lib/mobile-ads";

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorScheme] =
    useState<AppColorScheme>(systemColorScheme);
  const [updatePrompt, setUpdatePrompt] =
    React.useState<AppUpdatePrompt | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = React.useState(true);

  const toggleColorScheme = () => {
    setColorScheme((prev: AppColorScheme) =>
      prev === "dark" ? "light" : "dark",
    );
  };

  React.useEffect(() => {
    setColorScheme(systemColorScheme);
  }, [systemColorScheme]);

  React.useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    // Expo Go no incluye el modulo nativo de AdMob.
    if (Constants.executionEnvironment === "storeClient") {
      return;
    }

    void initializeMobileAds().catch(() => {
      // Modulo nativo no disponible.
    });
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    void getAppUpdatePrompt()
      .then((prompt) => {
        if (isMounted) {
          setUpdatePrompt(prompt);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUpdatePrompt(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingUpdate(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenUpdateUrl = React.useCallback(() => {
    if (!updatePrompt?.updateUrl) {
      return;
    }

    void Linking.openURL(updatePrompt.updateUrl);
  }, [updatePrompt?.updateUrl]);

  const handleDismissUpdatePrompt = React.useCallback(() => {
    if (updatePrompt?.isRequired) {
      return;
    }

    setUpdatePrompt(null);
  }, [updatePrompt?.isRequired]);

  const navigationTheme = React.useMemo(() => {
    if (colorScheme === "dark") {
      return {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: Colors.dark.tint,
          background: Colors.dark.background,
          card: Colors.dark.background,
          text: Colors.dark.text,
          border: "rgba(123, 211, 199, 0.14)",
        },
      };
    }

    return {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: Colors.light.tint,
        background: Colors.light.background,
        card: Colors.light.background,
        text: Colors.light.text,
        border: "rgba(10, 126, 164, 0.12)",
      },
    };
  }, [colorScheme]);

  const appBackgroundColor = Colors[colorScheme].background;

  return (
    <ColorSchemeContext.Provider
      value={{ colorScheme, setColorScheme, toggleColorScheme }}
    >
      <TandaAlertProvider>
        <ThemeProvider value={navigationTheme}>
          <View style={{ flex: 1, backgroundColor: appBackgroundColor }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: appBackgroundColor },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="tandas/alerta" />
              <Stack.Screen name="tandas/index" />
              <Stack.Screen name="cosechas/index" />
              <Stack.Screen name="cosechas/[id]" />
              <Stack.Screen name="obrero/[id]" />
              <Stack.Screen name="pago/[id]" />
            </Stack>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

            <Modal
              transparent
              visible={!isCheckingUpdate && updatePrompt !== null}
              animationType="fade"
              onRequestClose={handleDismissUpdatePrompt}
            >
              <View style={styles.overlay}>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor:
                        colorScheme === "dark" ? "#11161f" : "#ffffff",
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(123,211,199,0.22)"
                          : "rgba(10,126,164,0.16)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.title,
                      {
                        color: colorScheme === "dark" ? "#F2F5F7" : "#11181C",
                      },
                    ]}
                  >
                    {updatePrompt?.title}
                  </Text>

                  <Text
                    style={[
                      styles.message,
                      {
                        color: colorScheme === "dark" ? "#D7E0E7" : "#334155",
                      },
                    ]}
                  >
                    {updatePrompt?.message}
                  </Text>

                  <Text
                    style={[
                      styles.version,
                      {
                        color: colorScheme === "dark" ? "#9FB0BF" : "#64748B",
                      },
                    ]}
                  >
                    Version objetivo: {updatePrompt?.targetVersion}
                  </Text>

                  <Pressable
                    onPress={handleOpenUpdateUrl}
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor:
                          colorScheme === "dark" ? "#7BD3C7" : "#0a7ea4",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,
                        {
                          color: colorScheme === "dark" ? "#151718" : "#fff",
                        },
                      ]}
                    >
                      Actualizar ahora
                    </Text>
                  </Pressable>

                  {updatePrompt?.isRequired ? (
                    <View style={styles.requiredRow}>
                      <ActivityIndicator
                        size="small"
                        color={colorScheme === "dark" ? "#7BD3C7" : "#0a7ea4"}
                      />
                      <Text
                        style={[
                          styles.requiredText,
                          {
                            color:
                              colorScheme === "dark" ? "#D7E0E7" : "#475569",
                          },
                        ]}
                      >
                        Esta actualizacion es obligatoria.
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleDismissUpdatePrompt}
                      style={styles.secondaryButton}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          {
                            color:
                              colorScheme === "dark" ? "#D7E0E7" : "#334155",
                          },
                        ]}
                      >
                        Mas tarde
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        </ThemeProvider>
      </TandaAlertProvider>
    </ColorSchemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  version: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  requiredRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requiredText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
