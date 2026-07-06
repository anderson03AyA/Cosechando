import {
    createContext,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

export type AppColorScheme = "light" | "dark";

type ColorSchemeContextValue = {
  colorScheme: AppColorScheme;
  setColorScheme: Dispatch<SetStateAction<AppColorScheme>>;
  toggleColorScheme: () => void;
};

export const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(
  null,
);

/**
 * Para soportar renderizado estático, este valor se recalcula en el cliente para web
 */
export function useSystemColorScheme(): AppColorScheme {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme === "dark" ? "dark" : "light";
  }

  return "light";
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
