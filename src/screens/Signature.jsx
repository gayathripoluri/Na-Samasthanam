import { useEffect, useState } from 'react';
import { CircleMark, FingerprintIcon } from '../components/icons.jsx';
import { ALIAS_MAX, aliasNameProblem, aliasProblem, aliasRules } from '../lib/alias.js';
import { isDeviceLockAvailable, registerDeviceLock } from '../lib/deviceLock.js';

export default function Signature({ onSeal }) {
  const [alias, setAlias] = useState('');
  const [sealed, setSealed] = useState(false);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [lockFailed, setLockFailed] = useState(false);
  const [credentialId, setCredentialId] = useState(null);
  // Aliases can't have spaces, so nothing is trimmed: what she types is checked.
  const problem = alias ? aliasProblem(alias) : '';
  // The checklist covers length and required characters; this line covers the rest.
  const nameProblem = alias ? aliasNameProblem(alias) : '';

  useEffect(() => {
    isDeviceLockAvailable().then(setLockAvailable);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!alias || problem || sealing) return;
    if (!lockAvailable) {
      setSealed(true);
      return;
    }
    setSealing(true);
    setLockFailed(false);
    try {
      setCredentialId(await registerDeviceLock(alias));
      setSealed(true);
    } catch {
      setLockFailed(true);
    } finally {
      setSealing(false);
    }
  };

  const sealLabel = () => {
    if (sealed) return 'Promise sealed';
    if (sealing) return 'Waiting for your fingerprint…';
    return lockAvailable ? 'Seal with fingerprint' : 'Seal my promise';
  };

  return (
    <section className="screen signature-screen" aria-labelledby="signature-title">
      <div className="signature-content">
        <CircleMark lit={5} large />
        <h1 id="signature-title">Sign with your alias</h1>
        <p className="signature-subtitle">
          This is the name the circle will see. Please don&apos;t use your real name.
        </p>
        <form className="signature-form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="signature-name">
            Your alias
          </label>
          <input
            aria-describedby="alias-feedback"
            aria-invalid={Boolean(problem)}
            autoComplete="off"
            disabled={sealed || sealing}
            id="signature-name"
            maxLength={ALIAS_MAX + 10}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="e.g. quiet_river7"
            value={alias}
          />
          {!sealed && (
            <ul className="alias-rules" aria-label="Alias rules">
              {aliasRules(alias).map((rule) => (
                <li className={rule.met ? 'is-met' : ''} key={rule.label}>
                  <span aria-hidden="true">{rule.met ? '✓' : '○'}</span>
                  {rule.label}
                  <span className="visually-hidden">{rule.met ? ' — done' : ' — needed'}</span>
                </li>
              ))}
            </ul>
          )}
          <p
            className={`alias-feedback${nameProblem ? ' is-error' : ''}`}
            id="alias-feedback"
            role="status"
          >
            {nameProblem || (alias && !problem && !sealed ? 'That alias is free.' : '')}
          </p>
          <button
            className="primary-button seal-button"
            disabled={!alias || Boolean(problem) || sealed || sealing}
            type="submit"
          >
            <FingerprintIcon size={16} color="currentColor" />
            {sealLabel()}
          </button>
          {!sealed && (
            <p className="seal-lock-note">
              {lockAvailable
                ? 'Your phone will ask for your fingerprint, face or PIN. It never leaves your phone — we never see it.'
                : 'This device has no fingerprint or screen lock set up, so your promise is sealed without one.'}
            </p>
          )}
          {lockFailed && !sealed && (
            <div className="seal-lock-failed" role="alert">
              <p>We couldn&apos;t confirm your fingerprint. Try again, or seal without it.</p>
              <button className="text-button" onClick={() => setSealed(true)} type="button">
                Seal without fingerprint
              </button>
            </div>
          )}
          {sealed && (
            <>
              <p className="seal-confirmation" role="status">
                {credentialId
                  ? `Sealed with your fingerprint, ${alias}. Next time, your phone's lock opens the circle.`
                  : `Your promise is held with care, ${alias}.`}
              </p>
              <button
                className="text-button"
                onClick={() => onSeal(alias, credentialId)}
                type="button"
              >
                Continue
                <span aria-hidden="true"> →</span>
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
