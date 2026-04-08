import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid, Badge, VStack, HStack, Icon, Button, Image, Textarea,
} from '@chakra-ui/react';
import { Target, BarChart3, Award, Lightbulb, DollarSign, ClipboardCheck, CalendarClock, ChevronDown } from 'lucide-react';
import { toaster } from '@/components/ui/toaster';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/ui/menu';

const API_BASE = '/api';
const REVIEW_RATING_OPTIONS = [
  { value: 5, label: '5 - Excellent' },
  { value: 4, label: '4 - Good' },
  { value: 3, label: '3 - Average' },
  { value: 2, label: '2 - Poor' },
  { value: 1, label: '1 - Very Poor' },
];

export default function StudentJobs({ token, mode = 'active' }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interestedJobs, setInterestedJobs] = useState(new Set());
  const [togglingInterest, setTogglingInterest] = useState(new Set());
  const [reviewForms, setReviewForms] = useState({});
  const [reviewStatusByJob, setReviewStatusByJob] = useState({});
  const [savingReviews, setSavingReviews] = useState(new Set());

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isExpiredMode = mode === 'expired';

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const endpoint = isExpiredMode ? `${API_BASE}/jobs/past` : `${API_BASE}/jobs`;
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        const fetchedJobs = data.jobs || [];
        setJobs(fetchedJobs);

        if (isExpiredMode && fetchedJobs.length) {
          await fetchMyReviews(fetchedJobs.map((job) => job.id));
        }
      }
    } catch { /* */ }
    finally { setLoading(false); }
  };

  const fetchMyReviews = async (jobIds) => {
    try {
      const pairs = await Promise.all(jobIds.map(async (jobId) => {
        const res = await fetch(`${API_BASE}/jobs/${jobId}/review/me`, { headers });
        if (!res.ok) {
          return [jobId, {
            form: { rating: 5, review_text: '' },
            status: { submitted: false, updated_at: '' },
          }];
        }
        const data = await res.json();
        const review = data.review;
        return [jobId, {
          form: {
            rating: review?.rating || 5,
            review_text: review?.review_text || '',
          },
          status: {
            submitted: Boolean(review),
            updated_at: review?.updated_at || review?.created_at || '',
          },
        }];
      }));

      const formEntries = Object.fromEntries(pairs.map(([jobId, payload]) => [jobId, payload.form]));
      const statusEntries = Object.fromEntries(pairs.map(([jobId, payload]) => [jobId, payload.status]));
      setReviewForms(formEntries);
      setReviewStatusByJob(statusEntries);
    } catch {
      // Non-blocking for jobs listing.
    }
  };

  const fetchInterests = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/interests`, { headers });
      if (res.ok) {
        const data = await res.json();
        setInterestedJobs(new Set(data.job_ids || []));
      }
    } catch { /* */ }
  };

  const toggleInterest = async (jobId) => {
    setTogglingInterest(prev => new Set(prev).add(jobId));
    const isInterested = interestedJobs.has(jobId);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/interest`, {
        method: isInterested ? 'DELETE' : 'POST',
        headers,
      });
      if (res.ok) {
        setInterestedJobs(prev => {
          const next = new Set(prev);
          if (isInterested) next.delete(jobId);
          else next.add(jobId);
          return next;
        });
      }
    } catch { /* */ }
    finally {
      setTogglingInterest(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const updateReviewField = (jobId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [jobId]: {
        rating: prev[jobId]?.rating || 5,
        review_text: prev[jobId]?.review_text || '',
        [field]: value,
      },
    }));
  };

  const submitReview = async (jobId) => {
    const form = reviewForms[jobId] || { rating: 5, review_text: '' };
    const rating = Number(form.rating || 0);
    if (rating < 1 || rating > 5) {
      toaster.create({ title: 'Rating must be between 1 and 5', type: 'warning' });
      return;
    }

    setSavingReviews((prev) => new Set(prev).add(jobId));
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating,
          review_text: String(form.review_text || '').trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toaster.create({ title: data.detail || 'Failed to submit review', type: 'error' });
        return;
      }
      const data = await res.json().catch(() => ({}));
      const updatedAt = data?.review?.updated_at || data?.review?.created_at || '';
      setReviewStatusByJob((prev) => ({
        ...prev,
        [jobId]: { submitted: true, updated_at: updatedAt },
      }));
      toaster.create({ title: 'Review submitted', type: 'success' });
    } catch {
      toaster.create({ title: 'Failed to submit review', type: 'error' });
    } finally {
      setSavingReviews((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchJobs();
    if (!isExpiredMode) fetchInterests();
  }, [mode]);

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" h="300px" gap={3}>
        <Spinner size="xl" color="blue.400" />
        <Text color="gray.400">Loading jobs…</Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Heading size="xl" color="gray.100" mb={1}>{isExpiredMode ? 'Past Jobs' : 'Available Job Openings'}</Heading>
      <Text color="gray.400" fontSize="sm" mb={6}>
        {isExpiredMode
          ? 'Deadline-passed jobs are listed here. You can submit your experience review job-wise.'
          : 'Browse available positions. Your profile is automatically matched by the placement team.'}
      </Text>

      {jobs.length === 0 ? (
        <Flex direction="column" align="center" justify="center" h="200px">
          <Text color="gray.500">{isExpiredMode ? 'No past jobs found.' : 'No job openings available right now. Check back later!'}</Text>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {jobs.map((j) => {
            const isInterested = interestedJobs.has(j.id);
            const isToggling = togglingInterest.has(j.id);
            const review = reviewForms[j.id] || { rating: 5, review_text: '' };
            const reviewStatus = reviewStatusByJob[j.id] || { submitted: false, updated_at: '' };
            const isSavingReview = savingReviews.has(j.id);
            const selectedRatingLabel = REVIEW_RATING_OPTIONS.find((option) => option.value === Number(review.rating))?.label || '5 - Excellent';
            return (
              <Box
                key={j.id}
                bg="gray.900"
                border="1px solid"
                borderColor="gray.800"
                borderRadius="xl"
                p={5}
                transition="all 0.2s"
                _hover={{ borderColor: 'gray.700' }}
              >
                {/* Company Logo + Title Row */}
                <Flex gap={3} align="flex-start" mb={2}>
                  {j.company_logo && (
                    <Box
                      w="48px" h="48px" minW="48px"
                      borderRadius="lg"
                      overflow="hidden"
                      bg="gray.800"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Image
                        src={j.company_logo}
                        alt={`${j.company} logo`}
                        w="full" h="full"
                        objectFit="contain"
                      />
                    </Box>
                  )}
                  <Box flex={1}>
                    <Heading size="sm" color="gray.100" mb={1}>{j.title}</Heading>
                    <Text color="blue.400" fontSize="sm" fontWeight="500">{j.company}</Text>
                  </Box>
                </Flex>

                {j.description && (
                  <Text color="gray.400" fontSize="sm" mb={3} lineClamp={3}>
                    {j.description}
                  </Text>
                )}
                <Flex flexWrap="wrap" gap={2} mb={3}>
                  {j.job_role && <Badge colorPalette="blue" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Target /></Icon>{j.job_role}</Badge>}
                  {j.min_cgpa != null && <Badge colorPalette="purple" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><BarChart3 /></Icon>Min CGPA: {j.min_cgpa}</Badge>}
                  {j.required_certifications && <Badge colorPalette="teal" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Award /></Icon>{j.required_certifications}</Badge>}
                  {j.preferred_skills && <Badge colorPalette="cyan" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Lightbulb /></Icon>{j.preferred_skills}</Badge>}
                  {j.package_lpa != null && <Badge colorPalette="green" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><DollarSign /></Icon>{j.package_lpa} LPA</Badge>}
                  {j.eligibility && <Badge colorPalette="orange" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><ClipboardCheck /></Icon>{j.eligibility}</Badge>}
                  {j.deadline && <Badge colorPalette="red" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><CalendarClock /></Icon>{j.deadline}</Badge>}
                </Flex>

                {isExpiredMode ? (
                  <VStack align="stretch" gap={2} mt={3}>
                    <HStack justify="space-between" align="center">
                      <Text color="gray.300" fontSize="sm" fontWeight="600">Your Review</Text>
                      {reviewStatus.submitted && (
                        <Badge colorPalette="green" fontSize="xs">Submitted</Badge>
                      )}
                    </HStack>
                    {reviewStatus.submitted && reviewStatus.updated_at && (
                      <Text color="gray.500" fontSize="xs">
                        Last updated: {new Date(reviewStatus.updated_at).toLocaleString()}
                      </Text>
                    )}
                    <MenuRoot>
                      <MenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          colorPalette="gray"
                          justifyContent="space-between"
                          w="full"
                          disabled={reviewStatus.submitted}
                        >
                          {selectedRatingLabel}
                          <Icon asChild w={4} h={4}><ChevronDown /></Icon>
                        </Button>
                      </MenuTrigger>
                      {!reviewStatus.submitted && (
                        <MenuContent bg="gray.800" borderColor="gray.700">
                          {REVIEW_RATING_OPTIONS.map((option) => (
                            <MenuItem
                              key={`rating-${j.id}-${option.value}`}
                              value={`rating-${j.id}-${option.value}`}
                              onClick={() => updateReviewField(j.id, 'rating', option.value)}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </MenuContent>
                      )}
                    </MenuRoot>
                    <Textarea
                      value={review.review_text}
                      onChange={(e) => updateReviewField(j.id, 'review_text', e.target.value)}
                      placeholder="Write your review for this job..."
                      rows={3}
                      bg="gray.800"
                      border="1px solid"
                      borderColor="gray.700"
                      _hover={{ borderColor: 'gray.600' }}
                      _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' }}
                      disabled={reviewStatus.submitted}
                    />
                    {!reviewStatus.submitted && (
                      <Button
                        size="sm"
                        colorPalette="purple"
                        variant="solid"
                        loading={isSavingReview}
                        loadingText="Saving..."
                        onClick={() => submitReview(j.id)}
                      >
                        Submit Review
                      </Button>
                    )}
                  </VStack>
                ) : (
                  <Button
                    size="sm"
                    w="full"
                    variant={isInterested ? 'solid' : 'outline'}
                    colorPalette={isInterested ? 'green' : 'blue'}
                    loading={isToggling}
                    loadingText={isInterested ? 'Removing…' : 'Marking…'}
                    onClick={() => toggleInterest(j.id)}
                  >
                    {isInterested ? 'Interested ✓' : 'Interested'}
                  </Button>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
}
