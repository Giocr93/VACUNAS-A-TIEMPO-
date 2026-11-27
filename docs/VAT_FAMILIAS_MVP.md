# VAT Familias · MVP

## Objetivo

Convertir el actual Portal Familiar en una experiencia instalable para familias sin depender de adopción institucional. La familia podrá crear una cuenta, registrar hijos/dependientes, capturar antecedentes de vacunación y conservar su cartilla digital.

Los registros familiares **no se consideran verificados** hasta que un profesional los revise.

## Estados visibles

- 🟡 Capturado por la familia
- 🟠 Pendiente de verificación
- 🟢 Verificado por personal de salud
- 🔵 Aplicado y registrado directamente por una unidad
- 🔴 Rechazado / requiere aclaración

## Primer MVP

1. Registro/inicio de sesión de una cuenta familiar.
2. Agregar hijo o dependiente.
3. Capturar vacuna: vacuna, dosis, fecha, lote opcional, institución y notas.
4. Mostrar cartilla por edad.
5. Distinguir visualmente registros familiares de registros profesionales.
6. Vincular un hijo con Vacunas a Tiempo mediante QR/folio.
7. Nunca permitir que la familia edite una vacuna profesional verificada.

## Arquitectura

La versión profesional conserva:
- `patients`
- `vaccinations`
- `vaccine_catalog`
- `family_portal_access`

VAT Familias añade:
- `family_accounts`
- `family_members`
- `family_vaccine_entries`
- `family_evidence`
- `family_links`

La información capturada por una familia vive separada. Solo tras una verificación explícita puede vincularse con `vaccinations`.

## Compatibilidad con el Portal Familiar existente

Los QR/folios existentes deben seguir funcionando. Cuando una familia llegue por un QR antiguo:
- si no tiene cuenta, podrá visualizar como hoy y se le ofrecerá crear VAT Familias;
- si crea cuenta, podrá vincular ese paciente;
- si ya tiene cuenta, podrá añadirlo a su familia sin duplicar el expediente profesional.

## Fase posterior

- Foto de cartilla y evidencia.
- OCR asistido para proponer vacuna/dosis/fecha, siempre con confirmación humana.
- Recordatorios y próximas dosis.
- Compartir cartilla temporalmente por QR.
- Bandeja profesional de verificación.
- Invitación de segundo tutor/cuidador.
- App Store / Google Play mediante empaquetado posterior si se decide.
