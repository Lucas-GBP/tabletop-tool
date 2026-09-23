import type {
  AudioCompositionDto,
  AudioLibraryDto,
  AudioListDto,
  AudioObjectDto,
  SceneAudioConfigurationDto,
} from "@/api";

export function audioObjectMissing(
  library: Pick<AudioLibraryDto, "files">,
  object: AudioObjectDto,
) {
  return !library.files.some(
    (asset) => asset.relativePath === object.assetPath,
  );
}

export function audioListMissing(
  library: Pick<AudioLibraryDto, "files" | "objects">,
  list: AudioListDto,
) {
  return list.entries.some((entry) => {
    const object = library.objects.find(
      (candidate) => candidate.id === entry.audioObjectId,
    );
    return !object || audioObjectMissing(library, object);
  });
}

export function audioCompositionMissing(
  library: Pick<AudioLibraryDto, "files" | "objects" | "lists">,
  composition: AudioCompositionDto,
) {
  return composition.layers.some((layer) => {
    const source = layer.source;
    if (source.kind === "audioObject") {
      const object = library.objects.find(
        (candidate) => candidate.id === source.audioObjectId,
      );
      return !object || audioObjectMissing(library, object);
    }
    const list = library.lists.find(
      (candidate) => candidate.id === source.audioListId,
    );
    return !list || audioListMissing(library, list);
  });
}

export function sceneAudioMissing(
  library: Pick<
    AudioLibraryDto,
    "files" | "objects" | "lists" | "compositions"
  >,
  scene: SceneAudioConfigurationDto,
) {
  return (
    scene.audioObjectIds.some((id) => {
      const object = library.objects.find((candidate) => candidate.id === id);
      return !object || audioObjectMissing(library, object);
    }) ||
    scene.audioListIds.some((id) => {
      const list = library.lists.find((candidate) => candidate.id === id);
      return !list || audioListMissing(library, list);
    }) ||
    scene.audioCompositionIds.some((id) => {
      const composition = library.compositions.find(
        (candidate) => candidate.id === id,
      );
      return !composition || audioCompositionMissing(library, composition);
    })
  );
}
