// ---------------------------------------------------------------------------
// nutrition_constants.ts — Multiplicadores de periodización nutricional
// ---------------------------------------------------------------------------
// Fuente de verdad para los factores que ajustan kcal y macros según
// la intensidad del día. Todos los archivos de dominio importan de aquí.

/** Multiplicador de kcal para días LOW respecto a targetKcalEasy */
export const LOW_KCAL_MULTIPLIER = 0.88

/** Multiplicador de carbos para días LOW respecto a carbsEasyG */
export const LOW_CARBS_MULTIPLIER = 0.75

/** Multiplicador de carbos para días REST respecto a carbsEasyG */
export const REST_CARBS_MULTIPLIER = 0.7
