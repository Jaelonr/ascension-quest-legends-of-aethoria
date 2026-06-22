import { useState, useCallback } from "react";

const BIOMETRIC_CRED_KEY = "fitness-rpg-biometric-cred-id";
const BIOMETRIC_LOCKED_KEY = "fitness-rpg-biometric-locked";

export function useBiometric() {
  const [isSupported] = useState(() =>
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials
  );

  const isRegistered = () => !!localStorage.getItem(BIOMETRIC_CRED_KEY);

  const register = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) return { ok: false, error: "Biometrics not supported on this device" };

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Ascension Quest", id: window.location.hostname },
          user: {
            id: userId,
            name: "adventurer",
            displayName: "Adventurer",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "none",
        },
      }) as PublicKeyCredential | null;

      if (!credential) return { ok: false, error: "Registration cancelled" };

      localStorage.setItem(BIOMETRIC_CRED_KEY, credential.id);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      if (message.includes("cancelled") || message.includes("abort")) {
        return { ok: false, error: "Cancelled by user" };
      }
      return { ok: false, error: message };
    }
  }, [isSupported]);

  const authenticate = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) return { ok: false, error: "Biometrics not supported" };
    const credId = localStorage.getItem(BIOMETRIC_CRED_KEY);
    if (!credId) return { ok: false, error: "No biometric registered" };

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
          allowCredentials: [],
        },
      }) as PublicKeyCredential | null;

      if (!assertion) return { ok: false, error: "Authentication cancelled" };
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      return { ok: false, error: message };
    }
  }, [isSupported]);

  const deregister = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_CRED_KEY);
    localStorage.removeItem(BIOMETRIC_LOCKED_KEY);
  }, []);

  const lock = useCallback(() => {
    sessionStorage.setItem(BIOMETRIC_LOCKED_KEY, "1");
  }, []);

  const isLocked = () => sessionStorage.getItem(BIOMETRIC_LOCKED_KEY) === "1";

  const unlock = useCallback(async (): Promise<boolean> => {
    const result = await authenticate();
    if (result.ok) {
      sessionStorage.removeItem(BIOMETRIC_LOCKED_KEY);
      return true;
    }
    return false;
  }, [authenticate]);

  return { isSupported, isRegistered, register, authenticate, deregister, lock, isLocked, unlock };
}
