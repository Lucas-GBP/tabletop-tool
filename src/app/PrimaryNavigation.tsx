import { classNames } from "@/lib";
import styles from "./PrimaryNavigation.module.scss";

export type PrimarySection = "campaigns" | "scenes" | "audio" | "settings";

interface PrimaryNavigationProps {
  active: PrimarySection;
  onNavigate: (section: PrimarySection) => void;
}

const groups: readonly {
  label: string;
  items: readonly { id: PrimarySection; label: string }[];
}[] = [
  {
    label: "Preparação",
    items: [
      { id: "campaigns", label: "Campanhas" },
      { id: "scenes", label: "Cenas" },
    ],
  },
  {
    label: "Ferramentas",
    items: [{ id: "audio", label: "Audio Mixer" }],
  },
];

export function PrimaryNavigation({
  active,
  onNavigate,
}: PrimaryNavigationProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span>TT</span>
        <strong>Tabletop Tool</strong>
      </div>
      <nav className={styles.navigation} aria-label="Navegação principal">
        {groups.map((group) => (
          <section key={group.label} className={styles.group}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={classNames(
                  styles.item,
                  active === item.id && styles.active,
                )}
                aria-current={active === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </section>
        ))}
      </nav>
      <button
        type="button"
        className={classNames(
          styles.item,
          styles.settings,
          active === "settings" && styles.active,
        )}
        aria-current={active === "settings" ? "page" : undefined}
        onClick={() => onNavigate("settings")}
      >
        Configurações
      </button>
    </aside>
  );
}
