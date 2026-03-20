"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const admin = require("@strapi/strapi/admin");
const reactRouterDom = require("react-router-dom");
const react = require("react");
const designSystem = require("@strapi/design-system");
const icons = require("@strapi/icons");
const DEFAULT_SETTINGS = {
  collection: "api::subscriber.subscriber",
  emailField: "email",
  statusField: "subscribedStatus",
  activeValue: "active",
  tokenField: "unsubscribeToken",
  batchSize: 50,
  delayMs: 1e3
};
const STATUS_STYLES = {
  sending: { bg: "#f0c000", text: "#4a3800" },
  sent: { bg: "#328048", text: "#ffffff" },
  failed: { bg: "#d02b20", text: "#ffffff" }
};
const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] ?? { bg: "#8e8ea9", text: "#ffffff" };
  return /* @__PURE__ */ jsxRuntime.jsx(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        backgroundColor: s.bg,
        color: s.text
      },
      children: status
    }
  );
};
const HomePage = () => {
  const { get, post } = admin.useFetchClient();
  const { toggleNotification } = admin.useNotification();
  const [groups, setGroups] = react.useState([]);
  const [templates, setTemplates] = react.useState([]);
  const [groupId, setGroupId] = react.useState("");
  const [templateId, setTemplateId] = react.useState("");
  const [enqueueing, setEnqueueing] = react.useState(false);
  const [enqueueResult, setEnqueueResult] = react.useState(null);
  const [unsentInfo, setUnsentInfo] = react.useState(null);
  const [loadingUnsent, setLoadingUnsent] = react.useState(false);
  const [retrying, setRetrying] = react.useState(false);
  const [campaigns, setCampaigns] = react.useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = react.useState(false);
  const [settings, setSettings] = react.useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = react.useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = react.useState(false);
  const [settingsDirty, setSettingsDirty] = react.useState(false);
  const [collections, setCollections] = react.useState([]);
  const [loadingCollections, setLoadingCollections] = react.useState(true);
  const [collectionsError, setCollectionsError] = react.useState(false);
  const [fields, setFields] = react.useState([]);
  const [loadingFields, setLoadingFields] = react.useState(false);
  const [fieldsError, setFieldsError] = react.useState(false);
  react.useEffect(() => {
    get("/send-mail/groups").then(({ data }) => setGroups(data)).catch(() => {
    });
    get("/send-mail/templates").then(({ data }) => setTemplates(data)).catch(() => {
    });
  }, []);
  react.useEffect(() => {
    get("/send-mail/settings").then(({ data }) => {
      const s = { ...DEFAULT_SETTINGS, ...data };
      setSettings(s);
      setSavedSettings(s);
    }).catch(() => {
    });
    setLoadingCollections(true);
    get("/send-mail/collections").then(({ data }) => {
      setCollections(data ?? []);
      setCollectionsError(false);
    }).catch(() => setCollectionsError(true)).finally(() => setLoadingCollections(false));
  }, []);
  react.useEffect(() => {
    if (!settings.collection) {
      setFields([]);
      return;
    }
    setLoadingFields(true);
    setFieldsError(false);
    get(`/send-mail/collections/${encodeURIComponent(settings.collection)}/fields`).then(({ data }) => {
      setFields(data ?? []);
      setFieldsError(false);
    }).catch(() => {
      setFields([]);
      setFieldsError(true);
    }).finally(() => setLoadingFields(false));
  }, [settings.collection]);
  react.useEffect(() => {
    if (!groupId) {
      setUnsentInfo(null);
      return;
    }
    setLoadingUnsent(true);
    get(`/send-mail/groups/${groupId}/unsent`).then(({ data }) => setUnsentInfo(data)).catch(() => setUnsentInfo(null)).finally(() => setLoadingUnsent(false));
  }, [groupId]);
  const loadCampaigns = react.useCallback(() => {
    setLoadingCampaigns(true);
    get("/send-mail/campaigns").then(({ data }) => setCampaigns(data ?? [])).catch(() => toggleNotification({ type: "warning", message: "Failed to load campaigns" })).finally(() => setLoadingCampaigns(false));
  }, [get, toggleNotification]);
  react.useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);
  const handleSend = async () => {
    setEnqueueing(true);
    setEnqueueResult(null);
    try {
      const { data } = await post("/send-mail/send", { groupId, templateId });
      setEnqueueResult(data);
      setUnsentInfo(null);
      toggleNotification({
        type: "success",
        message: `Campaign queued — ${data.queued} recipients. Processing starts within 5 minutes.`
      });
      loadCampaigns();
    } catch (err) {
      toggleNotification({
        type: "warning",
        message: err?.response?.data?.error?.message ?? "Failed to enqueue campaign"
      });
    } finally {
      setEnqueueing(false);
    }
  };
  const handleRetry = async () => {
    if (!unsentInfo?.campaignDocumentId) return;
    setRetrying(true);
    try {
      const { data } = await post(
        `/send-mail/campaigns/${unsentInfo.campaignDocumentId}/retry`,
        {}
      );
      toggleNotification({
        type: "success",
        message: `Retry queued — ${data.queued} unsent emails will be retried within 5 minutes.`
      });
      setUnsentInfo(null);
      loadCampaigns();
    } catch (err) {
      toggleNotification({
        type: "warning",
        message: err?.response?.data?.error?.message ?? "Retry failed"
      });
    } finally {
      setRetrying(false);
    }
  };
  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "collection") {
        next.emailField = "";
        next.statusField = "";
        next.activeValue = "";
        next.tokenField = "";
      }
      if (key === "statusField") next.activeValue = "";
      return next;
    });
    setSettingsDirty(true);
  };
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data } = await post("/send-mail/settings", settings);
      const saved = { ...DEFAULT_SETTINGS, ...data };
      setSettings(saved);
      setSavedSettings(saved);
      setSettingsDirty(false);
      toggleNotification({ type: "success", message: "Settings saved" });
    } catch {
      toggleNotification({ type: "warning", message: "Failed to save settings" });
    } finally {
      setSavingSettings(false);
    }
  };
  const scalarFields = fields.filter((f) => ["string", "email", "text", "uid"].includes(f.type));
  const activeValueOptions = fields.find((f) => f.name === settings.statusField)?.enum ?? [];
  const savedCollectionExists = collections.some((c) => c.uid === savedSettings.collection);
  const hasUnsent = (unsentInfo?.count ?? 0) > 0;
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 8, background: "neutral100", children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 6, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", children: "Send Mail" }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Root, { defaultValue: "send", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.List, { "aria-label": "Send Mail tabs", children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Trigger, { value: "send", children: "Send" }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Trigger, { value: "campaigns", children: [
          "Campaigns",
          campaigns.some((c) => c.status === "sending") ? " ●" : ""
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Trigger, { value: "settings", children: [
          "Settings",
          settingsDirty ? " ●" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Content, { value: "send", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(
        designSystem.Box,
        {
          background: "neutral0",
          padding: 6,
          shadow: "tableShadow",
          hasRadius: true,
          style: { maxWidth: 480 },
          children: [
            !loadingCollections && !savedCollectionExists && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Alert, { variant: "caution", title: "Subscriber collection not found", children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", children: [
              /* @__PURE__ */ jsxRuntime.jsx("strong", { children: savedSettings.collection }),
              " does not exist. Go to Settings to choose a valid collection."
            ] }) }) }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "group", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Recipient Group" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.SingleSelect,
                {
                  placeholder: "Select a group...",
                  value: groupId,
                  onChange: (val) => setGroupId(val),
                  children: groups.map((g) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: g.documentId, children: g.name }, g.documentId))
                }
              )
            ] }) }),
            groupId && !loadingUnsent && hasUnsent && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(
              designSystem.Alert,
              {
                variant: "caution",
                title: `${unsentInfo.count} unsent emails from previous campaign`,
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { gap: 2, alignItems: "center", paddingTop: 2, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", children: "These emails were not delivered. Retry them before sending a new campaign, or proceed to send a fresh batch." }) }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 3, children: /* @__PURE__ */ jsxRuntime.jsxs(
                    designSystem.Button,
                    {
                      variant: "secondary",
                      startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowClockwise, {}),
                      loading: retrying,
                      onClick: handleRetry,
                      size: "S",
                      children: [
                        "Retry ",
                        unsentInfo.count,
                        " unsent"
                      ]
                    }
                  ) })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "template", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Email Template" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.SingleSelect,
                {
                  placeholder: "Select a template...",
                  value: templateId,
                  onChange: (val) => setTemplateId(val),
                  children: templates.map((t) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: t.documentId, children: t.name }, t.documentId))
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Button,
              {
                onClick: handleSend,
                disabled: !groupId || !templateId || enqueueing || !loadingCollections && !savedCollectionExists,
                loading: enqueueing,
                size: "L",
                fullWidth: true,
                children: "Send Emails"
              }
            ),
            enqueueResult && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Alert, { variant: "success", title: "Campaign queued", children: [
              enqueueResult.queued,
              " recipients added to the send queue. Check the Campaigns tab for progress."
            ] }) })
          ]
        }
      ) }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Content, { value: "campaigns", children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { paddingTop: 6, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "flex-end", paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            variant: "tertiary",
            startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowClockwise, {}),
            onClick: loadCampaigns,
            loading: loadingCampaigns,
            children: "Refresh"
          }
        ) }),
        loadingCampaigns && campaigns.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { children: "Loading campaigns…" }) }) : campaigns.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { background: "neutral0", padding: 6, shadow: "tableShadow", hasRadius: true, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", textColor: "neutral600", children: "No campaigns yet. Use the Send tab to create your first one." }) }) : /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", gap: 3, children: campaigns.map((campaign) => /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Box,
          {
            background: "neutral0",
            padding: 5,
            shadow: "tableShadow",
            hasRadius: true,
            children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "space-between", alignItems: "flex-start", children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { children: [
              /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 3, alignItems: "center", paddingBottom: 2, children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", fontWeight: "bold", children: campaign.name }),
                /* @__PURE__ */ jsxRuntime.jsx(StatusBadge, { status: campaign.status })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, paddingBottom: 1, children: [
                campaign.groupName && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
                  "Group: ",
                  /* @__PURE__ */ jsxRuntime.jsx("strong", { children: campaign.groupName })
                ] }),
                campaign.templateName && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
                  "Template: ",
                  /* @__PURE__ */ jsxRuntime.jsx("strong", { children: campaign.templateName })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, children: [
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "success600", children: [
                  "✓ ",
                  campaign.totalSent ?? 0,
                  " sent"
                ] }),
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "danger600", children: [
                  "✗ ",
                  campaign.totalFailed ?? 0,
                  " failed"
                ] }),
                campaign.sentAt && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
                  "Completed: ",
                  new Date(campaign.sentAt).toLocaleString("en-GB")
                ] }),
                !campaign.sentAt && campaign.status === "sending" && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "warning600", children: "Processing — next check within 5 mins" })
              ] }),
              campaign.error && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 2, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "danger600", children: [
                "Error: ",
                campaign.error
              ] }) }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 1, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral400", children: [
                "Created: ",
                new Date(campaign.createdAt).toLocaleString("en-GB")
              ] }) })
            ] }) })
          },
          campaign.documentId
        )) })
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Content, { value: "settings", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(
        designSystem.Box,
        {
          background: "neutral0",
          padding: 6,
          shadow: "tableShadow",
          hasRadius: true,
          style: { maxWidth: 640 },
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", alignItems: "center", paddingBottom: 6, children: [
              /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", children: "Plugin Settings" }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 1, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "Configure the subscriber collection, field mapping, and send throttle." }) })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Button,
                {
                  startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Check, {}),
                  loading: savingSettings,
                  disabled: !settingsDirty || savingSettings,
                  onClick: handleSaveSettings,
                  children: "Save"
                }
              )
            ] }),
            loadingCollections ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { small: true, children: "Loading collections…" }) }) : collectionsError ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Alert, { variant: "danger", title: "Could not load collections", children: "Check that the Strapi server is running and try refreshing." }) : collections.length === 0 ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Alert, { variant: "caution", title: "No collections found", children: [
              "No ",
              /* @__PURE__ */ jsxRuntime.jsx("code", { children: "api::" }),
              " content types found. Create a collection type in the Content-Type Builder first."
            ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "collection", children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Subscriber Collection" }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  designSystem.SingleSelect,
                  {
                    placeholder: "Select a collection...",
                    value: settings.collection,
                    onChange: (val) => updateSetting("collection", val),
                    children: collections.map((c) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: c.uid, children: c.displayName }, c.uid))
                  }
                )
              ] }) }),
              loadingFields ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { small: true, children: "Loading fields…" }) }) : fieldsError ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Alert, { variant: "caution", title: "Could not load fields", children: "The selected collection could not be introspected." }) }) : fields.length === 0 && settings.collection ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Alert, { variant: "caution", title: "No mappable fields found", children: "This collection has no string, email, text, UID, or enumeration fields." }) }) : fields.length > 0 ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Grid.Root, { gap: 4, children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "emailField", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Email Field" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.SingleSelect,
                    {
                      placeholder: "Select field...",
                      value: settings.emailField,
                      onChange: (val) => updateSetting("emailField", val),
                      children: scalarFields.map((f) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: f.name, children: f.name }, f.name))
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "tokenField", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Unsubscribe Token Field" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.SingleSelect,
                    {
                      placeholder: "Select field...",
                      value: settings.tokenField,
                      onChange: (val) => updateSetting("tokenField", val),
                      children: scalarFields.map((f) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: f.name, children: f.name }, f.name))
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "statusField", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Status Field" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.SingleSelect,
                    {
                      placeholder: "Select field...",
                      value: settings.statusField,
                      onChange: (val) => updateSetting("statusField", val),
                      children: fields.map((f) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: f.name, children: f.name }, f.name))
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "activeValue", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Active Status Value" }),
                  activeValueOptions.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.SingleSelect,
                    {
                      placeholder: "Select value...",
                      value: settings.activeValue,
                      onChange: (val) => updateSetting("activeValue", val),
                      children: activeValueOptions.map((v) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: v, children: v }, v))
                    }
                  ) : /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.TextInput,
                    {
                      placeholder: "e.g. active",
                      value: settings.activeValue,
                      onChange: (e) => updateSetting("activeValue", e.target.value)
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "batchSize", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Batch Size" }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, { children: "Emails sent per batch before delay." }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.NumberInput,
                    {
                      value: settings.batchSize,
                      onValueChange: (val) => updateSetting("batchSize", val ?? 50)
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "delayMs", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Delay Between Batches (ms)" }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, { children: "Milliseconds to wait between batches." }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.NumberInput,
                    {
                      value: settings.delayMs,
                      onValueChange: (val) => updateSetting("delayMs", val ?? 1e3)
                    }
                  )
                ] }) })
              ] }) : null
            ] }),
            !settingsDirty && !loadingCollections && !collectionsError && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { background: "neutral100", padding: 4, hasRadius: true, marginTop: 6, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", textColor: "neutral600", children: "Active config" }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 2, children: Object.entries(savedSettings).map(([k, v]) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, paddingTop: 1, children: [
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
                  k,
                  ":"
                ] }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "bold", children: String(v) || "—" })
              ] }, k)) })
            ] })
          ]
        }
      ) }) })
    ] })
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(HomePage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Error, {}) })
  ] });
};
exports.App = App;
