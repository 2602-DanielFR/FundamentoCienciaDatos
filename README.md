# Detección de Emociones Faciales y Notificación por Correo

Este proyecto permite detectar emociones faciales en tiempo real usando la cámara web, y envía alertas por correo electrónico cuando se superan ciertos umbrales de emoción. Además, implementa un mecanismo de bloqueo para evitar múltiples notificaciones seguidas para la misma persona.

---

## Funcionalidad

- **Reconocimiento facial y detección de emociones** usando [face-api.js](https://github.com/justadudewhohacks/face-api.js).
- **Configuración de umbrales** para emociones (feliz, triste, enojado, sorprendido).
- **Envío automático de alertas por correo electrónico** cuando una emoción supera el umbral configurado.
- **Bloqueo de notificaciones**: mínimo 20 segundos entre alertas para la misma persona y emoción.
- **Interfaz web** para visualizar la cámara, los resultados y los mensajes de alerta.

---

## Configuración y Ejecución

### 1. Requisitos

- Node.js y npm instalados
- Python (para servir archivos estáticos con `python -m http.server`)
- Una cuenta de Gmail (se recomienda usar una contraseña de aplicación)

### 2. Clonar el repositorio

```sh
git clone -b v3.1 https://github.com/2602-DanielFR/FundamentoCienciaDatos.git
cd FundamentoCienciaDatos
```

### 3. Instalar dependencias del backend

```sh
npm install express body-parser cors nodemailer
```

### 4. Configurar el correo en `server.js`

Edita las siguientes líneas con tus datos reales y una contraseña de aplicación de Gmail:

```js
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "TU_CORREO@gmail.com",
    pass: "TU_CONTRASEÑA_DE_APLICACIÓN",
  },
});
```
Y en el campo `to`, pon el destinatario deseado.

### 5. Ejecutar el backend

```sh
node server.js
```

### 6. Ejecutar el frontend

En otra terminal, ejecuta:

```sh
python -m http.server
```

Abre tu navegador en [http://localhost:8000](http://localhost:8000).

---

## Uso

1. Haz clic en "Start Camera" y luego en "Start Emotion Detection".
2. Cuando una emoción supere el umbral configurado (por defecto 1), se enviará una alerta por correo.
3. No se enviarán múltiples alertas para la misma persona/emoción en menos de 20 segundos.

---

## Ideas para Mejoras Futuras

- **Persistencia en base de datos:**  
  Guardar las alertas y registros de detección en una base de datos (por ejemplo, MongoDB o SQLite) para análisis posterior.
- **Panel de administración:**  
  Visualizar el historial de alertas y estadísticas desde una interfaz web.
- **Soporte multiusuario:**  
  Permitir la gestión de múltiples cámaras o usuarios.
- **Notificaciones adicionales:**  
  Integrar notificaciones por SMS, Telegram, Slack, etc.
- **Entrenamiento personalizado:**  
  Permitir registrar y entrenar caras específicas para mejorar la precisión.

---

## Notas de Seguridad

- Usa siempre contraseñas de aplicación para el envío de correos.
- No compartas tus credenciales en repositorios públicos.

---

## Autor

- 