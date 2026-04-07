import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, Input, Button, VStack, HStack,
  SimpleGrid, Badge, Spinner, Textarea, Icon, Image, Table,
} from '@chakra-ui/react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DialogRoot, DialogContent, DialogHeader, DialogBody, DialogTitle, DialogCloseTrigger,
} from '@/components/ui/dialog';
import {
  MenuContent, MenuItem, MenuRoot, MenuTrigger,
} from '@/components/ui/menu';
import { Avatar } from '@/components/ui/avatar';
import { toaster } from '@/components/ui/toaster';
import { supabase } from '@/lib/supabaseClient';
import ConfirmationModal from '@/components/ConfirmationModal';
import {
  LogOut, Target, BarChart3, DollarSign, CalendarClock,
  Award, Lightbulb, Phone, FileText, ChevronLeft, ChevronDown, Download, Bell, Users, Upload, Menu as MenuIcon,
} from 'lucide-react';

const API_BASE = '/api';

const normalizeShortlistedItem = (item) => {
  const hasNestedStudent = Boolean(item && typeof item.student === 'object' && item.student);
  const nested = hasNestedStudent ? item.student : {};
  const source = hasNestedStudent ? nested : (item || {});
  const student = {
    id: String(source.id ?? ''),
    name: source.name ?? '',
    email: source.email ?? '',
    mobile_number: source.mobile_number ?? '',
    cgpa: source.cgpa ?? null,
    certifications: source.certifications ?? '',
    preferred_job_roles: source.preferred_job_roles ?? '',
    resume_text: source.resume_text ?? '',
    resume_score: source.resume_score ?? null,
    resume_url: String(source.resume_url ?? '').trim(),
  };

  return {
    ...item,
    id: student.id,
    name: student.name,
    email: student.email,
    cgpa: student.cgpa,
    resume_score: student.resume_score,
    resume_url: student.resume_url,
    student,
  };
};

