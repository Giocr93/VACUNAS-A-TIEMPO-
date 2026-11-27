# Vacunas a Tiempo · rama de despliegue segura

Esta rama reconstruye la base actualmente publicada (v2.3.4.18) y aplica únicamente los cambios validados hasta v2.3.4.24.

Motivo: el repositorio histórico solo contiene v1.9.5; esta rama permite conectar Netlify sin publicar esa versión antigua.

La compilación falla deliberadamente si la base pública ya no coincide con v2.3.4.18, evitando aplicar parches sobre una versión inesperada.

Corrección crítica 2.3.4.24: elimina la publicación masiva del Portal Familiar al iniciar y reemplaza lecturas completas del padrón por consultas dirigidas al paciente actual.
