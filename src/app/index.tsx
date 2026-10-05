import { useAuth, useClerk, useSSO, useUser } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type AuthProvider = "google" | "apple";

export default function Index() {
  const { width } = useWindowDimensions();
  const buttonWidth = Math.max(0, width - 44);
  const statusWidth = Math.max(0, width - 58);

  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { startSSOFlow } = useSSO();
  const { user } = useUser();
  const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(
    null,
  );
  const [authError, setAuthError] = useState<string | null>(null);

  const startProviderFlow = useCallback(
    async (provider: AuthProvider) => {
      setPendingProvider(provider);
      setAuthError(null);

      try {
        const redirectUrl = AuthSession.makeRedirectUri({
          path: "sso-callback",
          scheme: "codexgram",
        });

        const { createdSessionId, setActive } = await startSSOFlow({
          redirectUrl,
          strategy: provider === "google" ? "oauth_google" : "oauth_apple",
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          return;
        }

        throw new Error("We could not finish sign in. Please try again.");
      } catch (error) {
        setAuthError(getErrorMessage(error));
      } finally {
        setPendingProvider(null);
      }
    },
    [startSSOFlow],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View
        pointerEvents="none"
        style={[styles.statusBar, { width: statusWidth }]}
      >
        <Text style={styles.time}>9:41</Text>
        <View style={styles.statusIcons}>
          <View style={styles.signal}>
            <View style={[styles.signalBar, styles.signalBarSmall]} />
            <View style={[styles.signalBar, styles.signalBarMedium]} />
            <View style={styles.signalBar} />
          </View>
          <View style={styles.wifi} />
          <View style={styles.battery}>
            <View style={styles.batteryFill} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <View style={styles.logo}>
            <View style={styles.cameraBody}>
              <View style={styles.cameraLens} />
              <View style={styles.cameraFlash} />
            </View>
          </View>
          <Text style={styles.title}>Codexgram</Text>
          <Text style={styles.subtitle}>Real people. Real moments.</Text>
        </View>

        <View style={[styles.actions, { width: buttonWidth }]}>
          {!isLoaded ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : isSignedIn ? (
            <>
              <Text style={styles.signedInText}>
                {user?.primaryEmailAddress?.emailAddress ??
                  user?.fullName ??
                  "You're signed in."}
              </Text>
              <AuthButton
                disabled={pendingProvider !== null}
                isLoading={pendingProvider === "apple"}
                label="Sign out"
                onPress={() => void signOut()}
                provider="apple"
              />
            </>
          ) : (
            <>
              <AuthButton
                disabled={pendingProvider !== null}
                isLoading={pendingProvider === "google"}
                label="Continue with Google"
                onPress={() => startProviderFlow("google")}
                provider="google"
              />
              <AuthButton
                disabled={pendingProvider !== null}
                isLoading={pendingProvider === "apple"}
                label="Continue with Apple"
                onPress={() => startProviderFlow("apple")}
                provider="apple"
              />
            </>
          )}
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        </View>
      </View>

      <Text style={styles.terms}>
        By continuing, you agree to our{"\n"}
        Terms of Service and Privacy Policy.
      </Text>
    </SafeAreaView>
  );
}

type AuthButtonProps = {
  disabled: boolean;
  isLoading: boolean;
  label: string;
  onPress: () => void;
  provider: AuthProvider;
};

function AuthButton({
  disabled,
  isLoading,
  label,
  onPress,
  provider,
}: AuthButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.authButton,
        disabled ? styles.authButtonDisabled : null,
        pressed && !disabled ? styles.authButtonPressed : null,
      ]}
    >
      <View style={styles.providerIcon}>
        {isLoading ? (
          <ActivityIndicator color="#4F46E5" size="small" />
        ) : provider === "google" ? (
          <Text style={styles.googleIcon}>G</Text>
        ) : (
          <AppleMark />
        )}
      </View>
      <Text style={styles.authButtonText}>{label}</Text>
    </Pressable>
  );
}

function AppleMark() {
  return (
    <View style={styles.appleMark}>
      <View style={styles.appleLeaf} />
      <View style={styles.appleBite} />
    </View>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "We could not finish sign in. Please try again.";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  statusBar: {
    height: 38,
    marginHorizontal: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  statusIcons: {
    width: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  signal: {
    width: 16,
    height: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  signalBar: {
    width: 3,
    height: 9,
    borderRadius: 1,
    backgroundColor: "#111827",
  },
  signalBarSmall: {
    height: 4,
  },
  signalBarMedium: {
    height: 7,
  },
  wifi: {
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#111827",
    transform: [{ rotate: "-45deg" }],
  },
  battery: {
    width: 17,
    height: 8,
    borderWidth: 1.5,
    borderColor: "#111827",
    borderRadius: 2,
    padding: 1,
  },
  batteryFill: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingBottom: 17,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 52,
  },
  logo: {
    width: 65,
    height: 65,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    shadowColor: "#2563EB",
    shadowOpacity: 0.27,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  cameraBody: {
    width: 40,
    height: 32,
    borderRadius: 9,
    borderWidth: 6,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraLens: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
  },
  cameraFlash: {
    position: "absolute",
    top: -7,
    right: -5,
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  title: {
    marginTop: 16,
    color: "#111827",
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 5,
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  actions: {
    alignSelf: "center",
    gap: 12,
  },
  authButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#DCE4EF",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  providerIcon: {
    position: "absolute",
    left: 40,
    width: 22,
    alignItems: "center",
  },
  googleIcon: {
    color: "#4285F4",
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "800",
  },
  appleMark: {
    width: 18,
    height: 20,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#000000",
  },
  appleLeaf: {
    position: "absolute",
    top: -4,
    right: 2,
    width: 8,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#000000",
    transform: [{ rotate: "-28deg" }],
  },
  appleBite: {
    position: "absolute",
    top: 4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  authButtonText: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  loadingButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#DCE4EF",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700",
  },
  signedInText: {
    color: "#6B7280",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  terms: {
    marginBottom: 80,
    paddingHorizontal: 22,
    color: "#9CA3AF",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "500",
  },
});
