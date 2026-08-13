import { Alert, Platform } from "react-native";

export interface ConfirmationRequest {
  readonly title: string;
  readonly message: string;
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
}

type BrowserConfirmationGlobal = typeof globalThis & {
  confirm?: (message?: string) => boolean;
};

/**
 * Shows a small, explicit confirmation prompt without changing native Alert
 * behaviour. React Native Web does not implement Alert.alert, so web uses the
 * browser's synchronous confirm dialog and fails closed when it is unavailable.
 */
export function requestConfirmation(request: ConfirmationRequest): void {
  if (Platform.OS === "web") {
    const browser = globalThis as BrowserConfirmationGlobal;

    if (typeof browser.confirm !== "function") {
      return;
    }

    let confirmed = false;

    try {
      confirmed = browser.confirm(`${request.title}\n\n${request.message}`);
    } catch {
      return;
    }

    if (confirmed) {
      request.onConfirm();
    }

    return;
  }

  Alert.alert(request.title, request.message, [
    { text: request.cancelLabel, style: "cancel" },
    {
      text: request.confirmLabel,
      style: request.destructive ? "destructive" : "default",
      onPress: request.onConfirm,
    },
  ]);
}
