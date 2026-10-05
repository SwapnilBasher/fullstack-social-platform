import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function SSOCallbackScreen() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#111827" />
      <Text style={styles.message}>Finishing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "600",
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
});
