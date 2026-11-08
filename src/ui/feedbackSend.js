import emailjs from '@emailjs/browser';

export const FEEDBACK_RECIPIENT = 'anh dev đẹp trai';

export function feedbackTemplateParams({ message, cafeName, playerName, day } = {}) {
  const lines = [String(message ?? '').trim()];
  const context = [];
  if (cafeName) context.push(`Tiệm: ${cafeName}`);
  if (playerName) context.push(`Người chơi: ${playerName}`);
  if (day != null && day !== '') context.push(`Ngày: ${day}`);
  if (context.length) lines.push('', '---', ...context);
  return {
    to_name: FEEDBACK_RECIPIENT,
    subject: 'Góp ý Internet Café Tycoon',
    message: lines.join('\n')
  };
}

export function readEmailJsConfig(env = import.meta.env) {
  return {
    publicKey: env?.VITE_EMAILJS_PUBLIC_KEY?.trim() ?? '',
    serviceId: env?.VITE_EMAILJS_SERVICE_ID?.trim() ?? '',
    templateId: env?.VITE_EMAILJS_TEMPLATE_ID?.trim() ?? ''
  };
}

export async function sendFeedback(input, deps = {}) {
  const text = String(input?.message ?? '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  const config = deps.config ?? readEmailJsConfig(deps.env);
  if (!config.publicKey || !config.serviceId || !config.templateId) {
    return { ok: false, reason: 'config' };
  }
  const templateParams = feedbackTemplateParams(input);
  const send = deps.send ?? emailjs.send.bind(emailjs);
  try {
    await send(config.serviceId, config.templateId, templateParams, {
      publicKey: config.publicKey
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.status === 429 ? 'limit' : 'send' };
  }
}
