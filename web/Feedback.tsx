import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, Select, Textarea } from './ui';
import { api } from './client';
import { useLanguage } from './i18n';

const CATEGORIES = ['Bug', 'Suggestion', 'Other'] as const;

export default function Feedback() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError(t('feedback.messageRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/feedback', { category, message: message.trim() });
      setDone(true);
    } catch {
      setError(t('admin.errorLoad'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <span className="text-3xl text-emerald-600 dark:text-emerald-300" aria-hidden>
            ✓
          </span>
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{t('feedback.thankYou')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('feedback.thankYouHint')}</p>
        <Button className="mt-6 w-full" onClick={() => navigate('/profile')}>
          {t('feedback.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('feedback.title')}</h1>
      <Card className="mt-3 p-4">
        <form onSubmit={submit} className="space-y-3">
          <Field label={t('feedback.category')}>
            <Select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
              <option value="Bug">{t('feedback.bug')}</option>
              <option value="Suggestion">{t('feedback.suggestion')}</option>
              <option value="Other">{t('feedback.other')}</option>
            </Select>
          </Field>
          <Field label={t('feedback.message')}>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={t('feedback.messagePlaceholder')}
              autoFocus
            />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t('feedback.submitting') : t('feedback.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
