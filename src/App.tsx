import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { api } from "./shared/api";
import { Button } from "./shared/ui/Button";
import { Input } from "./shared/ui/Input";
import styles from "./App.module.scss";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function greet() {
    setPending(true);
    setError("");
    setGreetMsg("");

    try {
      setGreetMsg(await api.greet(name));
    } catch (cause) {
      setError("Could not load the greeting. Please try again.");
      console.error("Greeting command failed", { operation: "greet", cause });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.container}>
      <h1>Welcome to Tauri + React</h1>

      <div className={styles.row}>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img
            src="/vite.svg"
            className={`${styles.logo} ${styles.vite}`}
            alt="Vite logo"
          />
        </a>
        <a href="https://tauri.app" target="_blank" rel="noreferrer">
          <img
            src="/tauri.svg"
            className={`${styles.logo} ${styles.tauri}`}
            alt="Tauri logo"
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img
            src={reactLogo}
            className={`${styles.logo} ${styles.react}`}
            alt="React logo"
          />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className={styles.row}
        onSubmit={(e) => {
          e.preventDefault();
          void greet();
        }}
      >
        <Input
          id="greet-input"
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Greeting..." : "Greet"}
        </Button>
      </form>
      <p role="status">{greetMsg}</p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </main>
  );
}

export default App;
