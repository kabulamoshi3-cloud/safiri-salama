import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings, saveSetting, Setting } from '../../services/api';

const SETTING_KEYS = [
  'base_fare_tzs',
  'per_km_rate_tzs',
  'per_minute_rate_tzs',
  'min_fare_tzs',
  'driver_search_radius_km',
  'trip_request_timeout_minutes',
];

export default function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setLoading(true);
    getSettings()
      .then((d) => {
        const map: Record<string, string> = {};
        d.settings.forEach((s: Setting) => {
          map[s.key] = s.value;
        });
        setSettings({ ...map });
        setOriginal({ ...map });
      })
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      // Save only changed values
      const changed = SETTING_KEYS.filter(
        (k) => settings[k] !== undefined && settings[k] !== original[k]
      );
      if (changed.length === 0) {
        setMessage(t('saved_successfully'));
        setMessageType('success');
        setSaving(false);
        return;
      }
      await Promise.all(changed.map((k) => saveSetting(k, settings[k])));
      setOriginal({ ...settings });
      setMessage(t('saved_successfully'));
      setMessageType('success');
    } catch {
      setMessage(t('save_error'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--color-red)' }}>{error}</div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '20px' }}>{t('settings_title')}</h1>

      <div
        style={{
          background: 'var(--color-card-bg)',
          borderRadius: '10px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '28px',
          maxWidth: '540px',
        }}
      >
        {SETTING_KEYS.map((key) => (
          <div key={key} style={{ marginBottom: '20px' }}>
            <label
              htmlFor={`setting-${key}`}
              style={{
                display: 'block',
                fontWeight: 600,
                fontSize: '13px',
                marginBottom: '6px',
                color: 'var(--color-text-primary)',
              }}
            >
              {t(`setting_${key}`)}
            </label>
            <input
              id={`setting-${key}`}
              type="number"
              min="0"
              step="1"
              value={settings[key] ?? ''}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, [key]: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '9px 12px',
                border: `1px solid ${
                  settings[key] !== original[key]
                    ? 'var(--color-accent)'
                    : 'var(--color-border)'
                }`,
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        ))}

        {message && (
          <p
            role="status"
            style={{
              marginBottom: '16px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              background:
                messageType === 'success'
                  ? 'var(--color-green-bg)'
                  : 'var(--color-red-bg)',
              color:
                messageType === 'success'
                  ? 'var(--color-green)'
                  : 'var(--color-red)',
            }}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            background: saving ? '#ccc' : 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {saving ? t('loading') : t('save_all')}
        </button>
      </div>
    </div>
  );
}
