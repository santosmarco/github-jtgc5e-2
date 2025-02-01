import confetti from "canvas-confetti";
import type { Except } from "type-fest";

export function createConfettiEmitter(origin: confetti.Origin) {
  async function fire(
    particleRatio: number,
    opts?: Except<confetti.Options, "origin">,
  ) {
    await confetti({
      ...opts,
      origin,
      particleCount: Math.floor(200 * particleRatio),
    });
  }

  async function fireDefault() {
    void fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    void fire(0.2, {
      spread: 60,
    });
    void fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    void fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    void fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }

  return {
    fire,
    fireDefault,
  } as const;
}
