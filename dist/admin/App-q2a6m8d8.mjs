import { jsxs, jsx } from "react/jsx-runtime";
import { useFetchClient, useNotification, Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Box, Typography, Tabs, Field, SingleSelect, SingleSelectOption, Button, Alert, Flex, Loader, Grid, TextInput } from "@strapi/design-system";
import { Check } from "@strapi/icons";
const DEFAULT_SETTINGS = {
  collection: "api::subscriber.subscriber",
  emailField: "email",
  statusField: "subscribedStatus",
  activeValue: "active",
  tokenField: "unsubscribeToken"
};
const HomePage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [collections, setCollections] = useState([]);
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  useEffect(() => {
    get("/send-mail/groups").then(({ data }) => setGroups(data)).catch(() => {
    });
    get("/send-mail/templates").then(({ data }) => setTemplates(data)).catch(() => {
    });
  }, []);
  useEffect(() => {
    get("/send-mail/settings").then(({ data }) => {
      const s = { ...DEFAULT_SETTINGS, ...data };
      setSettings(s);
      setSavedSettings(s);
    }).catch(() => {
    });
    get("/send-mail/collections").then(({ data }) => setCollections(data ?? [])).catch(() => {
    });
  }, []);
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs(Box, { padding: 8, background: "neutral100", children: [
    /* @__PURE__ */ jsx(Box, { paddingBottom: 6, children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "Send Mail" }) }),
    /* @__PURE__ */ jsxs(Tabs.Root, { defaultValue: "send", children: [
      /* @__PURE__ */ jsxs(Tabs.List, { "aria-label": "Send Mail tabs", children: [
        /* @__PURE__ */ jsx(Tabs.Trigger, { value: "send", children: "Send" }),
        /* @__PURE__ */ jsxs(Tabs.Trigger, { value: "settings", children: [
          "Settings",
          settingsDirty ? " ●" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx(Tabs.Content, { value: "send", children: /* @__PURE__ */ jsx(Box, { paddingTop: 6, children: /* @__PURE__ */ jsxs(
        Box,
        {
          background: "neutral0",
          padding: 6,
          shadow: "tableShadow",
          hasRadius: true,
          style: { maxWidth: 480 },
          children: [
            /* @__PURE__ */ jsx(Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxs(Field.Root, { name: "group", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "Recipient Group" }),
              /* @__PURE__ */ jsx(
                SingleSelect,
                {
                  placeholder: "Select a group...",
                  value: groupId,
                  onChange: (val) => setGroupId(val),
                  children: groups.map((g) => /* @__PURE__ */ jsx(SingleSelectOption, { value: g.documentId, children: g.name }, g.documentId))
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx(Box, { paddingBottom: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "template", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "Email Template" }),
              /* @__PURE__ */ jsx(
                SingleSelect,
                {
                  placeholder: "Select a template...",
                  value: templateId,
                  onChange: (val) => setTemplateId(val),
                  children: templates.map((t) => /* @__PURE__ */ jsx(SingleSelectOption, { value: t.documentId, children: t.name }, t.documentId))
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleSend,
                disabled: !groupId || !templateId || loading,
                loading,
                size: "L",
                fullWidth: true,
                children: "Send Emails"
              }
            ),
            status === "success" && /* @__PURE__ */ jsx(Box, { paddingTop: 4, children: /* @__PURE__ */ jsxs(Alert, { variant: "success", title: "Emails sent!", children: [
              result?.sent,
              " sent · ",
              result?.failed,
              " failed"
            ] }) }),
            status === "error" && /* @__PURE__ */ jsx(Box, { paddingTop: 4, children: /* @__PURE__ */ jsx(Alert, { variant: "danger", title: "Send failed", children: "Check the server logs for details." }) })
          ]
        }
      ) }) }),
      /* @__PURE__ */ jsx(Tabs.Content, { value: "settings", children: /* @__PURE__ */ jsx(Box, { paddingTop: 6, children: /* @__PURE__ */ jsxs(
        Box,
        {
          background: "neutral0",
          padding: 6,
          shadow: "tableShadow",
          hasRadius: true,
          style: { maxWidth: 640 },
          children: [
            /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", paddingBottom: 6, children: [
              /* @__PURE__ */ jsxs(Box, { children: [
                /* @__PURE__ */ jsx(Typography, { variant: "beta", children: "Subscriber Collection" }),
                /* @__PURE__ */ jsx(Box, { paddingTop: 1, children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Choose which collection stores subscribers and map its fields." }) })
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  startIcon: /* @__PURE__ */ jsx(Check, {}),
                  loading: savingSettings,
                  disabled: !settingsDirty || savingSettings,
                  onClick: handleSaveSettings,
                  children: "Save"
                }
              )
            ] }),
            /* @__PURE__ */ jsx(Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxs(Field.Root, { name: "collection", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "Collection" }),
              /* @__PURE__ */ jsx(
                SingleSelect,
                {
                  placeholder: "Select a collection...",
                  value: settings.collection,
                  onChange: (val) => updateSetting("collection", val),
                  children: collections.map((c) => /* @__PURE__ */ jsx(SingleSelectOption, { value: c.uid, children: c.displayName }, c.uid))
                }
              )
            ] }) }),
            loadingFields && /* @__PURE__ */ jsx(Flex, { justifyContent: "center", padding: 4, children: /* @__PURE__ */ jsx(Loader, { small: true, children: "Loading fields…" }) }),
            !loadingFields && fields.length > 0 && /* @__PURE__ */ jsxs(Grid.Root, { gap: 4, children: [
              /* @__PURE__ */ jsx(Grid.Item, { col: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "emailField", children: [
                /* @__PURE__ */ jsx(Field.Label, { children: "Email Field" }),
                /* @__PURE__ */ jsx(
                  SingleSelect,
                  {
                    placeholder: "Select field...",
                    value: settings.emailField,
                    onChange: (val) => updateSetting("emailField", val),
                    children: scalarFields.map((f) => /* @__PURE__ */ jsx(SingleSelectOption, { value: f.name, children: f.name }, f.name))
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsx(Grid.Item, { col: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "tokenField", children: [
                /* @__PURE__ */ jsx(Field.Label, { children: "Unsubscribe Token Field" }),
                /* @__PURE__ */ jsx(
                  SingleSelect,
                  {
                    placeholder: "Select field...",
                    value: settings.tokenField,
                    onChange: (val) => updateSetting("tokenField", val),
                    children: scalarFields.map((f) => /* @__PURE__ */ jsx(SingleSelectOption, { value: f.name, children: f.name }, f.name))
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsx(Grid.Item, { col: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "statusField", children: [
                /* @__PURE__ */ jsx(Field.Label, { children: "Status Field" }),
                /* @__PURE__ */ jsx(
                  SingleSelect,
                  {
                    placeholder: "Select field...",
                    value: settings.statusField,
                    onChange: (val) => updateSetting("statusField", val),
                    children: fields.map((f) => /* @__PURE__ */ jsx(SingleSelectOption, { value: f.name, children: f.name }, f.name))
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsx(Grid.Item, { col: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "activeValue", children: [
                /* @__PURE__ */ jsx(Field.Label, { children: "Active Status Value" }),
                activeValueOptions.length > 0 ? /* @__PURE__ */ jsx(
                  SingleSelect,
                  {
                    placeholder: "Select value...",
                    value: settings.activeValue,
                    onChange: (val) => updateSetting("activeValue", val),
                    children: activeValueOptions.map((v) => /* @__PURE__ */ jsx(SingleSelectOption, { value: v, children: v }, v))
                  }
                ) : /* @__PURE__ */ jsx(
                  TextInput,
                  {
                    placeholder: "e.g. active",
                    value: settings.activeValue,
                    onChange: (e) => updateSetting("activeValue", e.target.value)
                  }
                )
              ] }) })
            ] }),
            !settingsDirty && /* @__PURE__ */ jsxs(Box, { background: "neutral100", padding: 4, hasRadius: true, marginTop: 6, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "sigma", textColor: "neutral600", children: "Active config" }),
              /* @__PURE__ */ jsx(Box, { paddingTop: 2, children: Object.entries(savedSettings).map(([k, v]) => /* @__PURE__ */ jsxs(Flex, { gap: 2, paddingTop: 1, children: [
                /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral500", children: [
                  k,
                  ":"
                ] }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", children: v || "—" })
              ] }, k)) })
            ] })
          ]
        }
      ) }) })
    ] })
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsxs(Routes, { children: [
    /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(HomePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(Page.Error, {}) })
  ] });
};
export {
  App
};
