"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const admin = require("@strapi/strapi/admin");
const reactRouterDom = require("react-router-dom");
const react = require("react");
const designSystem = require("@strapi/design-system");
const HomePage = () => {
  const { get, post } = admin.useFetchClient();
  const [groups, setGroups] = react.useState([]);
  const [templates, setTemplates] = react.useState([]);
  const [groupId, setGroupId] = react.useState("");
  const [templateId, setTemplateId] = react.useState("");
  const [status, setStatus] = react.useState(null);
  const [result, setResult] = react.useState(null);
  const [loading, setLoading] = react.useState(false);
  react.useEffect(() => {
    get("/send-mail/groups").then(({ data }) => setGroups(data)).catch(() => {
    });
    get("/send-mail/templates").then(({ data }) => setTemplates(data)).catch(() => {
    });
  }, []);
  const handleSend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data } = await post("/send-mail/send", {
        groupId,
        templateId
      });
      setResult(data);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 8, background: "neutral100", children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 6, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", children: "Send Mail" }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(
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
    )
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(HomePage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Error, {}) })
  ] });
};
exports.App = App;
