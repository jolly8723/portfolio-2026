import { ConfigPanel } from './components/ConfigPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { DitherBackground } from './fx/DitherBackground';
import { useGlassVars } from './fx/useGlassVars';
import { Home } from './pages/Home';
import { useRevealObserver } from './reveal';
import styles from './App.module.css';

export default function App() {
  useGlassVars();
  useRevealObserver();

  return (
    <div className={styles.page}>
      <DitherBackground />
      <Home />
      <ThemeToggle />
      <ConfigPanel />
    </div>
  );
}
