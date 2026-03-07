import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Input, Button, VStack, HStack,
  SimpleGrid, Badge, Spinner, Textarea, Icon,
} from '@chakra-ui/react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import {
  MenuContent, MenuItem, MenuRoot, MenuTrigger,
} from '@/components/ui/menu';
import { Avatar } from '@/components/ui/avatar';
import {
  LogOut, Target, BarChart3, DollarSign, CalendarClock,
  Award, Lightbulb, Phone, FileText, ChevronLeft,
} from 'lucide-react';

const API_BASE = '/api';

export default function TpoDashboard({ token, user, onLogout }) {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  /* New-job form */
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [requiredCerts, setRequiredCerts] = useState('');
  const [preferredSkills, setPreferredSkills] = useState('');
  const [packageLpa, setPackageLpa] = useState('');
  const [deadline, setDeadline] = useState('');
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState('');

  /* Shortlisted */
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [shortlisted, setShortlisted] = useState([]);
  const [shortlistedJob, setShortlistedJob] = useState(null);
  const [loadingShortlisted, setLoadingShortlisted] = useState(false);
  const [shortlistedTotal, setShortlistedTotal] = useState(0);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const inputStyles = {
    bg: 'gray.800', border: '1px solid', borderColor: 'gray.700',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' },
  };

  /* ── Fetch jobs ── */
  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs`, { headers });
      if (res.ok) { const data = await res.json(); setJobs(data.jobs || []); }
    } catch { /* */ } finally { setLoadingJobs(false); }
  };
  useEffect(() => { fetchJobs(); }, []);

  /* ── Post job ── */
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return;
    setPosting(true); setPostMsg('');
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs`, {
        method: 'POST', headers,
        body: JSON.stringify({
          title, company, description, eligibility, deadline,
          job_role: jobRole,
          min_cgpa: minCgpa ? parseFloat(minCgpa) : null,
          required_certifications: requiredCerts,
          preferred_skills: preferredSkills,
          package_lpa: packageLpa ? parseFloat(packageLpa) : null,
        }),
      });
      if (res.ok) {
        setPostMsg('Job posted successfully!');
        setTitle(''); setCompany(''); setDescription(''); setEligibility(''); setDeadline('');
        setJobRole(''); setMinCgpa(''); setRequiredCerts(''); setPreferredSkills(''); setPackageLpa('');
        fetchJobs();
      } else {
        const d = await res.json(); setPostMsg(d.detail || 'Failed to post job');
      }
    } catch { setPostMsg('Network error'); }
    finally { setPosting(false); }
  };

  /* ── Delete job ── */
  const handleDelete = async (jobId) => {
    if (!confirm('Delete this job posting?')) return;
    await fetch(`${API_BASE}/tpo/jobs/${jobId}`, { method: 'DELETE', headers });
    fetchJobs();
  };

  /* ── View shortlisted ── */
  const viewShortlisted = async (jobId) => {
    setSelectedJobId(jobId); setLoadingShortlisted(true); setTab('shortlisted');
    try {
      const res = await fetch(`${API_BASE}/tpo/jobs/${jobId}/shortlisted`, { headers });
      if (res.ok) {
        const data = await res.json();
        setShortlisted(data.shortlisted_students || []);
        setShortlistedJob(data.job || null);
        setShortlistedTotal(data.total || 0);
      }
    } catch { /* */ } finally { setLoadingShortlisted(false); }
  };

  const NAV = [
    { key: 'post', label: 'Post Job' },
    { key: 'jobs', label: 'My Jobs' },
    { key: 'shortlisted', label: 'Shortlisted' },
  ];

  return (
    <Flex h="100vh" bg="gray.950">
      {/* Sidebar */}
      <Box
        as="nav" w="240px" minW="240px" h="100vh" bg="gray.900"
        borderRight="1px solid" borderColor="gray.800" py={4}
        display="flex" flexDirection="column"
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
            return (
              <Button
                key={item.key}
                variant="ghost" w="full" justifyContent="flex-start" px={3} py={2} h="44px"
                bg={isActive ? 'purple.500/15' : 'transparent'}
                color={isActive ? 'purple.300' : 'gray.400'}
                _hover={{ bg: 'gray.800', color: 'gray.100' }}
                borderRadius="lg" fontSize="sm" fontWeight={isActive ? '600' : '400'}
                onClick={() => { if (item.key === 'shortlisted' && !selectedJobId) return; setTab(item.key); }}
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
        <Flex h="60px" px={6} bg="gray.900/60" borderBottom="1px solid" borderColor="gray.800"
          align="center" justify="space-between" backdropFilter="blur(8px)" flexShrink={0}
        >
          <Heading size="md" color="gray.100">{NAV.find(n => n.key === tab)?.label || 'Dashboard'}</Heading>
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
              {loadingJobs ? (
                <Flex justify="center" py={8}><Spinner color="purple.400" size="xl" /></Flex>
              ) : jobs.length === 0 ? (
                <Flex direction="column" align="center" justify="center" h="200px" gap={3}>
                  <Text color="gray.500">No jobs posted yet.</Text>
                  <Button colorPalette="purple" onClick={() => setTab('post')}>Post Your First Job</Button>
                </Flex>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  {jobs.map(j => (
                    <Box key={j.id} bg="gray.900" border="1px solid" borderColor="gray.800"
                      borderRadius="xl" p={5}>
                      <Heading size="sm" color="gray.100" mb={1}>{j.title}</Heading>
                      <Text color="purple.400" fontSize="sm" fontWeight="500" mb={2}>{j.company}</Text>
                      {j.description && <Text color="gray.400" fontSize="sm" mb={3} lineClamp={2}>{j.description}</Text>}
                      <Flex flexWrap="wrap" gap={2} mb={3}>
                      {j.job_role && <Badge colorPalette="purple" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Target /></Icon>{j.job_role}</Badge>}
                        {j.min_cgpa != null && <Badge colorPalette="blue" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><BarChart3 /></Icon>Min CGPA: {j.min_cgpa}</Badge>}
                        {j.package_lpa != null && <Badge colorPalette="green" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><DollarSign /></Icon>{j.package_lpa} LPA</Badge>}
                        {j.deadline && <Badge colorPalette="orange" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><CalendarClock /></Icon>{j.deadline}</Badge>}
                      </Flex>
                      <HStack gap={2}>
                        <Button size="sm" colorPalette="blue" variant="outline" flex={1}
                          onClick={() => viewShortlisted(j.id)}>View Shortlisted</Button>
                        <Button size="sm" colorPalette="red" variant="ghost"
                          onClick={() => handleDelete(j.id)}>Delete</Button>
                      </HStack>
                    </Box>
                  ))}
                </SimpleGrid>
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
              <Heading size="lg" color="gray.100" mb={3}>Auto-Shortlisted Students</Heading>
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
                <Text color="gray.500">No students match the shortlisting criteria.</Text>
              ) : (
                <VStack gap={3} align="stretch">
                  {shortlisted.map((item, idx) => (
                    <Box key={item.student.id} bg="gray.900" border="1px solid" borderColor="gray.800"
                      borderRadius="xl" p={5}>
                      <Flex justify="space-between" align="flex-start" mb={3}>
                        <Box>
                          <HStack gap={2} mb={1}>
                            <Badge colorPalette="purple" fontSize="xs">#{idx + 1}</Badge>
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
                        <Badge colorPalette="green" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><FileText /></Icon>Resume: {item.student.resume_score}</Badge>
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
              )}
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
