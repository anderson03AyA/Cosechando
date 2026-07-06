import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import type { AppColorScheme } from "../../hooks/use-color-scheme";

type ThemeToggleProps = {
  value: AppColorScheme;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "switch" | "icon";
};

export function ThemeToggle({
  value,
  onToggle,
  style,
  variant = "switch",
}: ThemeToggleProps) {
  const progress = React.useRef(
    new Animated.Value(value === "dark" ? 1 : 0),
  ).current;

  React.useEffect(() => {
    Animated.spring(progress, {
      toValue: value === "dark" ? 1 : 0,
      damping: 16,
      stiffness: 180,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  const trackBackgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#cae8ff", "#11202c"],
  });
  const trackBorderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(123, 167, 214, 0.36)", "rgba(123, 211, 199, 0.22)"],
  });
  const thumbBackgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fff8d6", "#0a131b"],
  });
  const thumbTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 36],
  });
  const thumbRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-18deg", "18deg"],
  });
  const sunOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.14, 0],
  });
  const moonOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.2, 1],
  });
  const sunScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });
  const moonScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const glowOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.65, 0.18, 0],
  });
  const glowScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.74],
  });
  const starsOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.2, 1],
  });
  const starsTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });
  const cloudOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.25, 0],
  });
  const iconButtonBackgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255, 248, 214, 0.96)", "rgba(17, 32, 44, 0.98)"],
  });
  const iconButtonBorderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(123, 167, 214, 0.34)", "rgba(123, 211, 199, 0.22)"],
  });
  const iconRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-14deg", "14deg"],
  });

  if (variant === "icon") {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value === "dark" }}
        accessibilityLabel={
          value === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
        }
        hitSlop={10}
        onPress={onToggle}
        style={[styles.iconButtonWrapper, style]}
      >
        <Animated.View
          style={[
            styles.iconButton,
            {
              backgroundColor: iconButtonBackgroundColor,
              borderColor: iconButtonBorderColor,
              transform: [{ rotate: iconRotate }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: sunOpacity,
                transform: [{ scale: sunScale }],
              },
            ]}
          >
            <MaterialCommunityIcons
              color="#f59e0b"
              name="white-balance-sunny"
              size={18}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: moonOpacity,
                transform: [{ scale: moonScale }],
              },
            ]}
          >
            <MaterialCommunityIcons
              color="#e2e8f0"
              name="moon-waning-crescent"
              size={16}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value === "dark" }}
      accessibilityLabel={
        value === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
      }
      hitSlop={10}
      onPress={onToggle}
      style={[styles.wrapper, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBackgroundColor,
            borderColor: trackBorderColor,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.cloudCluster,
            {
              opacity: cloudOpacity,
            },
          ]}
        >
          <View style={[styles.cloudBubble, styles.cloudBubbleLarge]} />
          <View style={[styles.cloudBubble, styles.cloudBubbleMedium]} />
          <View style={[styles.cloudBubble, styles.cloudBubbleSmall]} />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.starsLayer,
            {
              opacity: starsOpacity,
              transform: [{ translateX: starsTranslateX }],
            },
          ]}
        >
          <View style={[styles.star, styles.starOne]} />
          <View style={[styles.star, styles.starTwo]} />
          <View style={[styles.star, styles.starThree]} />
        </Animated.View>

        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbBackgroundColor,
              transform: [
                { translateX: thumbTranslateX },
                { rotate: thumbRotate },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: sunOpacity,
                transform: [{ scale: sunScale }],
              },
            ]}
          >
            <MaterialCommunityIcons
              color="#f59e0b"
              name="white-balance-sunny"
              size={17}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: moonOpacity,
                transform: [{ scale: moonScale }],
              },
            ]}
          >
            <MaterialCommunityIcons
              color="#e2e8f0"
              name="moon-waning-crescent"
              size={15}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 72,
    height: 40,
  },
  iconButtonWrapper: {
    width: 38,
    height: 38,
  },
  iconButton: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#020617",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  track: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    shadowColor: "#020617",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  glow: {
    position: "absolute",
    left: 10,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(255, 241, 118, 0.55)",
  },
  cloudCluster: {
    position: "absolute",
    left: 8,
    bottom: 6,
    width: 24,
    height: 10,
  },
  cloudBubble: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  cloudBubbleLarge: {
    left: 0,
    width: 13,
    height: 8,
    borderRadius: 8,
  },
  cloudBubbleMedium: {
    left: 8,
    width: 12,
    height: 10,
    borderRadius: 10,
  },
  cloudBubbleSmall: {
    left: 16,
    width: 8,
    height: 6,
    borderRadius: 6,
  },
  starsLayer: {
    position: "absolute",
    right: 11,
    top: 7,
    width: 16,
    height: 16,
  },
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  starOne: {
    top: 0,
    left: 6,
    width: 3,
    height: 3,
  },
  starTwo: {
    top: 6,
    left: 0,
    width: 2,
    height: 2,
  },
  starThree: {
    right: 1,
    bottom: 2,
    width: 2,
    height: 2,
  },
  thumb: {
    position: "absolute",
    top: 3,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#020617",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
