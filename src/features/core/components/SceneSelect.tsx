import type { SceneDto } from "../../../shared/api";
import { Select } from "../../../ui";

interface SceneSelectProps {
  name: string;
  label: string;
  scenes: SceneDto[];
  disabled?: boolean;
  placeholder?: string;
}

export function SceneSelect({
  name,
  label,
  scenes,
  disabled = false,
  placeholder = "Selecione uma cena",
}: SceneSelectProps) {
  return (
    <Select
      name={name}
      aria-label={label}
      required
      disabled={disabled}
      defaultValue=""
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {scenes.map((scene) => (
        <option key={scene.id} value={scene.id}>
          {scene.name}
        </option>
      ))}
    </Select>
  );
}