const JobPostingCard = React.memo(function JobPostingCard({
  job,
  token,
  inputStyles,
  isSelected,
  onSelect,
  onViewShortlisted,
  onViewInterested,
  onDelete,
}) {
  if (import.meta.env.DEV) {
    console.log('Rendering card:', job.id);
  }

  const [uploadResultsOpen, setUploadResultsOpen] = useState(false);
  const [resultRoundName, setResultRoundName] = useState('');
  const [resultStatus, setResultStatus] = useState('Qualified');
  const [resultRemarks, setResultRemarks] = useState('');
  const [resultFile, setResultFile] = useState(null);
  const [resultFilePath, setResultFilePath] = useState('');
  const [uploadingResultFile, setUploadingResultFile] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: 'idle', message: '' });

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const isUploadBusy = uploadingResultFile || submittingResult;

  const resetUploadForm = useCallback(() => {
    setResultRoundName('');
    setResultStatus('Qualified');
    setResultRemarks('');
    setResultFile(null);
    setResultFilePath('');
    setUploadStatus({ type: 'idle', message: '' });
  }, []);

  const openUploadResultsModal = useCallback(async () => {
    setUploadResultsOpen(true);
    setUploadStatus({ type: 'idle', message: '' });
    try {
      const check = await fetch(`${API_BASE}/results/${job.id}`, { headers: authHeaders });
      if (!check.ok && check.status !== 403 && check.status !== 404) {
        toaster.create({ title: 'Unable to verify job result access', type: 'warning' });
      }
    } catch {
      // Non-blocking; backend will validate on submit.
    }
  }, [authHeaders, job.id]);

  const closeUploadResultsModal = useCallback(() => {
    if (isUploadBusy) return;
    setUploadResultsOpen(false);
    resetUploadForm();
  }, [isUploadBusy, resetUploadForm]);

  const handleResultFileSelect = useCallback((event) => {
    if (isUploadBusy) return;
    const file = event.target.files?.[0];
    if (!file) {
      setResultFile(null);
      setResultFilePath('');
      setUploadStatus({ type: 'idle', message: '' });
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'].includes(ext)) {
      toaster.create({ title: 'Only PDF, Excel, JPG, or PNG files are allowed', type: 'error' });
      setUploadStatus({ type: 'error', message: 'Only PDF, Excel, JPG, or PNG files are allowed.' });
      return;
    }

    // Simply store the file locally. It will be uploaded via the backend on Submit.
    setResultFile(file);
    setResultFilePath('');
    setUploadStatus({ type: 'success', message: 'File ready for upload.' });
  }, [isUploadBusy]);


  const submitUploadResults = useCallback(async () => {
    if (isUploadBusy) return;

    const normalizedRound = resultRoundName.trim();
    if (!normalizedRound) {
      toaster.create({ title: 'Round name is required', type: 'warning' });
      return;
    }

    setSubmittingResult(true);
    try {
      const formData = new FormData();
      formData.append('job_id', job.id);
      formData.append('round_name', normalizedRound);
      formData.append('status', resultStatus);
      formData.append('remarks', resultRemarks.trim());

      if (resultFilePath) {
        formData.append('result_file_path', resultFilePath);
      } else if (resultFile) {
        formData.append('result_file', resultFile);
      }

      const res = await fetch(`${API_BASE}/results/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadStatus({ type: 'error', message: data.detail || 'Failed to upload results.' });
        toaster.create({ title: data.detail || 'Failed to upload results', type: 'error' });
        return;
      }

      toaster.create({ title: 'Results uploaded successfully', type: 'success' });
      setUploadResultsOpen(false);
      resetUploadForm();
    } catch {
      setUploadStatus({ type: 'error', message: 'Failed to upload results.' });
      toaster.create({ title: 'Failed to upload results', type: 'error' });
    } finally {
      setSubmittingResult(false);
    }
  }, [authHeaders, isUploadBusy, job.id, resetUploadForm, resultFile, resultFilePath, resultRemarks, resultRoundName, resultStatus]);

  return (
    <>
      <Box
        bg={isSelected ? 'gray.850' : 'gray.900'}
        border="1px solid"
        borderColor={isSelected ? 'purple.500' : 'gray.800'}
        borderRadius="xl"
        p={5}
        cursor="pointer"
        onClick={() => onSelect(job.id)}
      >
        <Flex gap={3} align="flex-start" mb={2}>
          {job.company_logo && (
            <Box w="40px" h="40px" minW="40px" borderRadius="md" overflow="hidden" bg="gray.800">
              <Image src={job.company_logo} alt={`${job.company} logo`} w="full" h="full" objectFit="contain" />
            </Box>
          )}
          <Box flex={1}>
            <Heading size="sm" color="gray.100" mb={1}>{job.title}</Heading>
            <Text color="purple.400" fontSize="sm" fontWeight="500">{job.company}</Text>
          </Box>
        </Flex>

        {job.description && <Text color="gray.400" fontSize="sm" mb={3} lineClamp={2}>{job.description}</Text>}

        <Flex flexWrap="wrap" gap={2} mb={3}>
          {job.job_role && <Badge colorPalette="purple" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Target /></Icon>{job.job_role}</Badge>}
          {job.min_cgpa != null && <Badge colorPalette="blue" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><BarChart3 /></Icon>Min CGPA: {job.min_cgpa}</Badge>}
          {job.package_lpa != null && <Badge colorPalette="green" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><DollarSign /></Icon>{job.package_lpa} LPA</Badge>}
          {job.deadline && <Badge colorPalette="orange" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><CalendarClock /></Icon>{job.deadline}</Badge>}
        </Flex>

        <VStack gap={3} align="stretch" mt={4}>
          <HStack gap={2}>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              flex={1}
              onClick={(e) => {
                e.stopPropagation();
                onViewShortlisted(job.id);
              }}
            >
              View Shortlisted
            </Button>
            <Button
              size="sm"
              colorPalette="purple"
              variant="outline"
              flex={1}
              onClick={(e) => {
                e.stopPropagation();
                onViewInterested(job.id);
              }}
            >
              <Icon asChild w={4} h={4} mr={1}><Users /></Icon>
              View Interested
            </Button>
          </HStack>

          <Button
            size="sm"
            colorPalette="purple"
            variant="outline"
            w="full"
            disabled={isUploadBusy}
            onClick={(e) => {
              e.stopPropagation();
              openUploadResultsModal();
            }}
          >
            {isUploadBusy ? 'Uploading...' : 'Upload Results'}
          </Button>

          <Button
            size="sm"
            colorPalette="red"
            variant="ghost"
            w="full"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
          >
            Delete
          </Button>
        </VStack>
      </Box>

      <DialogRoot open={uploadResultsOpen} onOpenChange={(e) => { if (!e.open) closeUploadResultsModal(); }} size="lg">
        <DialogContent bg="gray.900" border="1px solid" borderColor="gray.700" maxW="760px" w="92vw">
          <DialogHeader>
            <DialogTitle color="gray.100">Upload Results</DialogTitle>
            <Text color="gray.400" fontSize="sm" mt={1}>{job.title} — {job.company}</Text>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody pb={5}>
            <VStack gap={4} align="stretch">
              <Field label="Round Name" required>
                <Input
                  value={resultRoundName}
                  onChange={(e) => setResultRoundName(e.target.value)}
                  placeholder="e.g. Technical Interview"
                  list={`result-round-options-${job.id}`}
                  {...inputStyles}
                />
                <datalist id={`result-round-options-${job.id}`}>
                  <option value="Aptitude Test" />
                  <option value="Technical Interview" />
                  <option value="HR Interview" />
                  <option value="Final Selection" />
                </datalist>
              </Field>

              <Field label="Result Status" required>
                <Box
                  as="select"
                  value={resultStatus}
                  onChange={(e) => setResultStatus(e.target.value)}
                  w="full"
                  h="40px"
                  borderRadius="md"
                  px={3}
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="gray.100"
                >
                  <option style={{ background: '#1f2937' }} value="Selected">Selected</option>
                  <option style={{ background: '#1f2937' }} value="Rejected">Rejected</option>
                  <option style={{ background: '#1f2937' }} value="Qualified">Qualified</option>
                </Box>
              </Field>

              <Field label="Remarks (Optional)">
                <Textarea
                  rows={3}
                  value={resultRemarks}
                  onChange={(e) => setResultRemarks(e.target.value)}
                  placeholder="Add any notes for selected students"
                  {...inputStyles}
                />
              </Field>

              <Field label="Upload File (Optional)" helperText="Accepted: PDF, XLSX, XLS, JPG, JPEG, PNG">
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                  onChange={handleResultFileSelect}
                  disabled={isUploadBusy}
                  {...inputStyles}
                />
                <Box minH="22px" mt={2}>
                  {uploadStatus.message && (
                    <Text
                      fontSize="xs"
                      color={uploadStatus.type === 'error' ? 'red.300' : uploadStatus.type === 'warning' ? 'orange.300' : uploadStatus.type === 'success' ? 'green.300' : 'blue.300'}
                      className="transition-none"
                    >
                      {uploadStatus.message}
                    </Text>
                  )}
                </Box>
              </Field>

              <Box minH="40px" className="transition-none">
                <Button
                  colorPalette="purple"
                  loading={isUploadBusy}
                  loadingText="Uploading..."
                  disabled={isUploadBusy}
                  onClick={submitUploadResults}
                  w="full"
                >
                  Submit
                </Button>
              </Box>
            </VStack>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </>
  );
}, (prev, next) => (
  prev.job === next.job
  && prev.token === next.token
  && prev.inputStyles === next.inputStyles
  && prev.isSelected === next.isSelected
  && prev.onSelect === next.onSelect
  && prev.onViewShortlisted === next.onViewShortlisted
  && prev.onViewInterested === next.onViewInterested
  && prev.onDelete === next.onDelete
));

export default function TpoDashboard({ token, user, onLogout }) {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* New-job form */
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [minResumeScore, setMinResumeScore] = useState('');
  const [requiredCerts, setRequiredCerts] = useState('');
  const [preferredSkills, setPreferredSkills] = useState('');
  const [packageLpa, setPackageLpa] = useState('');
  const [deadline, setDeadline] = useState('');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState('');

  /* Shortlisted */
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [shortlisted, setShortlisted] = useState([]);
  const [autoShortlisted, setAutoShortlisted] = useState([]);
  const [manualShortlisted, setManualShortlisted] = useState([]);
  const [shortlistedJob, setShortlistedJob] = useState(null);
  const [loadingShortlisted, setLoadingShortlisted] = useState(false);
  const [shortlistedTotal, setShortlistedTotal] = useState(0);
  const [notifying, setNotifying] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingAllResumes, setLoadingAllResumes] = useState(false);
  const [loadingSelectedResumes, setLoadingSelectedResumes] = useState(false);
  const [resumeViewerOpen, setResumeViewerOpen] = useState(false);
  const [resumeViewerUrl, setResumeViewerUrl] = useState('');
  const [resumeViewerStudent, setResumeViewerStudent] = useState('');
  const [loadingResumeId, setLoadingResumeId] = useState('');

  /* Interested Students */
  const [interestedStudents, setInterestedStudents] = useState([]);
  const [interestedJob, setInterestedJob] = useState(null);
  const [loadingInterested, setLoadingInterested] = useState(false);
  const [interestedTotal, setInterestedTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [shortlistingAll, setShortlistingAll] = useState(false);
  const [shortlistingStudentId, setShortlistingStudentId] = useState('');
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);
  const [selectedActionJobId, setSelectedActionJobId] = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const inputStyles = useMemo(() => ({
    bg: 'gray.800', border: '1px solid', borderColor: 'gray.700',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' },
  }), []);

  /* ── Fetch jobs ── */
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs`, { headers });
      if (res.ok) { const data = await res.json(); setJobs(data.jobs || []); }
    } catch { /* */ } finally { setLoadingJobs(false); }
  }, [headers]);
  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  /* ── Post job (multipart/form-data) ── */
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return;
    setPosting(true); setPostMsg('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('company', company);
      formData.append('description', description);
      formData.append('eligibility', eligibility);
      formData.append('job_role', jobRole);
      formData.append('min_cgpa', minCgpa || '');
      formData.append('min_resume_score', minResumeScore || '');
      formData.append('required_certifications', requiredCerts);
      formData.append('preferred_skills', preferredSkills);
      formData.append('package_lpa', packageLpa || '');
      formData.append('deadline', deadline);
      if (companyLogo) formData.append('company_logo', companyLogo);

      const res = await fetch(`${API_BASE}/tpo/jobs`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      if (res.ok) {
        setPostMsg('Job posted successfully!');
        setTitle(''); setCompany(''); setDescription(''); setEligibility(''); setDeadline('');
        setJobRole(''); setMinCgpa(''); setMinResumeScore(''); setRequiredCerts(''); setPreferredSkills(''); setPackageLpa('');
        setCompanyLogo(null); setLogoPreview('');
        fetchJobs();
      } else {
        const d = await res.json(); setPostMsg(d.detail || 'Failed to post job');
      }
    } catch { setPostMsg('Network error'); }
    finally { setPosting(false); }
  };

  /* ── Handle logo file select ── */
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toaster.create({ title: 'Invalid file type', description: 'Please upload PNG, JPG, or JPEG', type: 'error' });
      return;
    }
    setCompanyLogo(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  /* ── Delete job ── */
  const handleDelete = useCallback(async (jobId) => {
    setSelectedJobForDelete(jobId);
    setShowDeleteModal(true);
  }, []);

  const handleSelectActionJob = useCallback((jobId) => {
    setSelectedActionJobId((prev) => (prev === jobId ? prev : jobId));
  }, []);

  const confirmDeleteJob = async () => {
    if (!selectedJobForDelete) {
      setShowDeleteModal(false);
      return;
    }

    setDeletingJob(true);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${selectedJobForDelete}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toaster.create({ title: data.detail || 'Failed to delete job posting', type: 'error' });
        return;
      }
      setShowDeleteModal(false);
      setSelectedJobForDelete(null);
      fetchJobs();
      toaster.create({ title: 'Job deleted successfully', type: 'success' });
    } catch {
      toaster.create({ title: 'Failed to delete job posting', type: 'error' });
    } finally {
      setDeletingJob(false);
    }
  };

  const cancelDeleteJob = () => {
    if (deletingJob) return;
    setShowDeleteModal(false);
    setSelectedJobForDelete(null);
  };

  /* ── View shortlisted ── */
  const viewShortlisted = useCallback(async (jobId) => {
    setSelectedJobId(jobId); setLoadingShortlisted(true); setTab('shortlisted'); setSelectedStudents([]);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${jobId}/shortlisted`, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const hasSplitLists = Array.isArray(data.auto_shortlisted_students) || Array.isArray(data.manual_shortlisted_students);
        const combinedItems = (data.shortlisted_students || []).map(normalizeShortlistedItem);
        const autoItems = hasSplitLists
          ? (data.auto_shortlisted_students || []).map(normalizeShortlistedItem)
          : combinedItems.filter((item) => (item.source || 'auto') !== 'manual');
        const manualItems = hasSplitLists
          ? (data.manual_shortlisted_students || []).map(normalizeShortlistedItem)
          : combinedItems.filter((item) => item.source === 'manual');
        const normalized = hasSplitLists ? [...autoItems, ...manualItems] : combinedItems;
        setAutoShortlisted(autoItems);
        setManualShortlisted(manualItems);
        setShortlisted(normalized);
        setShortlistedJob(data.job || null);
        setShortlistedTotal(data.total ?? normalized.length);
      }
    } catch { /* */ } finally { setLoadingShortlisted(false); }
  }, [headers]);

  const refreshShortlisted = async (jobId) => {
    if (!jobId) return;
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${jobId}/shortlisted`, { headers, cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const hasSplitLists = Array.isArray(data.auto_shortlisted_students) || Array.isArray(data.manual_shortlisted_students);
      const combinedItems = (data.shortlisted_students || []).map(normalizeShortlistedItem);
      const autoItems = hasSplitLists
        ? (data.auto_shortlisted_students || []).map(normalizeShortlistedItem)
        : combinedItems.filter((item) => (item.source || 'auto') !== 'manual');
      const manualItems = hasSplitLists
        ? (data.manual_shortlisted_students || []).map(normalizeShortlistedItem)
        : combinedItems.filter((item) => item.source === 'manual');
      const normalized = hasSplitLists ? [...autoItems, ...manualItems] : combinedItems;
      setAutoShortlisted(autoItems);
      setManualShortlisted(manualItems);
      setShortlisted(normalized);
      setShortlistedJob(data.job || null);
      setShortlistedTotal(data.total ?? normalized.length);
    } catch {
      // Keep current state on background refresh failure.
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => (
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    ));
  };

  const downloadShortlistedExcel = async () => {
    if (!shortlisted.length) return;
    setLoadingExcel(true);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${selectedJobId}/shortlisted/export`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        let message = 'Failed to download Excel';
        try {
          const data = await res.json();
          message = data.detail || message;
        } catch {
          // Keep generic message when response isn't JSON.
        }
        toaster.create({ title: message, type: 'error' });
        return;
      }

      await triggerZipDownload(res, 'shortlisted_students.xlsx');
      toaster.create({ title: 'Download started', type: 'success' });
    } finally {
      setLoadingExcel(false);
    }
  };

  const renderShortlistedCards = (items, indexOffset = 0) => (
    <VStack gap={3} align="stretch">
      {items.map((item, idx) => (
        <Box key={item.student.id} bg={selectedStudents.includes(item.student.id) ? 'purple.500/10' : 'gray.900'} border="1px solid"
          borderColor={selectedStudents.includes(item.student.id) ? 'purple.500' : 'gray.800'}
          borderRadius="xl" p={5}>
          <Flex justify="space-between" align="flex-start" mb={3}>
            <Box>
              <HStack gap={2} mb={1} align="center">
                <Checkbox
                  checked={selectedStudents.includes(item.student.id)}
                  onCheckedChange={() => toggleStudentSelection(item.student.id)}
                />
                <Badge colorPalette="purple" fontSize="xs">#{indexOffset + idx + 1}</Badge>
                <Heading size="sm" color="gray.100">{item.student.name}</Heading>
              </HStack>
              <Text fontSize="xs" color="gray.500">{item.student.email}</Text>
            </Box>
            <Box textAlign="center" bg="purple.500/15" px={3} py={2} borderRadius="lg">
              <Text fontWeight="700" color="purple.300" fontSize="lg">{item.match_score}%</Text>
              <Text fontSize="xs" color="gray.400">Match</Text>
            </Box>
          </Flex>
          <Flex flexWrap="wrap" gap={2} mb={2}>
            {item.student.cgpa != null && <Badge colorPalette="blue" fontSize="xs">CGPA: {item.student.cgpa}</Badge>}
            {item.student.mobile_number && <Badge colorPalette="gray" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Phone /></Icon>{item.student.mobile_number}</Badge>}
            <HStack gap={2}>
              <Badge colorPalette="green" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><FileText /></Icon>Resume: {item.student.resume_score}</Badge>
              <Button
                size="sm"
                colorPalette="green"
                variant="outline"
                loading={loadingResumeId === item.student.id}
                loadingText="Opening..."
                onClick={() => handleViewResume(item.student)}
              >
                View Resume
              </Button>
            </HStack>
          </Flex>
          {item.matched_skills?.length > 0 && (
            <Box mb={2}>
              <Text fontSize="xs" color="gray.500" mb={1}>Matched Skills:</Text>
              <Flex flexWrap="wrap" gap={1}>
                {item.matched_skills.map((s, i) => (
                  <Badge key={i} colorPalette="green" fontSize="xs" variant="subtle">{s}</Badge>
                ))}
              </Flex>
            </Box>
          )}
          {item.student.certifications && (
            <Box mb={2}>
              <Text fontSize="xs" color="gray.500" mb={1}>Certifications:</Text>
              <Flex flexWrap="wrap" gap={1}>
                {item.student.certifications.split(',').map((c, i) => (
                  <Badge key={i} fontSize="xs"
                    colorPalette={item.matched_certifications?.includes(c.trim().toLowerCase()) ? 'green' : 'gray'}
                  >
                    {c.trim()}
                  </Badge>
                ))}
              </Flex>
            </Box>
          )}
          {item.student.preferred_job_roles && (
            <Text fontSize="xs" color="gray.500">
              Preferred: <Text as="span" color="gray.300">{item.student.preferred_job_roles}</Text>
            </Text>
          )}
        </Box>
      ))}
    </VStack>
  );

  const closeResumeViewer = () => {
    setResumeViewerOpen(false);
    setResumeViewerUrl('');
    setResumeViewerStudent('');
  };

  const normalizeResumeUrl = (rawUrl) => {
    if (!rawUrl || !String(rawUrl).trim()) return '';
    const url = String(rawUrl).trim();
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return '';
  };

  const handleViewResume = (student) => {
    const studentId = student.id || '';
    const rawResumeUrl = student.resume_url;
    setLoadingResumeId(studentId);

    if (!rawResumeUrl) {
      setResumeViewerUrl('');
      setResumeViewerStudent('');
      setResumeViewerOpen(false);
      toaster.create({ title: 'Resume not uploaded', type: 'error' });
      setLoadingResumeId('');
      return;
    }

    const resolvedUrl = normalizeResumeUrl(rawResumeUrl);
    if (!resolvedUrl) {
      toaster.create({ title: 'Resume not uploaded', type: 'error' });
      setLoadingResumeId('');
      return;
    }

    const openUrl = `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const openedWindow = window.open(openUrl, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      toaster.create({ title: 'Unable to open resume. Please allow popups and try again.', type: 'error' });
      setLoadingResumeId('');
      return;
    }

    setResumeViewerUrl(openUrl);
    setResumeViewerStudent(student.name || 'Student');
    setResumeViewerOpen(false);
    setLoadingResumeId('');
  };

  const downloadViewedResume = () => {
    if (!resumeViewerUrl) return;
    const safeName = (resumeViewerStudent || 'resume').replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'resume';
    const anchor = document.createElement('a');
    anchor.href = resumeViewerUrl;
    anchor.download = `${safeName}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  /* ── View interested students ── */
  const viewInterested = useCallback(async (jobId) => {
    setSelectedJobId(jobId); setLoadingInterested(true); setTab('interested');
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${jobId}/interested-students`, { headers });
      if (res.ok) {
        const data = await res.json();
        setInterestedStudents(data.students || []);
        setInterestedJob(data.job || null);
        setInterestedTotal(data.total || 0);
      }
    } catch { /* */ } finally { setLoadingInterested(false); }
  }, [headers]);

  /* ── Export interested students as Excel ── */
  const exportExcel = async () => {
    if (!selectedJobId) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${selectedJobId}/interested-students/export`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interested_students.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toaster.create({ title: 'Download started', type: 'success' });
      }
    } catch { toaster.create({ title: 'Export failed', type: 'error' }); }
    finally { setExporting(false); }
  };

  const handleShortlistStudent = async (studentId) => {
    if (!selectedJobId || !studentId) return;

    if (shortlisted.some((item) => (item.student?.id || item.id) === studentId)) {
      toaster.create({ title: 'Student already shortlisted', type: 'info' });
      return;
    }

    setShortlistingStudentId(studentId);
    try {
      const studentToAppend = interestedStudents.find((s) => s.id === studentId);
      const res = await fetch(`${API_BASE}/jobs/shortlist-student`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ job_id: selectedJobId, student_id: studentId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toaster.create({ title: data.detail || 'Failed to shortlist student', type: 'error' });
        return;
      }

      const result = await res.json().catch(() => ({}));
      if (result?.already_shortlisted) {
        toaster.create({ title: 'Student already shortlisted', type: 'info' });
        refreshShortlisted(selectedJobId);
        return;
      }

      if (studentToAppend) {
        const appended = normalizeShortlistedItem({
          student: {
            id: studentToAppend.id,
            name: studentToAppend.name,
            email: studentToAppend.email,
            mobile_number: '',
            cgpa: studentToAppend.cgpa,
            certifications: '',
            preferred_job_roles: '',
            resume_text: '',
            resume_score: studentToAppend.resume_score,
            resume_url: '',
          },
          match_score: 0,
          matched_skills: [],
          matched_certifications: [],
          source: 'manual',
        });

        setManualShortlisted((prev) => {
          if (prev.some((item) => (item.student?.id || item.id) === studentId)) return prev;
          return [...prev, appended];
        });
        setShortlisted((prev) => {
          if (prev.some((item) => (item.student?.id || item.id) === studentId)) return prev;
          return [...prev, appended];
        });
      }

      setInterestedStudents((prev) => prev.filter((s) => s.id !== studentId));
      setInterestedTotal((prev) => Math.max(0, prev - 1));
      refreshShortlisted(selectedJobId);
      toaster.create({ title: 'Student shortlisted', type: 'success' });
    } catch {
      toaster.create({ title: 'Failed to shortlist student', type: 'error' });
    } finally {
      setShortlistingStudentId('');
    }
  };

  const handleShortlistAll = async () => {
    if (!selectedJobId || interestedStudents.length === 0) return;

    const existingShortlistedIds = new Set(shortlisted.map((item) => item.student?.id || item.id));
    const studentsToShortlist = interestedStudents.filter((s) => !existingShortlistedIds.has(s.id));

    if (studentsToShortlist.length === 0) {
      toaster.create({ title: 'All selected students are already shortlisted', type: 'info' });
      return;
    }

    setShortlistingAll(true);
    try {
      const studentIds = studentsToShortlist.map((s) => s.id);
      const res = await fetch(`${API_BASE}/jobs/shortlist-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ job_id: selectedJobId, student_ids: studentIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toaster.create({ title: data.detail || 'Failed to shortlist all students', type: 'error' });
        return;
      }

      const additions = studentsToShortlist.map((s) => normalizeShortlistedItem({
        student: {
          id: s.id,
          name: s.name,
          email: s.email,
          mobile_number: '',
          cgpa: s.cgpa,
          certifications: '',
          preferred_job_roles: '',
          resume_text: '',
          resume_score: s.resume_score,
          resume_url: '',
        },
        match_score: 0,
        matched_skills: [],
        matched_certifications: [],
        source: 'manual',
      }));

      setManualShortlisted((prev) => {
        const existingIds = new Set(prev.map((item) => item.student?.id || item.id));
        const newItems = additions.filter((item) => !existingIds.has(item.student.id));
        return newItems.length ? [...prev, ...newItems] : prev;
      });
      setShortlisted((prev) => {
        const existingIds = new Set(prev.map((item) => item.student?.id || item.id));
        const newItems = additions.filter((item) => !existingIds.has(item.student.id));
        return newItems.length ? [...prev, ...newItems] : prev;
      });

      const shortlistedIdSet = new Set(studentIds);
      setInterestedStudents((prev) => prev.filter((s) => !shortlistedIdSet.has(s.id)));
      setInterestedTotal((prev) => Math.max(0, prev - studentIds.length));
      refreshShortlisted(selectedJobId);
      toaster.create({ title: 'All interested students shortlisted', type: 'success' });
    } catch {
      toaster.create({ title: 'Failed to shortlist all students', type: 'error' });
    } finally {
      setShortlistingAll(false);
    }
  };

  /* ── Notify shortlisted students ── */
  const notifyShortlisted = async () => {
    if (!selectedJobId) return;
    if (selectedStudents.length === 0) {
      toaster.create({ title: 'Please select at least one student.', type: 'warning' });
      return;
    }
    setNotifying(true);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${selectedJobId}/notify-shortlisted`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ student_ids: selectedStudents, job_id: selectedJobId }),
      });
      if (res.ok) {
        const data = await res.json();
        toaster.create({ title: data.message, type: 'success' });
        setSelectedStudents([]);
      } else {
        const data = await res.json();
        toaster.create({ title: data.detail || 'Failed to send notifications', type: 'error' });
      }
    } catch { toaster.create({ title: 'Failed to send notifications', type: 'error' }); }
    finally { setNotifying(false); }
  };

  const triggerZipDownload = async (res, fallbackName) => {
    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition') || '';
    const match = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    const filename = (match?.[1] || fallbackName).trim();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const downloadAllResumes = async () => {
    if (!selectedJobId) return;
    setLoadingAllResumes(true);
    try {
      const res = await fetch(`${API_BASE}/resumes/download-all?job_id=${encodeURIComponent(selectedJobId)}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        let message = 'Failed to download resumes';
        try {
          const data = await res.json();
          message = data.detail || message;
        } catch {
          // Keep generic message when response isn't JSON.
        }
        toaster.create({ title: message, type: 'error' });
        return;
      }
      await triggerZipDownload(res, 'shortlisted_all_resumes.zip');
      toaster.create({ title: 'Download started', type: 'success' });
    } catch {
      toaster.create({ title: 'Failed to download resumes', type: 'error' });
    } finally {
      setLoadingAllResumes(false);
    }
  };

  const downloadSelectedResumes = async () => {
    if (!selectedStudents.length) {
      toaster.create({ title: 'Please select at least one student.', type: 'warning' });
      return;
    }
    setLoadingSelectedResumes(true);
    try {
      const res = await fetch(`${API_BASE}/resumes/download-selected`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ student_ids: selectedStudents, job_id: selectedJobId }),
      });
      if (!res.ok) {
        let message = 'Failed to download selected resumes';
        try {
          const data = await res.json();
          message = data.detail || message;
        } catch {
          // Keep generic message when response isn't JSON.
        }
        toaster.create({ title: message, type: 'error' });
        return;
      }
      await triggerZipDownload(res, 'shortlisted_selected_resumes.zip');
      toaster.create({ title: 'Download started', type: 'success' });
    } catch {
      toaster.create({ title: 'Failed to download selected resumes', type: 'error' });
    } finally {
      setLoadingSelectedResumes(false);
    }
  };

  const NAV = [
    { key: 'post', label: 'Post Job' },
    { key: 'jobs', label: 'My Jobs' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'interested', label: 'Interested' },
  ];
  const isPreparingResumes = loadingAllResumes || loadingSelectedResumes;
  const downloadButtonLabel = loadingExcel
    ? 'Preparing Excel...'
    : isPreparingResumes
      ? 'Preparing resumes...'
      : 'Download';
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredJobs = useMemo(() => jobs.filter((job) => {
    if (!normalizedSearchQuery) return true;

    const searchableFields = [
      job.title,
      job.company,
      job.job_role,
      job.eligibility,
      job.description,
      job.required_certifications,
      job.preferred_skills,
      job.deadline,
      job.package_lpa != null ? `${job.package_lpa}` : '',
      job.package_lpa != null ? `${job.package_lpa} lpa` : '',
      job.min_cgpa != null ? `${job.min_cgpa}` : '',
      job.min_resume_score != null ? `${job.min_resume_score}` : '',
    ];

    const directMatch = searchableFields.some((value) => (
      String(value || '').toLowerCase().includes(normalizedSearchQuery)
    ));

    if (directMatch) return true;

    // Optional keyword mapping for natural search phrases.
    if (normalizedSearchQuery === 'high package') {
      return Number(job.package_lpa || 0) > 10;
    }
    if (normalizedSearchQuery === 'low cgpa') {
      return Number(job.min_cgpa || 0) > 0 && Number(job.min_cgpa || 0) < 7;
    }

    return false;
  }), [jobs, normalizedSearchQuery]);

  const renderedJobs = useMemo(() => (
    filteredJobs.map((j) => (
      <JobPostingCard
        key={j.id}
        job={j}
        token={token}
        inputStyles={inputStyles}
        isSelected={selectedActionJobId === j.id}
        onSelect={handleSelectActionJob}
        onViewShortlisted={viewShortlisted}
        onViewInterested={viewInterested}
        onDelete={handleDelete}
      />
    ))
  ), [filteredJobs, handleDelete, handleSelectActionJob, inputStyles, selectedActionJobId, token, viewInterested, viewShortlisted]);

  return (
    <Flex h="100vh" bg="gray.950">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <Box
          position="fixed" top={0} left={0} w="100vw" h="100vh" bg="blackAlpha.700" zIndex={90}
          display={{ md: 'none' }} onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Box
        as="nav" w="240px" minW="240px" h="100vh" bg="gray.900"
        borderRight="1px solid" borderColor="gray.800" py={4}
        display={{ base: mobileMenuOpen ? 'flex' : 'none', md: 'flex' }}
        position={{ base: 'fixed', md: 'relative' }}
        zIndex={100}
        flexDirection="column"
      >
        <HStack px={4} mb={6} gap={2}>
          <Text fontSize="xl" fontWeight="800" color="purple.400" letterSpacing="-0.5px">
            HireReady
          </Text>
          <Badge colorPalette="purple" fontSize="xs">TPO</Badge>
        </HStack>

        <VStack gap={1} px={2} flex={1}>
          {NAV.map((item) => {
            const isActive = tab === item.key;
            const needsJob = (item.key === 'shortlisted' || item.key === 'interested') && !selectedJobId;
            return (
              <Button
                key={item.key}
                variant="ghost" w="full" justifyContent="flex-start" px={3} py={2} h="44px"
                bg={isActive ? 'purple.500/15' : 'transparent'}
                color={isActive ? 'purple.300' : 'gray.400'}
                _hover={{ bg: 'gray.800', color: 'gray.100' }}
                borderRadius="lg" fontSize="sm" fontWeight={isActive ? '600' : '400'}
                onClick={() => { if (needsJob) return; setTab(item.key); setMobileMenuOpen(false); }}
                opacity={needsJob ? 0.4 : 1}
                cursor={needsJob ? 'not-allowed' : 'pointer'}
              >
                {item.label}
              </Button>
            );
          })}
        </VStack>
      </Box>

      {/* Main */}
      <Flex direction="column" flex={1} overflow="hidden">
        {/* Header */}
        <Flex h="60px" px={{ base: 4, md: 6 }} bg="gray.900/60" borderBottom="1px solid" borderColor="gray.800"
          align="center" justify="space-between" backdropFilter="blur(8px)" flexShrink={0}
        >
          <HStack gap={3}>
            <Button
              display={{ base: 'flex', md: 'none' }}
              variant="ghost"
              size="sm"
              color="gray.400"
              p={1}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Icon asChild w={5} h={5}><MenuIcon /></Icon>
            </Button>
            <Heading size={{ base: "sm", md: "md" }} color="gray.100">{NAV.find(n => n.key === tab)?.label || 'Dashboard'}</Heading>
          </HStack>
          <MenuRoot>
            <MenuTrigger asChild>
              <Button variant="ghost" p={0} borderRadius="full" _hover={{ bg: 'gray.800' }}>
                <HStack gap={2}>
                  <Text fontSize="sm" color="gray.400">{user?.name || 'TPO'}</Text>
                  <Avatar name={user?.name || 'T'} size="sm" bg="purple.500" color="white" />
                </HStack>
              </Button>
            </MenuTrigger>
            <MenuContent bg="gray.800" borderColor="gray.700">
              <MenuItem value="logout" onClick={onLogout} color="red.300" _hover={{ bg: 'gray.700' }}>
                <Icon asChild w={4} h={4} mr={2}><LogOut /></Icon> Logout
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </Flex>

        {/* Content */}
        <Box flex={1} overflow="auto" p={6}>
          {/* ═══ Post Job ═══ */}
          {tab === 'post' && (
            <Box maxW="700px" mx="auto">
              <Heading size="lg" color="gray.100" mb={4}>Post a New Job</Heading>
              {postMsg && (
                <Alert status={postMsg.includes('success') ? 'success' : 'error'} title={postMsg}
                  borderRadius="lg" mb={4} />
              )}
              <form onSubmit={handlePostJob}>
                <VStack gap={4} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field label="Job Title *">
                      <Input value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Software Engineer Intern" required {...inputStyles} />
                    </Field>
                    <Field label="Company *">
                      <Input value={company} onChange={e => setCompany(e.target.value)}
                        placeholder="e.g. Google" required {...inputStyles} />
                    </Field>
                  </SimpleGrid>
                  <Field label="Description">
                    <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Job responsibilities, tech stack, etc." {...inputStyles} />
                  </Field>

                  {/* Company Logo Upload */}
                  <Field label="Company Logo" helperText="PNG, JPG or JPEG (optional)">
                    <Flex align="center" gap={3}>
                      <Button
                        as="label"
                        htmlFor="logo-upload"
                        size="sm"
                        variant="outline"
                        colorPalette="purple"
                        cursor="pointer"
                      >
                        <Icon asChild w={4} h={4} mr={1}><Upload /></Icon>
                        {companyLogo ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={handleLogoSelect}
                      />
                      {logoPreview && (
                        <Box w="40px" h="40px" borderRadius="md" overflow="hidden" bg="gray.800">
                          <Image src={logoPreview} alt="Logo preview" w="full" h="full" objectFit="contain" />
                        </Box>
                      )}
                      {companyLogo && (
                        <Text fontSize="xs" color="gray.400">{companyLogo.name}</Text>
                      )}
                    </Flex>
                  </Field>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field label="Job Role / Category">
                      <Input value={jobRole} onChange={e => setJobRole(e.target.value)}
                        placeholder="e.g. Backend Developer" {...inputStyles} />
                    </Field>
                    <Field label="Min CGPA (out of 10)">
                      <Input type="number" step="0.1" min="0" max="10" value={minCgpa}
                        onChange={e => setMinCgpa(e.target.value)} placeholder="e.g. 7.0" {...inputStyles} />
                    </Field>
                  </SimpleGrid>
                  <Field label="Minimum Resume Score" helperText="Maximum is automatically considered as 100">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={minResumeScore}
                      onChange={e => setMinResumeScore(e.target.value)}
                      placeholder="e.g. 60"
                      {...inputStyles}
                    />
                  </Field>
                  <Field label="Required Certifications" helperText="Leave blank if none required">
                    <Input value={requiredCerts} onChange={e => setRequiredCerts(e.target.value)}
                      placeholder="e.g. AWS Cloud Practitioner" {...inputStyles} />
                  </Field>
                  <Field label="Preferred Skills" helperText="Used for automatic skill matching">
                    <Input value={preferredSkills} onChange={e => setPreferredSkills(e.target.value)}
                      placeholder="e.g. Python, React, Machine Learning" {...inputStyles} />
                  </Field>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field label="Package (LPA)" helperText="Annual package in Lakhs">
                      <Input type="number" step="0.1" min="0" value={packageLpa}
                        onChange={e => setPackageLpa(e.target.value)} placeholder="e.g. 12.0" {...inputStyles} />
                    </Field>
                    <Field label="Eligibility">
                      <Input value={eligibility} onChange={e => setEligibility(e.target.value)}
                        placeholder="e.g. B.Tech CS, 2025 batch" {...inputStyles} />
                    </Field>
                  </SimpleGrid>
                  <Field label="Deadline">
                    <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} {...inputStyles} />
                  </Field>
                  <Button type="submit" colorPalette="purple" size="lg" w="full" loading={posting} loadingText="Posting…">
                    Post Job
                  </Button>
                </VStack>
              </form>
            </Box>
          )}

          {/* ═══ My Jobs ═══ */}
          {tab === 'jobs' && (
            <Box>
              <Heading size="lg" color="gray.100" mb={4}>My Job Postings</Heading>
              <HStack justify="space-between" align="center" mb={6}>
                <Input
                  type="text"
                  placeholder="Search jobs by title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxW="320px"
                  {...inputStyles}
                />
              </HStack>
              {loadingJobs ? (
                <Flex justify="center" py={8}><Spinner color="purple.400" size="xl" /></Flex>
              ) : jobs.length === 0 ? (
                <Flex direction="column" align="center" justify="center" h="200px" gap={3}>
                  <Text color="gray.500">No jobs posted yet.</Text>
                  <Button colorPalette="purple" onClick={() => setTab('post')}>Post Your First Job</Button>
                </Flex>
              ) : filteredJobs.length === 0 ? (
                <Text color="gray.500" mt={6}>No jobs found.</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  {renderedJobs}
                </SimpleGrid>
              )}
            </Box>
          )}

          {/* ═══ Interested Students ═══ */}
          {tab === 'interested' && (
            <Box>
              <Button variant="ghost" size="sm" color="gray.400" mb={3}
                onClick={() => setTab('jobs')} _hover={{ color: 'gray.100' }}>
                <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back to jobs
              </Button>
              <Flex justify="space-between" align="center" mb={4}>
                <Box>
                  <Heading size="lg" color="gray.100" mb={1}>Interested Students</Heading>
                  {interestedJob && (
                    <Text color="gray.400" fontSize="sm">
                      {interestedJob.title} — {interestedJob.company} • {interestedTotal} student{interestedTotal !== 1 ? 's' : ''}
                    </Text>
                  )}
                </Box>
                <HStack gap={2}>
                  {interestedStudents.length > 0 && (
                    <Button
                      size="sm"
                      colorPalette="purple"
                      variant="outline"
                      loading={shortlistingAll}
                      loadingText="Shortlisting..."
                      onClick={handleShortlistAll}
                    >
                      Shortlist All
                    </Button>
                  )}
                  {interestedStudents.length > 0 && (
                    <Button size="sm" colorPalette="green" variant="outline" loading={exporting}
                      loadingText="Exporting…" onClick={exportExcel}>
                      <Icon asChild w={4} h={4} mr={1}><Download /></Icon> Download Excel
                    </Button>
                  )}
                </HStack>
              </Flex>

              {loadingInterested ? (
                <Flex justify="center" py={8}><Spinner color="purple.400" size="xl" /></Flex>
              ) : interestedStudents.length === 0 ? (
                <Text color="gray.500">No students have shown interest yet.</Text>
              ) : (
                <Box bg="gray.900" border="1px solid" borderColor="gray.800" borderRadius="xl" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="gray.800">
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>#</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>Student Name</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>Roll Number</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>Division</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>Email</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>Resume Score</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>CGPA</Table.ColumnHeader>
                        <Table.ColumnHeader color="gray.300" px={4} py={3}>Action</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {interestedStudents.map((s, idx) => (
                        <Table.Row key={s.id} _hover={{ bg: 'gray.800/50' }}>
                          <Table.Cell color="gray.400" px={4} py={3}>{idx + 1}</Table.Cell>
                          <Table.Cell color="gray.100" px={4} py={3} fontWeight="500">{s.name}</Table.Cell>
                          <Table.Cell color="gray.300" px={4} py={3}>{s.moodle_id || '—'}</Table.Cell>
                          <Table.Cell color="gray.300" px={4} py={3}>{s.division || '—'}</Table.Cell>
                          <Table.Cell color="gray.300" px={4} py={3}>{s.email}</Table.Cell>
                          <Table.Cell px={4} py={3}>
                            <Badge colorPalette={s.resume_score >= 70 ? 'green' : s.resume_score >= 50 ? 'yellow' : 'red'} fontSize="xs">
                              {s.resume_score}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell px={4} py={3}>
                            <Badge colorPalette={s.cgpa >= 7 ? 'green' : s.cgpa >= 5 ? 'yellow' : 'red'} fontSize="xs">
                              {s.cgpa}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell px={4} py={3}>
                            <Button
                              size="xs"
                              colorPalette="purple"
                              variant="outline"
                              loading={shortlistingStudentId === s.id}
                              loadingText="Shortlisting..."
                              onClick={() => handleShortlistStudent(s.id)}
                            >
                              Shortlist
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}
            </Box>
          )}

          {/* ═══ Shortlisted Students ═══ */}
          {tab === 'shortlisted' && (
            <Box>
              <Button variant="ghost" size="sm" color="gray.400" mb={3}
                onClick={() => setTab('jobs')} _hover={{ color: 'gray.100' }}>
                <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back to jobs
              </Button>
              <Flex justify="space-between" align="center" mb={3}>
                <Box />
                {shortlisted.length > 0 && (
                  <HStack gap={2}>
                    <MenuRoot>
                      <MenuTrigger asChild>
                        <Button size="sm" colorPalette="green" variant="outline" loading={loadingExcel || isPreparingResumes} loadingText={downloadButtonLabel}>
                          <Icon asChild w={4} h={4} mr={1}><Download /></Icon>
                          {downloadButtonLabel}
                          <Icon asChild w={4} h={4} ml={1}><ChevronDown /></Icon>
                        </Button>
                      </MenuTrigger>
                      <MenuContent bg="gray.800" borderColor="gray.700">
                        <MenuItem value="download-excel" onClick={downloadShortlistedExcel} disabled={loadingExcel || isPreparingResumes}>
                          {loadingExcel ? 'Preparing Excel...' : 'Download Excel'}
                        </MenuItem>
                        <MenuItem value="download-all-resumes" onClick={downloadAllResumes} disabled={loadingExcel || loadingAllResumes || loadingSelectedResumes}>
                          {loadingAllResumes ? 'Preparing resumes...' : 'Download All Resumes'}
                        </MenuItem>
                        <MenuItem value="download-selected-resumes" onClick={downloadSelectedResumes} disabled={loadingExcel || loadingAllResumes || loadingSelectedResumes}>
                          {loadingSelectedResumes ? 'Preparing resumes...' : 'Download Selected Resumes'}
                        </MenuItem>
                      </MenuContent>
                    </MenuRoot>
                    <Button size="sm" colorPalette="purple" variant="solid" loading={notifying}
                      loadingText="Sending…" onClick={notifyShortlisted}>
                      <Icon asChild w={4} h={4} mr={1}><Bell /></Icon>
                      Notify Selected Students
                    </Button>
                  </HStack>
                )}
              </Flex>

              {shortlistedJob && (
                <Box bg="gray.900" border="1px solid" borderColor="gray.800" borderRadius="xl" p={4} mb={4}>
                  <Heading size="sm" color="gray.100">{shortlistedJob.title} — {shortlistedJob.company}</Heading>
                  <Flex flexWrap="wrap" gap={2} mt={2}>
                    {shortlistedJob.job_role && <Badge colorPalette="purple" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Target /></Icon>{shortlistedJob.job_role}</Badge>}
                    {shortlistedJob.min_cgpa != null && <Badge colorPalette="blue" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><BarChart3 /></Icon>Min CGPA: {shortlistedJob.min_cgpa}</Badge>}
                    {shortlistedJob.required_certifications && <Badge colorPalette="teal" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Award /></Icon>{shortlistedJob.required_certifications}</Badge>}
                    {shortlistedJob.preferred_skills && <Badge colorPalette="cyan" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Lightbulb /></Icon>{shortlistedJob.preferred_skills}</Badge>}
                  </Flex>
                  <Text color="gray.400" fontSize="sm" mt={2}>
                    {shortlistedTotal} student{shortlistedTotal !== 1 ? 's' : ''} shortlisted
                  </Text>
                </Box>
              )}

              {loadingShortlisted ? (
                <Flex justify="center" py={8}><Spinner color="purple.400" size="xl" /></Flex>
              ) : shortlisted.length === 0 ? (
                <Text color="gray.500">No students shortlisted yet.</Text>
              ) : (
                <VStack gap={4} align="stretch">
                  <Heading size="md" color="gray.100">Auto-Shortlisted Students</Heading>
                  {autoShortlisted.length > 0 ? (
                    renderShortlistedCards(autoShortlisted, 0)
                  ) : (
                    <Text color="gray.500" fontSize="sm">No auto-shortlisted students for this job.</Text>
                  )}

                  <Heading size="md" color="gray.100">Interested Shortlisted Students</Heading>
                  {manualShortlisted.length > 0 ? (
                    renderShortlistedCards(manualShortlisted, autoShortlisted.length)
                  ) : (
                    <Text color="gray.500" fontSize="sm">No manually shortlisted students from Interested yet.</Text>
                  )}
                </VStack>
              )}
            </Box>
          )}

          <DialogRoot open={resumeViewerOpen} onOpenChange={(e) => { if (!e.open) closeResumeViewer(); }} size="xl">
            <DialogContent bg="gray.900" border="1px solid" borderColor="gray.700" maxW="80vw" w="80vw">
              <DialogHeader>
                <HStack w="full" justify="space-between" align="center" pr={8}>
                  <DialogTitle color="gray.100">{resumeViewerStudent} Resume</DialogTitle>
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      colorPalette="blue"
                      variant="outline"
                      onClick={() => window.open(resumeViewerUrl, '_blank', 'noopener,noreferrer')}
                      disabled={!resumeViewerUrl}
                    >
                      Open in New Tab
                    </Button>
                    <Button size="sm" colorPalette="green" variant="outline" onClick={downloadViewedResume}>
                      <Icon asChild w={4} h={4} mr={1}><Download /></Icon>
                      Download Resume
                    </Button>
                  </HStack>
                </HStack>
              </DialogHeader>
              <DialogCloseTrigger />
              <DialogBody pb={4}>
                {resumeViewerUrl ? (
                  <Box
                    as="iframe"
                    src={resumeViewerUrl}
                    title="Student Resume"
                    w="100%"
                    h="70vh"
                    border="0"
                    borderRadius="md"
                  />
                ) : (
                  <Text color="gray.400">Resume not uploaded</Text>
                )}
              </DialogBody>
            </DialogContent>
          </DialogRoot>

          <ConfirmationModal
            isOpen={showDeleteModal}
            title="Delete Job Posting"
            message="Are you sure you want to delete this job?"
            onConfirm={confirmDeleteJob}
            onCancel={cancelDeleteJob}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            isLoading={deletingJob}
          />
        </Box>
      </Flex>
    </Flex>
  );
}
