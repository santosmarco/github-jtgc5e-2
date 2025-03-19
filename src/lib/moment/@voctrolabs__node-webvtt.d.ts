type WebVTTCue = {
  identifier: string;
  start: number;
  end: number;
  text: string;
  styles: string;
};

declare module "@voctrolabs/node-webvtt" {
  export function parse(input: string): { valid: boolean; cues?: WebVTTCue[] };
}
