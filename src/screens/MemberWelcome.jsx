import { CircleMark } from '../components/icons.jsx';

export default function MemberWelcome({ alias, onEnter }) {
  return (
    <section className="screen member-welcome" aria-labelledby="member-title">
      <div className="member-content">
        <div className="member-mark">
          <CircleMark lit={5} large />
          <span className="member-mark__center" aria-hidden="true" />
        </div>
        <p className="member-name">{alias}</p>
        <p className="member-role">Oath keeper · Yuva Rani</p>
        <h1 id="member-title">You&apos;re in. This circle is yours too now.</h1>
        <button className="primary-button member-enter" onClick={onEnter}>
          Enter the Circle
        </button>
      </div>
    </section>
  );
}
