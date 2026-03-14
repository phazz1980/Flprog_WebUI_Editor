/**
 * Правила проигрывания звука в просмотрщике:
 * - Уведомление (sound_enabled === 1): short-ringing-notification-sound.mp3 один раз.
 * - Авария (sound_enabled === 2): aviation-alarm.mp3 в цикле до отключения пользователем.
 * - Аларм имеет приоритет: при активном аларме звук уведомления не воспроизводится.
 */

const baseUrl = process.env.PUBLIC_URL || '';

/** Уведомление — один раз. */
const NOTIFICATION_SRC = `${baseUrl}/short-ringing-notification-sound.mp3`;

/** Авария — в цикле до отключения, между повторами пауза 2 сек. */
const ALARM_SRC = `${baseUrl}/aviation-alarm.mp3`;
const ALARM_PAUSE_MS = 2000;

let alarmActive = false;
let alarmAudio: HTMLAudioElement | null = null;
let alarmTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Идёт ли аларм (воспроизведение или пауза между повторами). */
export function isAlarmPlaying(): boolean {
  return alarmActive;
}

/** Проиграть уведомление один раз. Не проигрывает, если активен аларм. */
export function playNotificationOnce(): void {
  if (isAlarmPlaying()) return;
  const a = new Audio(NOTIFICATION_SRC);
  a.volume = 0.6;
  a.playbackRate = 1;
  a.play().catch(() => {});
}

/** Один цикл аларма: новый Audio, после ended — пауза 2 сек, затем снова. */
function playAlarmOnce(): void {
  if (!alarmActive) return;
  const a = new Audio(ALARM_SRC);
  a.volume = 0.6;
  a.playbackRate = 1;
  a.addEventListener('ended', () => {
    if (!alarmActive || alarmTimeoutId != null) return;
    alarmTimeoutId = setTimeout(() => {
      alarmTimeoutId = null;
      playAlarmOnce();
    }, ALARM_PAUSE_MS);
  });
  alarmAudio = a;
  a.play().catch(() => {});
}

/** Запустить аларм (авария): aviation-alarm, между повторами пауза 2 сек. */
export function startAlarmLoop(): void {
  stopAlarm();
  alarmActive = true;
  playAlarmOnce();
}

/** Остановить аларм. */
export function stopAlarm(): void {
  alarmActive = false;
  if (alarmTimeoutId != null) {
    clearTimeout(alarmTimeoutId);
    alarmTimeoutId = null;
  }
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    alarmAudio = null;
  }
}
