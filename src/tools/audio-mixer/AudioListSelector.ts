import type { AudioListDto } from "@/api";
import { RuntimeError } from "@/runtime";

export class AudioListSelector {
  readonly #cursors = new Map<string, number>();
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  select(list: AudioListDto) {
    if (list.entries.length === 0) {
      throw new RuntimeError({
        code: "AUDIO_LIST_EMPTY",
        message: "A lista de áudio não possui itens reproduzíveis.",
        operation: "select_audio_list",
        entityId: list.id,
        recoverable: true,
      });
    }

    const entries = [...list.entries].sort(
      (left, right) => left.position - right.position,
    );
    if (list.selectionMode === "sequential") {
      const cursor = this.#cursors.get(list.id) ?? 0;
      const entry = entries[cursor % entries.length]!;
      this.#cursors.set(list.id, (cursor + 1) % entries.length);
      return entry.audioObjectId;
    }
    if (list.selectionMode === "random") {
      const index = Math.min(
        entries.length - 1,
        Math.floor(this.#boundedRandom() * entries.length),
      );
      return entries[index]!.audioObjectId;
    }

    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let target = this.#boundedRandom() * total;
    for (const entry of entries) {
      target -= entry.weight;
      if (target < 0) return entry.audioObjectId;
    }
    return entries.at(-1)!.audioObjectId;
  }

  reset(listIds?: Iterable<string>) {
    if (!listIds) {
      this.#cursors.clear();
      return;
    }
    for (const id of listIds) this.#cursors.delete(id);
  }

  #boundedRandom() {
    const value = this.#random();
    return Math.min(1 - Number.EPSILON, Math.max(0, value));
  }
}
