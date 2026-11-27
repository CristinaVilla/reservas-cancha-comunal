# Reservas para una cancha comunal

Contrato inteligente en **Rust con Soroban** e interfaz web para consultar, habilitar, reservar y cancelar turnos de una cancha comunal.

## Problema

Cuando los equipos de una comunidad coordinan el uso de una cancha por WhatsApp, dos grupos pueden recibir confirmación para la misma hora en conversaciones distintas. Al llegar a la cancha, ambos esperan usarla y alguien tiene que resolver cuál reserva estaba confirmada.

Elegí este problema porque es fácil de reconocer en una comunidad de Costa Rica y tiene una regla concreta que se puede comprobar: **cada turno admite una sola reserva**. Además, una asociación puede necesitar dejar horas sin habilitar para actividades comunales o mantenimiento.

## Cómo funciona

La asociación habilita los turnos que pone a disposición de la comunidad. Cualquier persona puede consultar esos horarios. Un equipo puede reservar un turno habilitado y libre. Si otro equipo intenta reservarlo después, el contrato rechaza la solicitud. Solo la cuenta que hizo la reserva puede cancelarla antes de que empiece el turno.

Por ejemplo, si la asociación habilita el sábado a las 3:00 p. m., el equipo Alice puede reservar esa hora. Cuando el equipo Bob consulta el mismo turno, lo ve ocupado. Si Alice cancela, el turno vuelve a quedar disponible para Bob.

Los turnos duran **60 minutos** y empiezan en punto. La interfaz muestra la **hora de Costa Rica**. En el contrato, cada turno se identifica por su hora de inicio en segundos Unix, un formato numérico que permite comparar esa hora con el reloj de Stellar.

## Qué se puede probar

| Forma de prueba | Qué permite comprobar | Qué se necesita |
| --- | --- | --- |
| **Demo local** | El flujo de la interfaz con la asociación y dos equipos de ejemplo. | Node.js y un navegador. |
| **Pruebas del contrato** | Las reglas de reserva, los permisos, los errores y los eventos del contrato en Rust. | Rust y Cargo. |
| **Stellar Testnet** | Consultas y transacciones contra un contrato desplegado en la red de prueba de Stellar. | Para consultar, basta la web. Para modificar un turno, se necesita Varial y XLM de prueba. |

La **Demo local** usa datos simulados que se reinician al recargar la página. **Stellar Testnet** ejecuta el contrato desplegado y registra las operaciones confirmadas en la red de prueba.

## 1. Descargar el proyecto

En GitHub, seleccioná la rama **`main`**. Hacé clic en **Code → Download ZIP** y descomprimí el archivo. Abrí en VS Code la carpeta que contiene `Cargo.toml`, `README.md`, `src/` y `web/`.

En VS Code, elegí **Terminal → New Terminal**. En Windows, los comandos de esta guía se pueden ejecutar en **PowerShell**. Cada sección indica desde qué carpeta ejecutarlos.

## 2. Abrir y probar la interfaz local

