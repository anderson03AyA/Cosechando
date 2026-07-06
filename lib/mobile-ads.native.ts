export async function initializeMobileAds(): Promise<void> {
  const { default: mobileAds } = await import("react-native-google-mobile-ads");

  await mobileAds().initialize();
}
