/** Размер клетки видимой сетки = 1 шаг перемещения виджета (в логических координатах канвы). Увеличьте значение для более крупного шага. */
export const GRID_SIZE = 5;

/** Пикселей на одну логическую единицу канвы — фиксированный масштаб (квадраты не меняют размер при смене пропорций). */
export const PIXELS_PER_UNIT = 2;

export const snapToGrid = (value: number) =>
  Math.round(Math.round(value / GRID_SIZE) * GRID_SIZE);
