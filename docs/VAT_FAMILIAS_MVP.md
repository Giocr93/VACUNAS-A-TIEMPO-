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


## Principio de diseño: captura asistida

VAT Familias debe estar diseñado para personas con poca experiencia tecnológica. La captura no debe sentirse como llenar un formulario clínico.

### Flujo recomendado

1. Elegir al hijo.
2. Tocar **Agregar vacuna**.
3. La app pregunta: **¿Tienes la cartilla a la mano?**
   - Sí, tengo la cartilla.
   - No, quiero registrar lo que recuerdo.
4. Si tiene cartilla:
   - opción principal: **Tomar foto de la cartilla**;
   - opción secundaria: **Capturar manualmente**.
5. La app propone los datos detectados o guía una pregunta por pantalla:
   - ¿Qué vacuna aparece?
   - ¿Qué fecha tiene?
   - ¿Dice primera, segunda, tercera o refuerzo?
   - ¿Ves un número de lote? → Sí / No.
6. Antes de guardar, mostrar una tarjeta resumen grande:
   - vacuna;
   - dosis;
   - fecha;
   - lote si existe;
   - origen: Capturado por la familia.
7. Botones grandes:
   - **Sí, guardar**
   - **Corregir**

### Reglas de simplicidad

- Una pregunta principal por pantalla.
- Botones grandes y texto cotidiano, no técnico.
- No exigir lote, fabricante, vía, sitio ni institución para poder guardar.
- Mostrar **No sé / No aparece** como opción válida.
- Autocompletar lo posible según edad y esquema, pero nunca inventar datos.
- Las sugerencias de la app deben confirmarse por el usuario.
- Mantener un **Modo manual avanzado** para quienes sí quieran capturar más detalles.
- La foto de cartilla debe ser el camino preferido en una fase posterior.
