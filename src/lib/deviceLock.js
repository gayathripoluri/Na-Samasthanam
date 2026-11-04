// "Seal with your fingerprint" using passkeys (WebAuthn). The phone's own lock
// — fingerprint, Face ID or PIN — checks it's her; the fingerprint never
// leaves the device and this app never sees it. We only keep the passkey's id.
//
// Without a server this is a lock on this device, not an account login:
// there's no one to check the signature against. With a backend (progress 4.2)
// the server sends the challenge and verifies the response.

const toBase64Url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (text) => {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

// Bit 2 of the authenticator data flags: the device verified the user
// (fingerprint, face or PIN), not just that someone tapped.
const userWasVerified = (authenticatorData) => (new Uint8Array(authenticatorData)[32] & 0x04) !== 0;

export async function isDeviceLockAvailable() {
  try {
    return Boolean(
      window.PublicKeyCredential &&
        (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()),
    );
  } catch {
    return false;
  }
}

// Returns the new passkey's id, or throws if she cancels or it fails.
export async function registerDeviceLock(alias) {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Naa Samasthanam' },
      user: { id: randomBytes(16), name: alias, displayName: alias },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        // Not a discoverable passkey, so it's less likely to be listed in the
        // phone's password manager where someone else could spot it.
        residentKey: 'discouraged',
      },
      attestation: 'none',
      timeout: 60000,
    },
  });
  return toBase64Url(credential.rawId);
}

// Resolves true only if the device confirmed it's her.
export async function unlockWithDeviceLock(credentialId) {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return userWasVerified(assertion.response.authenticatorData);
  } catch {
    return false;
  }
}
