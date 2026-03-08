import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid, Badge, VStack, HStack, Icon, Button, Image,
} from '@chakra-ui/react';
import { Target, BarChart3, Award, Lightbulb, DollarSign, ClipboardCheck, CalendarClock, Heart } from 'lucide-react';

const API_BASE = '/api';

export default function StudentJobs({ token }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interestedJobs, setInterestedJobs] = useState(new Set());
  const [togglingInterest, setTogglingInterest] = useState(new Set());

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs`, { headers });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch { /* */ }
    finally { setLoading(false); }
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

  useEffect(() => {
    fetchJobs();
    fetchInterests();
  }, []);

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" h="300px" gap={3}>
        <Spinner size="xl" color="blue.400" />
        <Text color="gray.400">Loading available jobs…</Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Heading size="xl" color="gray.100" mb={1}>Available Job Openings</Heading>
      <Text color="gray.400" fontSize="sm" mb={6}>
        Browse available positions. Your profile is automatically matched by the placement team.
      </Text>

      {jobs.length === 0 ? (
        <Flex direction="column" align="center" justify="center" h="200px">
          <Text color="gray.500">No job openings available right now. Check back later!</Text>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {jobs.map((j) => {
            const isInterested = interestedJobs.has(j.id);
            const isToggling = togglingInterest.has(j.id);
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

                {/* Interested Button */}
                <Button
                  size="sm"
                  w="full"
                  variant={isInterested ? 'solid' : 'outline'}
                  colorPalette={isInterested ? 'green' : 'blue'}
                  loading={isToggling}
                  loadingText={isInterested ? 'Removing…' : 'Marking…'}
                  onClick={() => toggleInterest(j.id)}
                >
                  <Icon asChild w={4} h={4} mr={1}>
                    <Heart fill={isInterested ? 'currentColor' : 'none'} />
                  </Icon>
                  {isInterested ? 'Interested ✓' : 'Interested'}
                </Button>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
}
