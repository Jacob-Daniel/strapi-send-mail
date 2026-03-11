import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Field,
  SingleSelect,
  SingleSelectOption,
  Typography,
  Alert,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const HomePage = () => {
  const { get, post } = useFetchClient();
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [status, setStatus] = useState<null | 'success' | 'error'>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get('/send-mail/groups')
      .then(({ data }) => setGroups(data))
      .catch(() => {});
    get('/send-mail/templates')
      .then(({ data }) => setTemplates(data))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data } = await post('/send-mail/send', {
        groupId,
        templateId,
      });
      setResult(data);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding={8} background="neutral100">
      <Box paddingBottom={6}>
        <Typography variant="alpha">Send Mail</Typography>
      </Box>

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
  );
};

export { HomePage };
