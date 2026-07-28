/**
 * POST /api/contact
 *
 * Cloudflare Pages Function que actúa como proxy entre el formulario de
 * contacto del sitio y notifications-service (forms.arixem.com.mx).
 *
 * La API key nunca llega al navegador: vive como variable de entorno
 * encriptada en Cloudflare Pages (Settings → Environment variables →
 * NOTIFICATIONS_KEY) y sólo se usa aquí, servidor a servidor.
 */

const UPSTREAM_URL = "https://forms.arixem.com.mx/contact";
const SITE_ID = "arixem_mx";
const SOURCE = "web";

const REQUIRED_FIELDS = ["name", "email"];
const OPTIONAL_STRING_FIELDS = [
    "company",
    "phone",
    "area",
    "situation",
    "has_data_sources",
    "message",
];

function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status: status,
        headers: { "Content-Type": "application/json" },
    });
}

function isValidEmail(value) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

export async function onRequestPost(context) {
    const { request, env } = context;

    if (!env.NOTIFICATIONS_KEY) {
        // Falta configurar el secreto en Cloudflare Pages: no hay forma de
        // reenviar la petición. Falla de forma controlada, sin exponer detalle.
        return jsonResponse(500, { message: "El formulario no está disponible en este momento." });
    }

    let payload;
    try {
        payload = await request.json();
    } catch (err) {
        return jsonResponse(400, { message: "Solicitud inválida." });
    }

    if (!payload || typeof payload !== "object") {
        return jsonResponse(400, { message: "Solicitud inválida." });
    }

    for (const field of REQUIRED_FIELDS) {
        if (typeof payload[field] !== "string" || payload[field].trim() === "") {
            return jsonResponse(400, { message: "Faltan campos requeridos." });
        }
    }

    if (!isValidEmail(payload.email)) {
        return jsonResponse(400, { message: "El correo electrónico es inválido." });
    }

    // Nunca se confía en lo que el cliente mande para site/source: se fijan aquí.
    const upstreamBody = {
        site: SITE_ID,
        source: SOURCE,
        name: payload.name.trim(),
        email: payload.email.trim(),
    };

    for (const field of OPTIONAL_STRING_FIELDS) {
        if (typeof payload[field] === "string") {
            upstreamBody[field] = payload[field].trim();
        }
    }

    let upstreamResponse;
    try {
        upstreamResponse = await fetch(UPSTREAM_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Notifications-Key": env.NOTIFICATIONS_KEY,
            },
            body: JSON.stringify(upstreamBody),
        });
    } catch (err) {
        return jsonResponse(502, { message: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." });
    }

    if (upstreamResponse.ok) {
        return jsonResponse(200, { message: "Mensaje enviado correctamente. Te contactaremos pronto." });
    }

    if (upstreamResponse.status === 400 || upstreamResponse.status === 422) {
        // Error de validación del lado del servicio (p. ej. un valor de
        // enum que no coincide) — no se filtra el detalle del upstream.
        return jsonResponse(400, { message: "Revisa los datos del formulario e intenta de nuevo." });
    }

    return jsonResponse(502, { message: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." });
}

export async function onRequestGet() {
    return jsonResponse(405, { message: "Método no permitido." });
}
