import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
  Alert,
  Loader,
} from '@strapi/design-system';
import { ArrowClockwise, Check } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

// ── Types ──────────────────────────────────────────────────────────────────

interface PluginSettings {
  collection: string;
  emailField: string;
  statusField: string;
  activeValue: string;
  tokenField: string;
  batchSize: number;
  delayMs: number;
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

interface Campaign {
  documentId: string;
  name: string;
  status: 'sending' | 'sent' | 'failed';
  templateName: string | null;
  templateSubject: string | null;
  groupName: string | null;
  totalSent: number;
  totalFailed: number;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

interface UnsentInfo {
  count: number;
  campaignDocumentId: string | null;
}

const DEFAULT_SETTINGS: PluginSettings = {
  collection: 'api::subscriber.subscriber',
  emailField: 'email',
  statusField: 'subscribedStatus',
  activeValue: 'active',
  tokenField: 'unsubscribeToken',
  batchSize: 50,
  delayMs: 1000,
};

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  sending: { bg: '#f0c000', text: '#4a3800' },
  sent: { bg: '#328048', text: '#ffffff' },
  failed: { bg: '#d02b20', text: '#ffffff' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_STYLES[status] ?? { bg: '#8e8ea9', text: '#ffffff' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        backgroundColor: s.bg,
        color: s.text,
      }}
    >
      {status}
    </span>
  );
};

// ── Component ──────────────────────────────────────────────────────────────

