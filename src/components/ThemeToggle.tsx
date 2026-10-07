import { useTheme } from '../states/useTheme';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Light mode"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={styles.switch}
      onClick={toggleTheme}
    >
      <span className={styles.icon} aria-hidden="true">
        ☾
      </span>
      <span className={styles.icon} aria-hidden="true">
        ☀
      </span>
      <span className={`${styles.knob} ${isLight ? styles.knobLight : ''}`} aria-hidden="true" />
    </button>
  );
}
