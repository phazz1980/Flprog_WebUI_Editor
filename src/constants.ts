/** Размер клетки видимой сетки = 1 шаг перемещения виджета (в логических координатах канвы). Увеличьте значение для более крупного шага. */
export const GRID_SIZE = 5;

/** Пикселей на одну логическую единицу канвы — фиксированный масштаб (квадраты не меняют размер при смене пропорций). */
export const PIXELS_PER_UNIT = 2;

export const snapToGrid = (value: number) =>
  Math.round(Math.round(value / GRID_SIZE) * GRID_SIZE);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Дата сборки (REACT_APP_BUILD_DATE в формате YYYY-MM-DD при сборке, иначе текущая дата в dev). */
export const BUILD_DATE = (() => {
  // Прямой доступ к process.env.REACT_APP_* — иначе optional chaining ломает подстановку в CRA/webpack.
  const s = process.env.REACT_APP_BUILD_DATE;
  if (s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
  }
  return new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
})();

/** Время сборки (REACT_APP_BUILD_TIME HH:mm:ss при сборке; в dev без env — текущее время; в production без env — пусто). */
export const BUILD_TIME = (() => {
  const s = process.env.REACT_APP_BUILD_TIME;
  if (s && /^\d{2}:\d{2}:\d{2}$/.test(s.trim())) return s.trim();
  if (process.env.NODE_ENV === 'production') return '';
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
})();
