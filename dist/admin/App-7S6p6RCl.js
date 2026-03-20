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
  tokenField: "unsubscribeToken"
};
const HomePage = () => {
  const { get, post } = admin.useFetchClient();
  const { toggleNotification } = admin.useNotification();
  const [groups, setGroups] = react.useState([]);
  const [templates, setTemplates] = react.useState([]);
  const [groupId, setGroupId] = react.useState("");
  const [templateId, setTemplateId] = react.useState("");
  const [status, setStatus] = react.useState(null);
  const [result, setResult] = react.useState(null);
  const [loading, setLoading] = react.useState(false);
  const [settings, setSettings] = react.useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = react.useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = react.useState(false);
  const [settingsDirty, setSettingsDirty] = react.useState(false);
  const [collections, setCollections] = react.useState([]);
  const [fields, setFields] = react.useState([]);
  const [loadingFields, setLoadingFields] = react.useState(false);
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
    get("/send-mail/collections").then(({ data }) => setCollections(data ?? [])).catch(() => {
    });
  }, []);
  react.useEffect(() => {
    if (!settings.collection) return;
    setLoadingFields(true);
    get(`/send-mail/collections/${encodeURIComponent(settings.collection)}/fields`).then(({ data }) => setFields(data ?? [])).catch(() => setFields([])).finally(() => setLoadingFields(false));
  }, [settings.collection]);
  const handleSend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data } = await post("/send-mail/send", { groupId, templateId });
      setResult(data);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
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
      if (key === "statusField") {
        next.activeValue = "";
      }
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
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 8, background: "neutral100", children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 6, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", children: "Send Mail" }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Root, { defaultValue: "send", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.List, { "aria-label": "Send Mail tabs", children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Trigger, { value: "send", children: "Send" }),
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
                disabled: !groupId || !templateId || loading,
                loading,
                size: "L",
                fullWidth: true,
                children: "Send Emails"
              }
            ),
            status === "success" && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Alert, { variant: "success", title: "Emails sent!", children: [
              result?.sent,
              " sent · ",
              result?.failed,
              " failed"
            ] }) }),
            status === "error" && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Alert, { variant: "danger", title: "Send failed", children: "Check the server logs for details." }) })
          ]
        }
      ) }) }),
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
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", children: "Subscriber Collection" }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 1, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "Choose which collection stores subscribers and map its fields." }) })
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
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "collection", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "Collection" }),
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
            loadingFields && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { small: true, children: "Loading fields…" }) }),
            !loadingFields && fields.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Grid.Root, { gap: 4, children: [
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
              ] }) })
            ] }),
            !settingsDirty && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { background: "neutral100", padding: 4, hasRadius: true, marginTop: 6, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", textColor: "neutral600", children: "Active config" }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 2, children: Object.entries(savedSettings).map(([k, v]) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, paddingTop: 1, children: [
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
                  k,
                  ":"
                ] }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "bold", children: v || "—" })
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
