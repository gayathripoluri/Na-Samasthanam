import { useRef, useState } from 'react';
import QuickExit from './components/QuickExit.jsx';
import { buildAffirmationDeck } from './data/affirmations.js';
import { MAX_STRIKES, promises } from './data/content.js';
import { clearPersistentState, usePersistentState } from './hooks/usePersistentState.js';
import { unlockWithDeviceLock } from './lib/deviceLock.js';
import AffirmationsComplete from './screens/AffirmationsComplete.jsx';
import AffirmationsScreen from './screens/AffirmationsScreen.jsx';
import CommunityApp from './screens/CommunityApp.jsx';
import MemberWelcome from './screens/MemberWelcome.jsx';
import PromiseScreen from './screens/PromiseScreen.jsx';
import ReasonsScreen from './screens/ReasonsScreen.jsx';
import Signature from './screens/Signature.jsx';
import SuspendedScreen from './screens/SuspendedScreen.jsx';
import Welcome from './screens/Welcome.jsx';

// Dev-only: open the app with ?team to reply as staff. Production builds
// ignore it, so nobody can claim the Team badge from the URL. Replace with a
// real role check once accounts exist.
const isTeamPreview =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('team');

export default function App() {
  const [screen, setScreen] = usePersistentState('screen', 'welcome');
  const [promiseIndex, setPromiseIndex] = usePersistentState('promiseIndex', 1);
  const [alias, setAlias] = usePersistentState('alias', '');
  // Comments blocked for curse words. Survives sign out, so signing out can't
  // reset it. Real enforcement needs accounts on a server.
  const [strikes, setStrikes] = usePersistentState('strikes', 0);
  const [selectedReasons, setSelectedReasons] = usePersistentState('reasons', []);
  const [savedAffirmations, setSavedAffirmations] = usePersistentState('savedAffirmations', []);
  // Finished onboarding on this device. Returning members still land on the
  // Welcome screen first rather than straight inside the circle.
  const [isMember, setIsMember] = usePersistentState('member', false);
  // Passkey id from sealing with her fingerprint; null if sealed without one.
  const [lockCredential, setLockCredential] = usePersistentState('lockCredential', null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockFailed, setUnlockFailed] = useState(false);
  const [appEntered, setAppEntered] = useState(false);
  const lastAdvancedPromiseRef = useRef(promiseIndex - 1);

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

  // Returning members open the circle with their phone's lock, if they set one.
  const continueFromWelcome = async () => {
    // Members saved before aliases existed have none; send them back through
    // signing to choose one.
    if (!isMember || !alias) {
      setScreen('reasons');
      return;
    }
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
    setAppEntered(true);
  };

  const enterCircle = () => {
    setIsMember(true);
    setScreen('welcome');
    setAppEntered(true);
  };

  // Signing out forgets everything saved on this device except strikes.
  const signOut = () => {
    clearPersistentState({ keep: ['strikes'] });
    setScreen('welcome');
    setPromiseIndex(1);
    setAlias('');
    setSelectedReasons([]);
    setSavedAffirmations([]);
    setIsMember(false);
    setLockCredential(null);
    setUnlockFailed(false);
    setAppEntered(false);
    lastAdvancedPromiseRef.current = 0;
  };

  if (strikes >= MAX_STRIKES) {
    return (
      <main className="app-shell">
        <QuickExit />
        <SuspendedScreen />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <QuickExit />
      {appEntered ? (
        <CommunityApp
          alias={alias}
          deviceLockOn={Boolean(lockCredential)}
          isTeam={isTeamPreview}
          onBlockedComment={() => setStrikes((count) => count + 1)}
          onSignOut={signOut}
          reasons={selectedReasons}
          savedAffirmations={savedAffirmations}
          strikes={strikes}
        />
      ) : (
        <>
          {screen === 'welcome' && (
            <Welcome
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
          {screen === 'promises' && (
            <PromiseScreen index={promiseIndex} onPromise={makePromise} />
          )}
          {screen === 'signature' && (
            <Signature
              onSeal={(name, credentialId) => {
                setAlias(name);
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
              affirmations={buildAffirmationDeck(selectedReasons)}
              onComplete={(saved) => {
                setSavedAffirmations(saved);
                setScreen('complete');
              }}
            />
          )}
          {screen === 'complete' && (
            <AffirmationsComplete
              alias={alias}
              onContinue={enterCircle}
              savedCount={savedAffirmations.length}
            />
          )}
          <span className="visually-hidden" aria-live="polite">
            {alias ? `Promise signed by ${alias}` : ''}
          </span>
        </>
      )}
    </main>
  );
}
