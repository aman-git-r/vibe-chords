/**
 * Type declaration for midi-writer-js.
 *
 * The package ships its own types under build/types/main.d.ts, but they are
 * not resolved when TypeScript follows package.json "exports". This declaration
 * provides the minimal interface we use so the project compiles.
 */
declare module "midi-writer-js" {
  interface Track {
    setTempo(bpm: number, tick?: number): this;
    addEvent(events: unknown): this;
  }

  interface NoteEventOptions {
    pitch: string[];
    duration: string;
    velocity?: number;
  }

  interface Writer {
    dataUri(): string;
  }

  const MidiWriter: {
    Track: new () => Track;
    NoteEvent: new (fields: NoteEventOptions) => unknown;
    Writer: new (tracks: unknown[]) => Writer;
  };

  export default MidiWriter;
}
