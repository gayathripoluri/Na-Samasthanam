import { helplines } from '../data/content.js';
import { UiIcon } from './icons.jsx';

export default function Helplines({ intro, className = '' }) {
  return (
    <div className={`crisis-note ${className}`}>
      <UiIcon name="alert" size={20} />
      <div>
        <p>{intro}</p>
        <ul className="helpline-list">
          {helplines.map((line) => (
            <li key={line.number}>
              <a href={`tel:${line.number}`}>
                <strong>{line.number}</strong>
                <span>
                  {line.name} · {line.detail}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
