import { describe, expect, it, vi } from 'vitest';
import { feedbackTemplateParams, sendFeedback } from '../src/ui/feedbackSend.js';

const config = {
  publicKey: 'public-key',
  serviceId: 'service-id',
  templateId: 'template-id'
};

describe('feedback emailjs', () => {
  it('packs the note for the template and leaves the inbox address out', () => {
    const params = feedbackTemplateParams({
      message: 'Máy bị kẹt lúc đóng cửa',
      cafeName: 'NET LAG ÍT',
      playerName: 'Minh',
      day: 3
    });
    expect(params.to_name).toBe('anh dev đẹp trai');
    expect(params.subject).toBe('Góp ý Internet Café Tycoon');
    expect(params.message).toContain('Máy bị kẹt lúc đóng cửa');
    expect(params.message).toContain('Tiệm: NET LAG ÍT');
    expect(params.message).toContain('Người chơi: Minh');
    expect(params.message).toContain('Ngày: 3');
    expect(JSON.stringify(params)).not.toMatch(/@/);
  });

  it('drops a blank note before calling EmailJS', async () => {
    const send = vi.fn();
    const result = await sendFeedback({ message: '   ' }, { send, config });
    expect(result).toEqual({ ok: false, reason: 'empty' });
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses to send when the EmailJS keys are missing', async () => {
    const send = vi.fn();
    const result = await sendFeedback(
      { message: 'Hay lắm' },
      { send, config: { publicKey: '', serviceId: '', templateId: '' } }
    );
    expect(result).toEqual({ ok: false, reason: 'config' });
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the template through EmailJS', async () => {
    const send = vi.fn().mockResolvedValue({ status: 200 });
    const result = await sendFeedback(
      { message: 'Hay lắm', cafeName: 'NET LAG ÍT' },
      { send, config }
    );
    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(
      'service-id',
      'template-id',
      expect.objectContaining({
        to_name: 'anh dev đẹp trai',
        message: expect.stringContaining('Hay lắm')
      }),
      { publicKey: 'public-key' }
    );
  });

  it('reports a failed send', async () => {
    const send = vi.fn().mockRejectedValue({ status: 500 });
    const result = await sendFeedback({ message: 'Hay lắm' }, { send, config });
    expect(result).toEqual({ ok: false, reason: 'send' });
  });
});