const HomePage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  // ── Send state ────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [enqueueing, setEnqueueing] = useState(false);
  const [enqueueResult, setEnqueueResult] = useState<{ queued: number } | null>(null);

  // Unsent rows for the selected group
  const [unsentInfo, setUnsentInfo] = useState<UnsentInfo | null>(null);
  const [loadingUnsent, setLoadingUnsent] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // ── Campaigns state ───────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // ── Settings state ────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [collectionsError, setCollectionsError] = useState(false);
  const [fields, setFields] = useState<CollectionField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState(false);

  // ── Load groups + templates ───────────────────────────────────────────────
  useEffect(() => {
    get('/send-mail/groups')
      .then(({ data }) => setGroups(data))
      .catch(() => {});
    get('/send-mail/templates')
      .then(({ data }) => setTemplates(data))
      .catch(() => {});
  }, []);

  // ── Load settings + collections ───────────────────────────────────────────
  useEffect(() => {
    get('/send-mail/settings')
      .then(({ data }) => {
        const s = { ...DEFAULT_SETTINGS, ...data };
        setSettings(s);
        setSavedSettings(s);
      })
      .catch(() => {});

    setLoadingCollections(true);
    get('/send-mail/collections')
      .then(({ data }) => {
        setCollections(data ?? []);
        setCollectionsError(false);
      })
      .catch(() => setCollectionsError(true))
      .finally(() => setLoadingCollections(false));
  }, []);

  // ── Reload fields on collection change ────────────────────────────────────
  useEffect(() => {
    if (!settings.collection) {
      setFields([]);
      return;
    }
    setLoadingFields(true);
    setFieldsError(false);
    get(`/send-mail/collections/${encodeURIComponent(settings.collection)}/fields`)
      .then(({ data }) => {
        setFields(data ?? []);
        setFieldsError(false);
      })
      .catch(() => {
        setFields([]);
        setFieldsError(true);
      })
      .finally(() => setLoadingFields(false));
  }, [settings.collection]);

  // ── Check unsent rows when group changes ─────────────────────────────────
  useEffect(() => {
    if (!groupId) {
      setUnsentInfo(null);
      return;
    }
    setLoadingUnsent(true);
    get(`/send-mail/groups/${groupId}/unsent`)
      .then(({ data }) => setUnsentInfo(data))
      .catch(() => setUnsentInfo(null))
      .finally(() => setLoadingUnsent(false));
  }, [groupId]);

  // ── Load campaigns ────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(() => {
    setLoadingCampaigns(true);
    get('/send-mail/campaigns')
      .then(({ data }) => setCampaigns(data ?? []))
      .catch(() => toggleNotification({ type: 'warning', message: 'Failed to load campaigns' }))
      .finally(() => setLoadingCampaigns(false));
  }, [get, toggleNotification]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    setEnqueueing(true);
    setEnqueueResult(null);
    try {
      const { data } = await post('/send-mail/send', { groupId, templateId });
      setEnqueueResult(data);
      setUnsentInfo(null);
      toggleNotification({
        type: 'success',
        message: `Campaign queued — ${data.queued} recipients. Processing starts within 5 minutes.`,
      });
      loadCampaigns();
    } catch (err: any) {
      toggleNotification({
        type: 'warning',
        message: err?.response?.data?.error?.message ?? 'Failed to enqueue campaign',
      });
    } finally {
      setEnqueueing(false);
    }
  };

  // ── Retry unsent for selected group ───────────────────────────────────────
  const handleRetry = async () => {
    if (!unsentInfo?.campaignDocumentId) return;
    setRetrying(true);
    try {
      const { data } = await post(
        `/send-mail/campaigns/${unsentInfo.campaignDocumentId}/retry`,
        {}
      );
      toggleNotification({
        type: 'success',
        message: `Retry queued — ${data.queued} unsent emails will be retried within 5 minutes.`,
      });
      setUnsentInfo(null);
      loadCampaigns();
    } catch (err: any) {
      toggleNotification({
        type: 'warning',
        message: err?.response?.data?.error?.message ?? 'Retry failed',
      });
    } finally {
      setRetrying(false);
    }
  };

  // ── Settings handlers ─────────────────────────────────────────────────────
  const updateSetting = (key: keyof PluginSettings, value: string | number) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'collection') {
        next.emailField = '';
        next.statusField = '';
        next.activeValue = '';
        next.tokenField = '';
      }
      if (key === 'statusField') next.activeValue = '';
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
  const savedCollectionExists = collections.some((c) => c.uid === savedSettings.collection);
  const hasUnsent = (unsentInfo?.count ?? 0) > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box padding={8} background="neutral100">
      <Box paddingBottom={6}>
        <Typography variant="alpha">Send Mail</Typography>
      </Box>

      <Tabs.Root defaultValue="send">
        <Tabs.List aria-label="Send Mail tabs">
          <Tabs.Trigger value="send">Send</Tabs.Trigger>
          <Tabs.Trigger value="campaigns">
            Campaigns{campaigns.some((c) => c.status === 'sending') ? ' ●' : ''}
          </Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings{settingsDirty ? ' ●' : ''}</Tabs.Trigger>
        </Tabs.List>

        {/* ── SEND TAB ─────────────────────────────────────────────────── */}
        <Tabs.Content value="send">
          <Box paddingTop={6}>
            <Box
              background="neutral0"
              padding={6}
              shadow="tableShadow"
              hasRadius
              style={{ maxWidth: 480 }}
            >
              {!loadingCollections && !savedCollectionExists && (
                <Box paddingBottom={4}>
                  <Alert variant="caution" title="Subscriber collection not found">
                    <Typography variant="pi">
                      <strong>{savedSettings.collection}</strong> does not exist. Go to Settings to
                      choose a valid collection.
                    </Typography>
                  </Alert>
                </Box>
              )}

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

              {/* Unsent warning — shown after group selected */}
              {groupId && !loadingUnsent && hasUnsent && (
                <Box paddingBottom={4}>
                  <Alert
                    variant="caution"
                    title={`${unsentInfo!.count} unsent emails from previous campaign`}
                  >
                    <Flex gap={2} alignItems="center" paddingTop={2}>
                      <Typography variant="pi">
                        These emails were not delivered. Retry them before sending a new campaign,
                        or proceed to send a fresh batch.
                      </Typography>
                    </Flex>
                    <Box paddingTop={3}>
                      <Button
                        variant="secondary"
                        startIcon={<ArrowClockwise />}
                        loading={retrying}
                        onClick={handleRetry}
                        size="S"
                      >
                        Retry {unsentInfo!.count} unsent
                      </Button>
                    </Box>
                  </Alert>
                </Box>
              )}

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
                disabled={
                  !groupId ||
                  !templateId ||
                  enqueueing ||
                  (!loadingCollections && !savedCollectionExists)
                }
                loading={enqueueing}
                size="L"
                fullWidth
              >
                Send Emails
              </Button>

              {enqueueResult && (
                <Box paddingTop={4}>
                  <Alert variant="success" title="Campaign queued">
                    {enqueueResult.queued} recipients added to the send queue. Check the Campaigns
                    tab for progress.
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </Tabs.Content>

        {/* ── CAMPAIGNS TAB — read-only audit log ──────────────────────── */}
        <Tabs.Content value="campaigns">
          <Box paddingTop={6}>
            <Flex justifyContent="flex-end" paddingBottom={4}>
              <Button
                variant="tertiary"
                startIcon={<ArrowClockwise />}
                onClick={loadCampaigns}
                loading={loadingCampaigns}
              >
                Refresh
              </Button>
            </Flex>

            {loadingCampaigns && campaigns.length === 0 ? (
              <Flex justifyContent="center" padding={8}>
                <Loader>Loading campaigns…</Loader>
              </Flex>
            ) : campaigns.length === 0 ? (
              <Box background="neutral0" padding={6} shadow="tableShadow" hasRadius>
                <Typography variant="omega" textColor="neutral600">
                  No campaigns yet. Use the Send tab to create your first one.
                </Typography>
              </Box>
            ) : (
              <Flex direction="column" gap={3}>
                {campaigns.map((campaign) => (
                  <Box
                    key={campaign.documentId}
                    background="neutral0"
                    padding={5}
                    shadow="tableShadow"
                    hasRadius
                  >
                    <Flex justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Flex gap={3} alignItems="center" paddingBottom={2}>
                          <Typography variant="delta" fontWeight="bold">
                            {campaign.name}
                          </Typography>
                          <StatusBadge status={campaign.status} />
                        </Flex>

                        <Flex gap={4} paddingBottom={1}>
                          {campaign.groupName && (
                            <Typography variant="pi" textColor="neutral500">
                              Group: <strong>{campaign.groupName}</strong>
                            </Typography>
                          )}
                          {campaign.templateName && (
                            <Typography variant="pi" textColor="neutral500">
                              Template: <strong>{campaign.templateName}</strong>
                            </Typography>
                          )}
                        </Flex>

                        <Flex gap={4}>
                          <Typography variant="pi" textColor="success600">
                            ✓ {campaign.totalSent ?? 0} sent
                          </Typography>
                          <Typography variant="pi" textColor="danger600">
                            ✗ {campaign.totalFailed ?? 0} failed
                          </Typography>
                          {campaign.sentAt && (
                            <Typography variant="pi" textColor="neutral500">
                              Completed: {new Date(campaign.sentAt).toLocaleString('en-GB')}
                            </Typography>
                          )}
                          {!campaign.sentAt && campaign.status === 'sending' && (
                            <Typography variant="pi" textColor="warning600">
                              Processing — next check within 5 mins
                            </Typography>
                          )}
                        </Flex>

                        {campaign.error && (
                          <Box paddingTop={2}>
                            <Typography variant="pi" textColor="danger600">
                              Error: {campaign.error}
                            </Typography>
                          </Box>
                        )}

                        <Box paddingTop={1}>
                          <Typography variant="pi" textColor="neutral400">
                            Created: {new Date(campaign.createdAt).toLocaleString('en-GB')}
                          </Typography>
                        </Box>
                      </Box>
                    </Flex>
                  </Box>
                ))}
              </Flex>
            )}
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
                  <Typography variant="beta">Plugin Settings</Typography>
                  <Box paddingTop={1}>
                    <Typography variant="pi" textColor="neutral600">
                      Configure the subscriber collection, field mapping, and send throttle.
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

              {loadingCollections ? (
                <Flex justifyContent="center" padding={4}>
                  <Loader small>Loading collections…</Loader>
                </Flex>
              ) : collectionsError ? (
                <Alert variant="danger" title="Could not load collections">
                  Check that the Strapi server is running and try refreshing.
                </Alert>
              ) : collections.length === 0 ? (
                <Alert variant="caution" title="No collections found">
                  No <code>api::</code> content types found. Create a collection type in the
                  Content-Type Builder first.
                </Alert>
              ) : (
                <>
                  {/* Collection picker */}
                  <Box paddingBottom={4}>
                    <Field.Root name="collection">
                      <Field.Label>Subscriber Collection</Field.Label>
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

                  {loadingFields ? (
                    <Flex justifyContent="center" padding={4}>
                      <Loader small>Loading fields…</Loader>
                    </Flex>
                  ) : fieldsError ? (
                    <Box paddingBottom={4}>
                      <Alert variant="caution" title="Could not load fields">
                        The selected collection could not be introspected.
                      </Alert>
                    </Box>
                  ) : fields.length === 0 && settings.collection ? (
                    <Box paddingBottom={4}>
                      <Alert variant="caution" title="No mappable fields found">
                        This collection has no string, email, text, UID, or enumeration fields.
                      </Alert>
                    </Box>
                  ) : fields.length > 0 ? (
                    <Grid.Root gap={4}>
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

                      {/* Throttle settings */}
                      <Grid.Item col={6}>
                        <Field.Root name="batchSize">
                          <Field.Label>Batch Size</Field.Label>
                          <Field.Hint>Emails sent per batch before delay.</Field.Hint>
                          <NumberInput
                            value={settings.batchSize}
                            onValueChange={(val: number) => updateSetting('batchSize', val ?? 50)}
                          />
                        </Field.Root>
                      </Grid.Item>

                      <Grid.Item col={6}>
                        <Field.Root name="delayMs">
                          <Field.Label>Delay Between Batches (ms)</Field.Label>
                          <Field.Hint>Milliseconds to wait between batches.</Field.Hint>
                          <NumberInput
                            value={settings.delayMs}
                            onValueChange={(val: number) => updateSetting('delayMs', val ?? 1000)}
                          />
                        </Field.Root>
                      </Grid.Item>
                    </Grid.Root>
                  ) : null}
                </>
              )}

              {/* Active config summary */}
              {!settingsDirty && !loadingCollections && !collectionsError && (
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
                          {String(v) || '—'}
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
