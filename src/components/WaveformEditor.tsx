import { useRef, useState } from "react";
import { clamp } from "@/tools/audio-mixer";
import styles from "./WaveformEditor.module.scss";

export interface TimeRegion {
  startUs: number;
  endUs: number;
}

interface WaveformEditorProps {
  peaks: readonly number[];
  durationUs: number;
  playback: TimeRegion;
  loop: TimeRegion | null;
  activeRegion: "playback" | "loop";
  playheadUs: number | null;
  onChange: (region: "playback" | "loop", value: TimeRegion) => void;
  onSeek: (positionUs: number) => void;
}

type DragMode = "create" | "start" | "end" | "move";

interface DragState {
  target: "playback" | "loop";
  mode: DragMode;
  originUs: number;
  originClientX: number;
  initial: TimeRegion;
  moved: boolean;
}

const HANDLE_HIT_RADIUS_PX = 10;
const MOVE_BAR_HEIGHT_PX = 30;
const DRAG_THRESHOLD_PX = 3;
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 240;

export function WaveformEditor({
  peaks,
  durationUs,
  playback,
  loop,
  activeRegion,
  playheadUs,
  onChange,
  onSeek,
}: WaveformEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [hoverMode, setHoverMode] = useState<DragMode>("create");
  const active = activeRegion === "loop" ? loop : playback;
  const safeDurationUs = Math.max(1, durationUs);

  function pointerData(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = clamp(
      (event.clientX - box.left) / Math.max(1, box.width),
      0,
      1,
    );
    return {
      at: Math.round(fraction * safeDurationUs),
      x: fraction * box.width,
      y: clamp(event.clientY - box.top, 0, box.height),
      width: Math.max(1, box.width),
    };
  }

  function interactionMode(pointer: ReturnType<typeof pointerData>): DragMode {
    if (!active) return "create";
    const startX = (active.startUs / safeDurationUs) * pointer.width;
    const endX = (active.endUs / safeDurationUs) * pointer.width;
    if (Math.abs(pointer.x - startX) <= HANDLE_HIT_RADIUS_PX) return "start";
    if (Math.abs(pointer.x - endX) <= HANDLE_HIT_RADIUS_PX) return "end";
    if (
      pointer.x > startX &&
      pointer.x < endX &&
      pointer.y <= MOVE_BAR_HEIGHT_PX
    ) {
      return "move";
    }
    return "create";
  }

  const playheadX =
    playheadUs === null
      ? null
      : (clamp(playheadUs, 0, safeDurationUs) / safeDurationUs) * VIEWBOX_WIDTH;

  return (
    <div className={styles.editor}>
      <svg
        ref={svgRef}
        className={styles.waveform}
        data-interaction={hoverMode}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        role="application"
        aria-label="Editor visual da forma de onda"
        onPointerDown={(event) => {
          if (!active) return;
          event.preventDefault();
          const pointer = pointerData(event);
          const mode = interactionMode(pointer);
          dragRef.current = {
            target: activeRegion,
            mode,
            originUs: pointer.at,
            originClientX: event.clientX,
            initial: active,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const pointer = pointerData(event);
          if (!drag) {
            setHoverMode(interactionMode(pointer));
            return;
          }
          event.preventDefault();
          if (
            !drag.moved &&
            Math.abs(event.clientX - drag.originClientX) < DRAG_THRESHOLD_PX
          ) {
            return;
          }
          drag.moved = true;
          const bounds =
            drag.target === "loop"
              ? playback
              : { startUs: 0, endUs: safeDurationUs };
          onChange(drag.target, draggedRegion(drag, pointer.at, bounds));
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (drag && !drag.moved) onSeek(pointerData(event).at);
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setHoverMode(interactionMode(pointerData(event)));
        }}
        onPointerCancel={(event) => {
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerLeave={() => {
          if (!dragRef.current) setHoverMode("create");
        }}
      >
        <rect
          className={styles.background}
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
        />
        <g className={styles.peaks} aria-hidden="true">
          {peaks.map((peak, index) => {
            const x = (index / Math.max(1, peaks.length - 1)) * VIEWBOX_WIDTH;
            const height = Math.max(2, peak * 200);
            return (
              <line
                key={index}
                x1={x}
                x2={x}
                y1={VIEWBOX_HEIGHT / 2 - height / 2}
                y2={VIEWBOX_HEIGHT / 2 + height / 2}
              />
            );
          })}
        </g>
        <RegionRect
          region={playback}
          durationUs={safeDurationUs}
          className={`${styles.region ?? ""} ${styles.playback ?? ""} ${
            activeRegion === "playback" ? styles.active : styles.inactive
          }`}
        />
        {loop && (
          <RegionRect
            region={loop}
            durationUs={safeDurationUs}
            className={`${styles.region ?? ""} ${styles.loop ?? ""} ${
              activeRegion === "loop" ? styles.active : styles.inactive
            }`}
          />
        )}
        {active && (
          <RegionHandles region={active} durationUs={safeDurationUs} />
        )}
        {playheadX !== null && (
          <g
            className={styles.playhead}
            role="img"
            aria-label={`Agulha em ${formatTime(playheadUs ?? 0)}`}
          >
            <line x1={playheadX} x2={playheadX} y1="0" y2={VIEWBOX_HEIGHT} />
            <path
              d={`M ${playheadX - 9} 0 H ${playheadX + 9} L ${playheadX} 14 Z`}
            />
          </g>
        )}
      </svg>
      <div className={styles.legend}>
        <span>Arraste para selecionar · faixa superior para mover</span>
        <output>
          {formatTime(playheadUs ?? active?.startUs ?? 0)} /{" "}
          {formatTime(safeDurationUs)}
        </output>
      </div>
    </div>
  );
}

function RegionRect({
  region,
  durationUs,
  className,
}: {
  region: TimeRegion;
  durationUs: number;
  className: string;
}) {
  return (
    <rect
      className={className}
      x={(region.startUs / durationUs) * VIEWBOX_WIDTH}
      width={((region.endUs - region.startUs) / durationUs) * VIEWBOX_WIDTH}
      y="8"
      height="224"
    />
  );
}

function RegionHandles({
  region,
  durationUs,
}: {
  region: TimeRegion;
  durationUs: number;
}) {
  const startX = (region.startUs / durationUs) * VIEWBOX_WIDTH;
  const endX = (region.endUs / durationUs) * VIEWBOX_WIDTH;
  return (
    <g className={styles.handles} aria-hidden="true">
      <rect
        className={styles["move-bar"]}
        x={startX}
        width={Math.max(1, endX - startX)}
        y="8"
        height="22"
      />
      <line x1={startX} x2={startX} y1="8" y2="232" />
      <line x1={endX} x2={endX} y1="8" y2="232" />
      <path d={`M ${startX} 8 h 12 v 20 h -12 Z`} />
      <path d={`M ${endX} 8 h -12 v 20 h 12 Z`} />
    </g>
  );
}

function draggedRegion(
  drag: DragState,
  at: number,
  bounds: TimeRegion,
): TimeRegion {
  const minimum = 1;
  if (drag.mode === "create") {
    const startUs = clamp(
      Math.min(drag.originUs, at),
      bounds.startUs,
      bounds.endUs - minimum,
    );
    const endUs = clamp(
      Math.max(drag.originUs, at),
      startUs + minimum,
      bounds.endUs,
    );
    return { startUs, endUs };
  }
  if (drag.mode === "start") {
    return {
      startUs: clamp(at, bounds.startUs, drag.initial.endUs - minimum),
      endUs: drag.initial.endUs,
    };
  }
  if (drag.mode === "end") {
    return {
      startUs: drag.initial.startUs,
      endUs: clamp(at, drag.initial.startUs + minimum, bounds.endUs),
    };
  }
  const duration = drag.initial.endUs - drag.initial.startUs;
  const offset = at - drag.originUs;
  const startUs = clamp(
    drag.initial.startUs + offset,
    bounds.startUs,
    bounds.endUs - duration,
  );
  return { startUs, endUs: startUs + duration };
}

function formatTime(microseconds: number) {
  const seconds = Math.max(0, microseconds) / 1_000_000;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}
