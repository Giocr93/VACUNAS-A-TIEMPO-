# VAT Familias · prototipo funcional local

Este directorio contiene el primer prototipo navegable del MVP.

Incluye:
- bienvenida y alta de cuenta familiar;
- pantalla Mi familia;
- alta de hijo/dependiente;
- cartilla digital;
- captura manual de antecedentes de vacuna;
- estados visuales familia / pendiente / verificada / unidad de salud;
- pantalla placeholder para vinculación QR/folio;
- PWA básica instalable;
- persistencia temporal con localStorage.

## Importante

Este prototipo **no usa Supabase todavía** y no modifica datos reales.
La finalidad es validar el flujo y la interfaz antes de aplicar la migración
`supabase/migrations/20261126_vat_familias_mvp_draft.sql`.

Los datos del prototipo se guardan exclusivamente en el navegador/dispositivo.
