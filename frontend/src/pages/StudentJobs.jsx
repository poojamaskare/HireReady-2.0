import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid, Badge, VStack, Icon,
} from '@chakra-ui/react';
import { Target, BarChart3, Award, Lightbulb, DollarSign, ClipboardCheck, CalendarClock } from 'lucide-react';

const API_BASE = '/api';

export default function StudentJobs({ token }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchJobs(); }, []);

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
          {jobs.map((j) => (
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
              <Heading size="sm" color="gray.100" mb={1}>{j.title}</Heading>
              <Text color="blue.400" fontSize="sm" fontWeight="500" mb={2}>{j.company}</Text>
              {j.description && (
                <Text color="gray.400" fontSize="sm" mb={3} lineClamp={3}>
                  {j.description}
                </Text>
              )}
              <Flex flexWrap="wrap" gap={2}>
                {j.job_role && <Badge colorPalette="blue" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Target /></Icon>{j.job_role}</Badge>}
                {j.min_cgpa != null && <Badge colorPalette="purple" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><BarChart3 /></Icon>Min CGPA: {j.min_cgpa}</Badge>}
                {j.required_certifications && <Badge colorPalette="teal" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Award /></Icon>{j.required_certifications}</Badge>}
                {j.preferred_skills && <Badge colorPalette="cyan" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><Lightbulb /></Icon>{j.preferred_skills}</Badge>}
                {j.package_lpa != null && <Badge colorPalette="green" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><DollarSign /></Icon>{j.package_lpa} LPA</Badge>}
                {j.eligibility && <Badge colorPalette="orange" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><ClipboardCheck /></Icon>{j.eligibility}</Badge>}
                {j.deadline && <Badge colorPalette="red" fontSize="xs"><Icon asChild w={3} h={3} mr={1}><CalendarClock /></Icon>{j.deadline}</Badge>}
              </Flex>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
