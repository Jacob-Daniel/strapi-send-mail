import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
  Alert,
  Loader,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

// ── Types ──────────────────────────────────────────────────────────────────

interface PluginSettings {
  collection: string;
  emailField: string;
  statusField: string;
  activeValue: string;
  tokenField: string;
}

interface Collection {
  uid: string;
  displayName: string;
}

interface CollectionField {
  name: string;
  type: string;
  enum: string[] | null;
}

const DEFAULT_SETTINGS: PluginSettings = {
  collection: 'api::subscriber.subscriber',
  emailField: 'email',
  statusField: 'subscribedStatus',
  activeValue: 'active',
  tokenField: 'unsubscribeToken',
};

// ── Component ──────────────────────────────────────────────────────────────

const HomePage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  // ── Existing send state (unchanged) ──────────────────────────────────────
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [status, setStatus] = useState<null | 'success' | 'error'>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ── Settings state ────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [fields, setFields] = useState<CollectionField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // ── Existing effects (unchanged) ─────────────────────────────────────────
  useEffect(() => {
    get('/send-mail/groups')
      .then(({ data }) => setGroups(data))
      .catch(() => {});
    get('/send-mail/templates')
      .then(({ data }) => setTemplates(data))
      .catch(() => {});
  }, []);

  // ── Settings effects ──────────────────────────────────────────────────────
  useEffect(() => {
    get('/send-mail/settings')
      .then(({ data }) => {
        const s = { ...DEFAULT_SETTINGS, ...data };
        setSettings(s);
        setSavedSettings(s);
      })
      .catch(() => {});

    get('/send-mail/collections')
      .then(({ data }) => setCollections(data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings.collection) return;
    setLoadingFields(true);
    get(`/send-mail/collections/${encodeURIComponent(settings.collection)}/fields`)
      .then(({ data }) => setFields(data ?? []))
      .catch(() => setFields([]))
      .finally(() => setLoadingFields(false));
  }, [settings.collection]);

  // ── Existing send handler (unchanged) ─────────────────────────────────────
  const handleSend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data } = await post('/send-mail/send', { groupId, templateId });
      setResult(data);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Settings handlers ─────────────────────────────────────────────────────
  const updateSetting = (key: keyof PluginSettings, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'collection') {
        next.emailField = '';
        next.statusField = '';
        next.activeValue = '';
        next.tokenField = '';
      }
      if (key === 'statusField') {
        next.activeValue = '';
      }
      return next;
    });
    setSettingsDirty(true);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data } = await post('/send-mail/settings', settings);
      const saved = { ...DEFAULT_SETTINGS, ...data };
      setSettings(saved);
      setSavedSettings(saved);
      setSettingsDirty(false);
      toggleNotification({ type: 'success', message: 'Settings saved' });
    } catch {
      toggleNotification({ type: 'warning', message: 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const scalarFields = fields.filter((f) => ['string', 'email', 'text', 'uid'].includes(f.type));
  const activeValueOptions: string[] =
    fields.find((f) => f.name === settings.statusField)?.enum ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box padding={8} background="neutral100">
      <Box paddingBottom={6}>
        <Typography variant="alpha">Send Mail</Typography>
      </Box>

      <Tabs.Root defaultValue="send">
        <Tabs.List aria-label="Send Mail tabs">
          <Tabs.Trigger value="send">Send</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings{settingsDirty ? ' ●' : ''}</Tabs.Trigger>
        </Tabs.List>

        {/* ── SEND TAB — original UI, completely unchanged ─────────────── */}
        <Tabs.Content value="send">
          <Box paddingTop={6}>
            <Box
              background="neutral0"
              padding={6}
              shadow="tableShadow"
              hasRadius
              style={{ maxWidth: 480 }}
            >
              <Box paddingBottom={4}>
                <Field.Root name="group">
                  <Field.Label>Recipient Group</Field.Label>
                  <SingleSelect
                    placeholder="Select a group..."
                    value={groupId}
                    onChange={(val: string) => setGroupId(val)}
                  >
                    {groups.map((g: any) => (
                      <SingleSelectOption key={g.documentId} value={g.documentId}>
                        {g.name}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
              </Box>
              <Box paddingBottom={6}>
                <Field.Root name="template">
                  <Field.Label>Email Template</Field.Label>
                  <SingleSelect
                    placeholder="Select a template..."
                    value={templateId}
                    onChange={(val: string) => setTemplateId(val)}
                  >
                    {templates.map((t: any) => (
                      <SingleSelectOption key={t.documentId} value={t.documentId}>
                        {t.name}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
              </Box>
              <Button
                onClick={handleSend}
                disabled={!groupId || !templateId || loading}
                loading={loading}
                size="L"
                fullWidth
              >
                Send Emails
              </Button>
              {status === 'success' && (
                <Box paddingTop={4}>
                  <Alert variant="success" title="Emails sent!">
                    {result?.sent} sent · {result?.failed} failed
                  </Alert>
                </Box>
              )}
              {status === 'error' && (
                <Box paddingTop={4}>
                  <Alert variant="danger" title="Send failed">
                    Check the server logs for details.
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </Tabs.Content>

        {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
        <Tabs.Content value="settings">
          <Box paddingTop={6}>
            <Box
              background="neutral0"
              padding={6}
              shadow="tableShadow"
              hasRadius
              style={{ maxWidth: 640 }}
            >
              <Flex justifyContent="space-between" alignItems="center" paddingBottom={6}>
                <Box>
                  <Typography variant="beta">Subscriber Collection</Typography>
                  <Box paddingTop={1}>
                    <Typography variant="pi" textColor="neutral600">
                      Choose which collection stores subscribers and map its fields.
                    </Typography>
                  </Box>
                </Box>
                <Button
                  startIcon={<Check />}
                  loading={savingSettings}
                  disabled={!settingsDirty || savingSettings}
                  onClick={handleSaveSettings}
                >
                  Save
                </Button>
              </Flex>

              {/* Collection picker */}
              <Box paddingBottom={4}>
                <Field.Root name="collection">
                  <Field.Label>Collection</Field.Label>
                  <SingleSelect
                    placeholder="Select a collection..."
                    value={settings.collection}
                    onChange={(val: string) => updateSetting('collection', val)}
                  >
                    {collections.map((c) => (
                      <SingleSelectOption key={c.uid} value={c.uid}>
                        {c.displayName}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
              </Box>

              {loadingFields && (
                <Flex justifyContent="center" padding={4}>
                  <Loader small>Loading fields…</Loader>
                </Flex>
              )}

              {!loadingFields && fields.length > 0 && (
                <Grid.Root gap={4}>
                  {/* Email field */}
                  <Grid.Item col={6}>
                    <Field.Root name="emailField">
                      <Field.Label>Email Field</Field.Label>
                      <SingleSelect
                        placeholder="Select field..."
                        value={settings.emailField}
                        onChange={(val: string) => updateSetting('emailField', val)}
                      >
                        {scalarFields.map((f) => (
                          <SingleSelectOption key={f.name} value={f.name}>
                            {f.name}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Field.Root>
                  </Grid.Item>

                  {/* Token field */}
                  <Grid.Item col={6}>
                    <Field.Root name="tokenField">
                      <Field.Label>Unsubscribe Token Field</Field.Label>
                      <SingleSelect
                        placeholder="Select field..."
                        value={settings.tokenField}
                        onChange={(val: string) => updateSetting('tokenField', val)}
                      >
                        {scalarFields.map((f) => (
                          <SingleSelectOption key={f.name} value={f.name}>
                            {f.name}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Field.Root>
                  </Grid.Item>

                  {/* Status field */}
                  <Grid.Item col={6}>
                    <Field.Root name="statusField">
                      <Field.Label>Status Field</Field.Label>
                      <SingleSelect
                        placeholder="Select field..."
                        value={settings.statusField}
                        onChange={(val: string) => updateSetting('statusField', val)}
                      >
                        {fields.map((f) => (
                          <SingleSelectOption key={f.name} value={f.name}>
                            {f.name}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Field.Root>
                  </Grid.Item>

                  {/* Active value — dropdown if enum, free text otherwise */}
                  <Grid.Item col={6}>
                    <Field.Root name="activeValue">
                      <Field.Label>Active Status Value</Field.Label>
                      {activeValueOptions.length > 0 ? (
                        <SingleSelect
                          placeholder="Select value..."
                          value={settings.activeValue}
                          onChange={(val: string) => updateSetting('activeValue', val)}
                        >
                          {activeValueOptions.map((v) => (
                            <SingleSelectOption key={v} value={v}>
                              {v}
                            </SingleSelectOption>
                          ))}
                        </SingleSelect>
                      ) : (
                        <TextInput
                          placeholder="e.g. active"
                          value={settings.activeValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateSetting('activeValue', e.target.value)
                          }
                        />
                      )}
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              )}

              {/* Read-only summary of what's currently saved */}
              {!settingsDirty && (
                <Box background="neutral100" padding={4} hasRadius marginTop={6}>
                  <Typography variant="sigma" textColor="neutral600">
                    Active config
                  </Typography>
                  <Box paddingTop={2}>
                    {Object.entries(savedSettings).map(([k, v]) => (
                      <Flex key={k} gap={2} paddingTop={1}>
                        <Typography variant="pi" textColor="neutral500">
                          {k}:
                        </Typography>
                        <Typography variant="pi" fontWeight="bold">
                          {v || '—'}
                        </Typography>
                      </Flex>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};

export { HomePage };
