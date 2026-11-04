import { useEffect, useRef, useState } from 'react';
import QuickExit from './components/QuickExit.jsx';
import { buildAffirmationDeck } from './data/affirmations.js';
import { promises } from './data/content.js';
import {
  clearLegacyState,
  clearPersistentState,
  usePersistentState,
} from './hooks/usePersistentState.js';
import { unlockWithDeviceLock } from './lib/deviceLock.js';
import {
  claimMember,
  fetchProfile,
  isConfigured,
  isTeamRoute,
  recordStrike,
  signOutLocally,
  updateProfile,
} from './lib/supabase.js';
import AffirmationsComplete from './screens/AffirmationsComplete.jsx';
import AffirmationsScreen from './screens/AffirmationsScreen.jsx';
import CommunityApp from './screens/CommunityApp.jsx';
import MemberWelcome from './screens/MemberWelcome.jsx';
import PromiseScreen from './screens/PromiseScreen.jsx';
import ReasonsScreen from './screens/ReasonsScreen.jsx';
import Signature from './screens/Signature.jsx';
import SuspendedScreen from './screens/SuspendedScreen.jsx';
import TeamConsole from './screens/TeamConsole.jsx';
import Welcome from './screens/Welcome.jsx';

const SCREENS_AFTER_SIGNING = ['memberWelcome', 'affirmations', 'complete'];

function Member() {
  // Only onboarding progress and the passkey id stay on the device. Her alias,
  // reasons and everything shared live on the server, loaded after she unlocks.
  const [screen, setScreen] = usePersistentState('screen', 'welcome');
  const [promiseIndex, setPromiseIndex] = usePersistentState('promiseIndex', 1);
  const [selectedReasons, setSelectedReasons] = usePersistentState('reasons', []);
  const [isMember, setIsMember] = usePersistentState('member', false);
  // Passkey id from sealing with her fingerprint; null if sealed without one.
  const [lockCredential, setLockCredential] = usePersistentState('lockCredential', null);
  const [profile, setProfile] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockFailed, setUnlockFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [appEntered, setAppEntered] = useState(false);
  const lastAdvancedPromiseRef = useRef(promiseIndex - 1);

  useEffect(clearLegacyState, []);

  // A refresh part-way through the last onboarding screens.
  useEffect(() => {
    if (SCREENS_AFTER_SIGNING.includes(screen) && !profile) {
      fetchProfile().then(setProfile).catch(() => setOffline(true));
    }
  }, [screen, profile]);

  const toggleReason = (reason) => {
    setSelectedReasons((current) =>
      current.includes(reason)
        ? current.filter((item) => item !== reason)
        : [...current, reason],
    );
  };

  const makePromise = () => {
    if (lastAdvancedPromiseRef.current >= promiseIndex) return;
    lastAdvancedPromiseRef.current = promiseIndex;
    if (promiseIndex >= promises.length) {
      setScreen('signature');
      return;
    }
    setPromiseIndex((current) => current + 1);
  };

  const claimAlias = async (alias) => {
    // On a retry her reasons are already saved and cleared from the device.
    const claimed = await claimMember(alias, profile?.reasons ?? selectedReasons);
    setProfile(claimed);
    setSelectedReasons([]);
  };

  // Always from promise 1: an old device can still hold progress from before.
  const startOnboarding = () => {
    setIsMember(false);
    setPromiseIndex(1);
    lastAdvancedPromiseRef.current = 0;
    setScreen('reasons');
  };

  // Returning members open the circle with their phone's lock, if they set one.
  const continueFromWelcome = async () => {
    if (!isMember) {
      startOnboarding();
      return;
    }
    setOffline(false);
    if (lockCredential) {
      setUnlocking(true);
      setUnlockFailed(false);
      const verified = await unlockWithDeviceLock(lockCredential);
      setUnlocking(false);
      if (!verified) {
        setUnlockFailed(true);
        return;
      }
    }
    try {
      const loaded = await fetchProfile();
      if (!loaded) {
        startOnboarding();
        return;
      }
      setProfile(loaded);
      setAppEntered(true);
    } catch {
      setOffline(true);
    }
  };

  const enterCircle = () => {
    setIsMember(true);
    setScreen('welcome');
    setAppEntered(true);
  };

  // Her account has no email or password, so this ends it on this device.
  const signOut = async () => {
    await signOutLocally();
    clearPersistentState();
    setScreen('welcome');
    setPromiseIndex(1);
    setSelectedReasons([]);
    setIsMember(false);
    setLockCredential(null);
    setProfile(null);
    setUnlockFailed(false);
    setAppEntered(false);
    lastAdvancedPromiseRef.current = 0;
  };

  if (profile?.suspended_at) return <SuspendedScreen />;

  if (appEntered && profile) {
    return (
      <CommunityApp
        alias={profile.alias}
        deviceLockOn={Boolean(lockCredential)}
        messagePrivacy={profile.message_privacy}
        onBlockedComment={() => recordStrike().then(setProfile).catch(() => {})}
        onSignOut={signOut}
        onUpdateProfile={(change) =>
          updateProfile(profile.id, change).then(setProfile).catch(() => {})
        }
        reasons={profile.reasons}
        savedAffirmations={profile.saved_affirmations}
        strikes={profile.strikes}
        suggestSupport={profile.suggest_support}
        userId={profile.id}
      />
    );
  }

  const alias = profile?.alias ?? '';

  return (
    <>
      {screen === 'welcome' && (
        <Welcome
          offline={offline}
          onContinue={continueFromWelcome}
          onStartOver={signOut}
          unlockFailed={unlockFailed}
          unlocking={unlocking}
        />
      )}
      {screen === 'reasons' && (
        <ReasonsScreen
          onContinue={() => setScreen('promises')}
          onToggle={toggleReason}
          selected={selectedReasons}
        />
      )}
      {screen === 'promises' && <PromiseScreen index={promiseIndex} key={promiseIndex} onPromise={makePromise} />}
      {screen === 'signature' && (
        <Signature
          onClaim={claimAlias}
          onSeal={(credentialId) => {
            setLockCredential(credentialId);
            setScreen('memberWelcome');
          }}
        />
      )}
      {screen === 'memberWelcome' && (
        <MemberWelcome alias={alias} onEnter={() => setScreen('affirmations')} />
      )}
      {screen === 'affirmations' && (
        <AffirmationsScreen
          affirmations={buildAffirmationDeck(profile?.reasons ?? [])}
          onComplete={(saved) => {
            setProfile((current) => ({ ...current, saved_affirmations: saved }));
            if (profile) {
              updateProfile(profile.id, { saved_affirmations: saved }).catch(() => {});
            }
            setScreen('complete');
          }}
        />
      )}
      {screen === 'complete' && (
        <AffirmationsComplete
          alias={alias}
          onContinue={enterCircle}
          savedCount={profile?.saved_affirmations.length ?? 0}
        />
      )}
      <span className="visually-hidden" aria-live="polite">
        {alias ? `Promise signed by ${alias}` : ''}
      </span>
    </>
  );
}

function NotConnected() {
  return (
    <section className="screen suspended-screen" aria-labelledby="offline-title">
      <div className="breathing-copy">
        <h1 id="offline-title">The circle isn&apos;t open yet.</h1>
        <p>This site hasn&apos;t been connected to its database.</p>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main className={`app-shell${isConfigured && isTeamRoute ? ' app-shell--portal' : ''}`}>
      <QuickExit />
      {!isConfigured && <NotConnected />}
      {isConfigured && (isTeamRoute ? <TeamConsole /> : <Member />)}
    </main>
  );
}
