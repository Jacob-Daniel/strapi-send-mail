import { jsxs, jsx } from "react/jsx-runtime";
import { useFetchClient, Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Box, Typography, Field, SingleSelect, SingleSelectOption, Button, Alert } from "@strapi/design-system";
const HomePage = () => {
  const { get, post } = useFetchClient();
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs(Box, { padding: 8, background: "neutral100", children: [
    /* @__PURE__ */ jsx(Box, { paddingBottom: 6, children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "Send Mail" }) }),
    /* @__PURE__ */ jsxs(
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
    )
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
