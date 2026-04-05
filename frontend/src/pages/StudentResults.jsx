import { useEffect, useState } from 'react';
import {
  Box, Flex, Heading, Text, Spinner, VStack, HStack, Badge, Button, Icon,
} from '@chakra-ui/react';
import { Download } from 'lucide-react';
import { toaster } from '@/components/ui/toaster';
import { supabase } from '@/lib/supabaseClient';

const API_BASE = '/api';
const SUPABASE_PUBLIC_BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

export default function StudentResults({ token }) {
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [resultsByJobId, setResultsByJobId] = useState({});
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const extractStoragePath = (rawPath) => {
    if (!rawPath || !String(rawPath).trim()) return '';
    const value = decodeURIComponent(String(rawPath).trim());

    // Already a bucket-relative path: user-123/1712345678-result.pdf
    if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('/')) {
      return value;
    }

    // Supabase public URL path pattern
    const marker = '/storage/v1/object/public/Result/';
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      return value.slice(markerIndex + marker.length).split('?')[0];
    }

    // Supabase signed URL path pattern
    const signMarker = '/storage/v1/object/sign/Result/';
    const signIndex = value.indexOf(signMarker);
    if (signIndex >= 0) {
      return value.slice(signIndex + signMarker.length).split('?')[0];
    }

    return '';
  };

  const handleDownload = async (filePath) => {
    console.log('download filePath:', filePath);

    const normalized = (filePath || '').trim();
    const storagePath = extractStoragePath(filePath);

    if (!supabase) {
      // Fallback mode: build public URL directly if VITE_SUPABASE_URL exists.
      if (storagePath && SUPABASE_PUBLIC_BASE) {
        const publicUrl = `${SUPABASE_PUBLIC_BASE}/storage/v1/object/public/Result/${encodeURI(storagePath)}`;
        window.open(publicUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // Local dev fallback: route through backend compatibility endpoint.
      if (storagePath) {
        const objectPath = storagePath.startsWith('results/') ? storagePath.slice('results/'.length) : storagePath;
        const backendUrl = `${window.location.protocol}//${window.location.hostname}:8000/results/${encodeURI(objectPath)}`;
        window.open(backendUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      toaster.create({ title: 'Supabase is not configured.', type: 'error' });
      return;
    }

    // Legacy local-server files are not reliable in deployed/serverless setups.
    if (normalized.startsWith('/uploads/results/')) {
      toaster.create({
        title: 'This is a legacy local file path.',
        description: 'Please ask TPO to re-upload this round so it is saved in Supabase.',
        type: 'warning',
      });
      return;
    }

    if (!storagePath) {
      toaster.create({ title: 'Invalid file path. Re-upload result file to Supabase.', type: 'error' });
      return;
    }

    const { data, error } = await supabase.storage
      .from('Result')
      .download(storagePath);

    console.log('download data:', data);

    if (error) {
      console.error(error.message);

      // Public bucket fallback
      const { data: publicData } = supabase.storage
        .from('Result')
        .getPublicUrl(storagePath);

      if (publicData?.publicUrl) {
        window.open(publicData.publicUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      toaster.create({ title: error.message || 'Download failed.', type: 'error' });
      return;
    }

    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = storagePath.split('/').pop() || 'result-file';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const statusPalette = (status) => {
    if (status === 'Selected') return 'green';
    if (status === 'Rejected') return 'red';
    return 'blue';
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/my-applications`, { headers });
      if (!res.ok) {
        setAppliedJobs([]);
        setResultsByJobId({});
        return;
      }

      const data = await res.json();
      const jobs = data.jobs || [];
      setAppliedJobs(jobs);

      if (!jobs.length) {
        setResultsByJobId({});
        return;
      }

      const pairs = await Promise.all(
        jobs.map(async (job) => {
          try {
            const resultRes = await fetch(`${API_BASE}/results/${job.id}`, { headers });
            if (!resultRes.ok) return [job.id, []];
            const resultData = await resultRes.json();
            return [job.id, resultData.results || []];
          } catch {
            return [job.id, []];
          }
        }),
      );

      setResultsByJobId(Object.fromEntries(pairs));
    } catch {
      setAppliedJobs([]);
      setResultsByJobId({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <Box>
      <Heading size="xl" color="gray.100" mb={1}>Results</Heading>
      <Text color="gray.400" fontSize="sm" mb={6}>
        Round-wise updates for jobs where you are interested or shortlisted.
      </Text>

      {loading ? (
        <Flex align="center" gap={2}>
          <Spinner size="sm" color="blue.300" />
          <Text color="gray.400" fontSize="sm">Loading your results...</Text>
        </Flex>
      ) : appliedJobs.length === 0 ? (
        <Text color="gray.500" fontSize="sm">No applied jobs yet.</Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {appliedJobs.map((job) => {
            const rows = resultsByJobId[job.id] || [];
            return (
              <Box key={job.id} bg="gray.900" border="1px solid" borderColor="gray.800" borderRadius="xl" p={4}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Box>
                    <Text color="gray.100" fontWeight="600">{job.title}</Text>
                    <Text color="blue.400" fontSize="sm">{job.company}</Text>
                  </Box>
                  <HStack gap={2}>
                    {job.is_shortlisted && <Badge colorPalette="purple" fontSize="xs">Shortlisted</Badge>}
                    {job.is_interested && <Badge colorPalette="blue" fontSize="xs">Interested</Badge>}
                  </HStack>
                </Flex>

                {rows.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">No result updates yet for this job.</Text>
                ) : (
                  <VStack align="stretch" gap={2}>
                    {rows.map((row) => (
                      <Box key={row.id} bg="gray.950" border="1px solid" borderColor="gray.800" borderRadius="md" p={3}>
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text color="gray.200" fontSize="sm" fontWeight="500">{row.round_name}</Text>
                          <Badge colorPalette={statusPalette(row.status)} fontSize="xs">{row.status || 'Qualified'}</Badge>
                        </Flex>
                        {row.remarks && <Text color="gray.400" fontSize="sm" mb={2}>{row.remarks}</Text>}
                        {row.file_url && (
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="blue"
                            onClick={() => handleDownload(row.file_url)}
                          >
                            <Icon asChild w={3} h={3} mr={1}><Download /></Icon>
                            Download
                          </Button>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}