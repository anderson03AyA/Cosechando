import {
    createContext,
    useContext,
    type Dispatch,
    type SetStateAction,
} from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

export type AppColorScheme = "light" | "dark";

type ColorSchemeContextValue = {
  colorScheme: AppColorScheme;
  setColorScheme: Dispatch<SetStateAction<AppColorScheme>>;
  toggleColorScheme: () => void;
};

export const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(
  null,
);

export function useSystemColorScheme(): AppColorScheme {
  const systemColorScheme = useNativeColorScheme();

  return systemColorScheme === "dark" ? "dark" : "light";
}

export function useColorScheme(): AppColorScheme {
  const context = useContext(ColorSchemeContext);

  return context?.colorScheme ?? useSystemColorScheme();
}

export function useColorSchemeController() {
  const context = useContext(ColorSchemeContext);

  if (!context) {
    throw new Error(
      "useColorSchemeController must be used inside ColorSchemeContext.Provider",
    );
  }

  return context;
}