Instalá [Node.js](https://nodejs.org/) **22.12 o superior dentro de la serie 22, o la versión 24**. Después de instalarlo, abrí una terminal nueva.

Desde la carpeta que contiene `Cargo.toml`, ejecutá:

```powershell
node --version
npm --version
cd web
npm ci
npm run dev
```

`npm ci` instala las dependencias usando las versiones registradas en `package-lock.json`. `npm run dev` inicia Vite, el servidor local de la interfaz.

Abrí en el navegador la dirección que aparece junto a **`Local:`**. Dejá la terminal abierta mientras usás la página. Para detener el servidor, presioná **Ctrl+C** en esa terminal.

Si en Windows aparece `EACCES` al iniciar Vite, desde la carpeta `web` ejecutá:

```powershell
.\node_modules\.bin\vite.cmd --host 127.0.0.1 --port 0
```

El puerto `0` permite que Windows elija uno disponible. Usá la dirección que aparezca junto a **`Local:`**.

### Probar como asociación y como equipo

En la página, seleccioná **Demo local**, elegí una **fecha futura** y mantené seleccionado el mismo turno durante la prueba.

| Paso | Acción | Resultado esperado |
| --- | --- | --- |
| 1 | Elegí **Asociación** en **Actuar como** y presioná **Habilitar turno**. | El turno pasa de **Sin habilitar** a **Disponible**. |
| 2 | Cambiá a **Equipo Alice** y presioná **Reservar turno**. | El turno muestra **Tu reserva**. |
| 3 | Cambiá a **Equipo Bob**. | El turno muestra **Reservado** y Bob no tiene el botón para cancelarlo. |
| 4 | Volvé a **Equipo Alice** y presioná **Cancelar reserva**. | El turno vuelve a **Disponible**. |
| 5 | Cambiá a **Equipo Bob** y reservá ese mismo turno. | Bob ve **Tu reserva**. |

Para comprobar que la interfaz también compila para distribución, ejecutá `npm run build` desde `web`. El resultado se guarda en `web/dist/`.

## 3. Ejecutar las pruebas del contrato en Rust

Instalá [Rust con rustup](https://rust-lang.org/tools/install/). Si el instalador de Windows pide herramientas de C++, instalá **Build Tools for Visual Studio** con la opción **Desarrollo para el escritorio con C++**. Después, completá la instalación de Rust y abrí una terminal nueva.

Abrí la terminal en la carpeta que contiene `Cargo.toml`. Si estás dentro de `web`, primero ejecutá `cd ..`.

```powershell
cargo --version
cargo test --locked
```

La primera ejecución puede tardar unos minutos porque Cargo descarga y compila las dependencias. El resultado esperado es **`10 passed; 0 failed`**.

| Caso probado | Resultado esperado |
| --- | --- |
| Una cuenta ajena intenta habilitar un turno. | La operación falla. Con la autorización de la asociación, el turno sí se habilita. |
| Un equipo intenta reservar un turno sin habilitar. | El contrato devuelve `SlotNotOpen`. |
| Dos equipos intentan reservar el mismo turno. | La segunda reserva falla con `SlotTaken`. |
| Otra cuenta intenta cancelar una reserva. | El contrato devuelve `NotOwner` y conserva la reserva. |
| La cuenta titular cancela antes del inicio. | El turno se libera y otro equipo puede reservarlo. |
| Se adelanta el reloj del ledger hasta el inicio del turno. | El contrato devuelve `SlotAlreadyStarted` al intentar cancelar. |
| Se habilita, reserva o cancela un turno. | Cada cambio exitoso emite un evento. Un intento de doble reserva rechazado no emite un evento de reserva. |

Para ejecutar solo la prueba de doble reserva:

```powershell
cargo test --locked rejects_double_booking_and_accepts_a_different_hour
```

Para probar solo los eventos:

```powershell
cargo test --locked emits_events_only_after_successful_changes
```

## 4. Ver el contrato en Stellar Testnet

El [contrato de ejemplo en Stellar Lab](https://lab.stellar.org/r/testnet/contract/CCP5V3MMD75BC3YDWAHJMAVMSO27BIRXY4VGTDQ75Y2TOQ5N4HVSIQZ5) permite inspeccionar el despliegue, las funciones y los eventos. Su dirección empieza con `C` y es el **ID del contrato**. La dirección de una cuenta de Varial empieza con `G`.

Para consultar desde la interfaz:

1. Abrí la web y seleccioná **Stellar Testnet**.
2. Dejá el ID de ejemplo o pegá el ID de otro despliegue de este proyecto.
3. Presioná **Cargar contrato** y elegí una fecha. Podés consultar horarios sin conectar Varial.
4. Si aparece **Sin habilitar**, la asociación todavía no abrió ese turno. Para habilitar horarios con tu propia cuenta, seguí la sección siguiente.

### Preparar Varial para firmar

1. Abrí Varial, seleccioná **Testnet** y copiá tu dirección pública `G…`.
2. Abrí [Stellar Lab](https://lab.stellar.org/), verificá que diga **Testnet** y entrá a **Account → Fund account**.
3. Pegá tu dirección pública y presioná **Fund** en la tarjeta de **XLM**. Friendbot acredita XLM de prueba para pagar las comisiones de Testnet. Solo requiere la dirección pública.
4. Volvé a la web y presioná **Conectar Varial**. Si cambiás de cuenta, presioná **Actualizar cuenta Varial**.

Si aparece `Account not found` al intentar reservar, verificá que la dirección conectada sea la misma que recibió XLM de prueba.

## 5. Compilar y desplegar con tu cuenta como administradora

Este paso permite probar todo el flujo en Testnet, incluida la habilitación de turnos. Podés dejar Vite corriendo y abrir **otra terminal** en la carpeta que contiene `Cargo.toml`.

Instalá [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install-cli). En Windows, podés usar PowerShell:

```powershell
winget install --id Stellar.StellarCLI
```

Una vez instalado, abrí una terminal nueva en la raíz del proyecto y ejecutá:

```powershell
stellar --version
rustup target add wasm32v1-none
stellar contract build --locked
```

La compilación genera `target/wasm32v1-none/release/reservas_cancha_comunal.wasm`. Ese archivo contiene el contrato compilado que se sube a Stellar.

Si todavía no creaste una identidad del CLI para pagar el despliegue, creala con este comando:

```powershell
stellar keys generate cancha-admin --network testnet --fund
```

Si ya existe, podés comprobar su dirección con `stellar keys address cancha-admin` y reutilizarla si tiene XLM de prueba.

En la misma terminal, ejecutá:

```powershell
$admin = Read-Host "Pegá la dirección pública de tu cuenta Varial de Testnet"
stellar contract deploy --wasm target/wasm32v1-none/release/reservas_cancha_comunal.wasm --source cancha-admin --network testnet -- --admin $admin
```

- `--source cancha-admin` identifica la cuenta del CLI que firma y paga el despliegue.
- `--admin $admin` registra como administradora la cuenta de Varial que podrá habilitar turnos desde la web.

Copiá el **nuevo ID `C…`** que devuelve Stellar CLI.

### Probar el flujo real en Testnet

1. En la interfaz, elegí **Stellar Testnet**, pegá el nuevo ID y presioná **Cargar contrato**.
2. Conectá la cuenta de Varial que usaste como `--admin`. Junto a la dirección debería aparecer **Asociación**.
3. Elegí una fecha futura y un turno **Sin habilitar**. Presioná **Habilitar turno**, confirmá en Varial y esperá a que aparezca **Disponible**.
4. Para demostrar los dos roles, cambiá en Varial a otra cuenta de Testnet con XLM de prueba y presioná **Actualizar cuenta Varial**. Seleccioná ese mismo turno, presioná **Reservar turno** y confirmá. Debería aparecer **Tu reserva**.
5. Con la cuenta que reservó, presioná **Cancelar reserva** y confirmá. El turno debería volver a **Disponible**.

Después de cada operación confirmada, **Ver transacción** abre su registro en el explorador de Testnet. Ahí podés verificar qué operación se registró. Para probar una doble reserva de forma reproducible, usá la prueba de Rust de la sección 3. La interfaz muestra el turno ocupado cuando ya conoce la reserva.

### Evidencia de mi prueba

Probé la habilitación de horarios en Testnet usando mi cuenta de Varial como administradora. También probé la reserva desde la interfaz con confirmación en Varial.

- **Mi despliegue en Testnet:** https://lab.stellar.org/r/testnet/contract/CBXMSB7MKULBQVNBFBPQXPEKASHZ54666VWFUNEEUVUZIBNAYXCCAYDG

- **Transacción de habilitación:** https://stellar.expert/explorer/testnet/tx/b21f3068b6ea40827bf0a7d3fbd4c071664a494b4ad0a6afa3974505f7de4723

## Cómo se aplicó lo aprendido en clase

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib.rs` | Contiene las funciones públicas y las reglas para habilitar, reservar, cancelar y consultar. |
| `src/storage.rs` | Define las claves de almacenamiento y la renovación del TTL, que controla cuánto tiempo se mantienen activas las entradas en Stellar. |
| `src/types.rs` | Define `Slot`, el tipo con el estado del turno y la dirección que lo reservó, si existe. |
| `src/errors.rs` | Define los errores que permiten distinguir casos como un turno ocupado o sin habilitar. |
| `src/events.rs` | Define los eventos de habilitación, reserva y cancelación. Cada evento identifica el turno por su hora de inicio. |
| `src/test.rs` | Prueba el contrato con el cliente de Soroban. Usa llamadas `try_` para revisar errores específicos y adelanta el reloj del ledger para probar los límites de tiempo. |
| `web/bindings/src/index.ts` | Cliente TypeScript generado por Stellar CLI a partir del Wasm, como en el ejercicio de integración con el frontend. |
| `web/src/stellar.js` | Conecta la interfaz con el cliente generado y solicita a Varial la firma de los cambios en Testnet. |

El contrato usa `require_auth()` para comprobar quién autoriza los cambios. El **timestamp del ledger** determina si el turno ya empezó. El **TTL**, medido en ledgers, controla cuándo se archivan los datos en Stellar. Son dos reglas distintas: renovar el TTL de un registro no cambia la fecha de la reserva.

### Regenerar el cliente TypeScript

El proyecto ya incluye el cliente generado. Si modificás las funciones o los tipos del contrato, compilá de nuevo y ejecutá estos comandos desde la raíz:

```powershell
stellar contract build --locked
stellar contract bindings typescript --wasm target/wasm32v1-none/release/reservas_cancha_comunal.wasm --output-dir web/bindings --overwrite
```

## Alcance

Este proyecto es un ejercicio individual del **Pura Vida Bootcamp**. Modela una cancha comunal y la habilitación individual de sus turnos. La aplicación permite cancelar reservas antes de que empiecen. Una vez habilitado un turno, la asociación no cuenta con una operación para cerrarlo. Las pruebas de red se hacen en **Stellar Testnet**.

