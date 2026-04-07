import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
  Icon,
  Flex,
  IconButton,
  Alert,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Search, Sparkles, Plus, BookOpen, Briefcase, ArrowRight, MessageCircle, X, ExternalLink, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { toaster } from '@/components/ui/toaster';
import RoadmapViewport from '../components/RoadmapViewport';
import RoadmapShViewer from '../components/RoadmapShViewer';

const ROADMAP_SH_MAPPING = {
  'Frontend Developer': 'frontend',
  'Backend Developer': 'backend',
  'Full Stack Developer': 'full-stack',
  'DevOps Engineer': 'devops',
  'Data Analyst': 'data-analyst',
  'AI Engineer': 'ai-engineer',
  'Data Scientist': 'ai-data-scientist',
  'Data Engineer': 'dataops',
  'Android Developer': 'android',
  'iOS Developer': 'ios',
  'Blockchain Developer': 'blockchain',
  'QA Engineer': 'qa',
  'Solutions Architect': 'software-architect',
  'Cybersecurity Analyst': 'cyber-security',
  'UI/UX Designer': 'ux-design',
  'Technical Writer': 'technical-writer',
  'Game Developer': 'game-developer',
  'Product Manager': 'product-manager',
  'Engineering Manager': 'engineering-manager',
  'PostgreSQL': 'postgresql-dba',
  'MLOps Engineer': 'mlops',
  'AI Red Teaming': 'ccdc',
  'BI Analyst': 'data-analyst',
  'DevSecOps': 'devops',
  'Machine Learning': 'mlops',
  'Server-side Game Developer': 'game-developer',
  'Developer Relations': 'engineering-manager',
};

const POPULAR_ROADMAPS = [
  { title: 'Frontend', slug: 'frontend' },
  { title: 'Backend', slug: 'backend' },
  { title: 'Full Stack', slug: 'full-stack' },
  { title: 'DevOps', slug: 'devops' },
  { title: 'Data Analyst', slug: 'data-analyst' },
  { title: 'AI Engineer', slug: 'ai-engineer' },
  { title: 'Data Scientist', slug: 'ai-data-scientist' },
  { title: 'Data Engineer', slug: 'dataops' },
  { title: 'Android', slug: 'android' },
  { title: 'Machine Learning', slug: 'mlops' },
  { title: 'iOS', slug: 'ios' },
  { title: 'Blockchain', slug: 'blockchain' },
  { title: 'QA', slug: 'qa' },
  { title: 'Software Architect', slug: 'software-architect' },
  { title: 'Cyber Security', slug: 'cyber-security' },
  { title: 'UX Design', slug: 'ux-design' },
  { title: 'Technical Writer', slug: 'technical-writer' },
  { title: 'Game Developer', slug: 'game-developer' },
  { title: 'Product Manager', slug: 'product-manager' },
];

const RoadmapCard = ({ title, onClick, isAction = false }) => (
  <Box
    bg="whiteAlpha.50"
    border="1px solid"
    borderColor="whiteAlpha.100"
    borderRadius="xl"
    p={4}
    cursor="pointer"
    transition="all 0.2s"
    _hover={{
      bg: isAction ? 'blue.500/20' : 'whiteAlpha.100',
      borderColor: isAction ? 'blue.500/50' : 'whiteAlpha.300',
      transform: 'translateY(-2px)'
    }}
    onClick={onClick}
    position="relative"
  >
    <Flex justify="space-between" align="center">
      <Text fontWeight="600" fontSize="sm" color="gray.200">
        {isAction ? <Text as="span" color="blue.400">+ </Text> : null}
        {title}
      </Text>
      {!isAction && (
        <Icon 
          asChild 
          w={3.5} h={3.5} 
          color="gray.600" 
          _groupHover={{ color: 'blue.400' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </Icon>
      )}
    </Flex>
  </Box>
);

const MotionBox = motion(Box);

const getRoadmapSlug = (title) => {
  if (!title) return '';
  return title.toLowerCase()
    .replace(/ developer$/i, '')
    .replace(/ engineer$/i, '')
    .replace(/\s+/g, '-');
};

const ROLE_SUGGESTIONS = [
  'AI Engineer', 'AI Prompt Engineer', 'API Developer', 'AR/VR Developer',
  'Android Developer', 'Automation Test Engineer', 'Backend Developer',
  'Big Data Engineer', 'Bioinformatician', 'Blockchain Developer',
  'Business Intelligence Analyst', 'Cloud Architect', 'Cloud Engineer',
  'Computer Vision Engineer', 'Cybersecurity Analyst', 'Data Analyst',
  'Data Engineer', 'Data Scientist', 'Database Administrator',
  'DevOps Engineer', 'Embedded Systems Engineer', 'Frontend Developer',
  'Full Stack Developer', 'Game Developer', 'IT Manager',
  'Infrastructure Architect', 'Integration Engineer', 'IoT Developer',
  'Java Developer', 'Linux Administrator', 'MLOps Engineer',
  'Machine Learning Engineer', 'Mainframe Developer', 'Mobile Developer',
  'Network Engineer', 'NLP Engineer', 'Penetration Tester',
  'Platform Engineer', 'Python Developer', 'QA Engineer',
  'React Developer', 'Robotics Engineer', 'SRE Engineer',
  'Security Engineer', 'Solutions Architect', 'Software Engineer',
  'System Administrator', 'Technical Writer', 'UI/UX Designer',
  'UX Researcher', 'Web Developer', 'WordPress Developer', 'iOS Developer',
];

export default function SkillGapPage() {
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Roadmap state
  const [roadmapData, setRoadmapData] = useState(null);
  const [roadmapSource, setRoadmapSource] = useState('llm'); // 'llm' or 'roadmapsh'
  const [activeSkillForRoadmap, setActiveSkillForRoadmap] = useState(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [roleResources, setRoleResources] = useState(null);
  const [roleResourcesError, setRoleResourcesError] = useState(null);
  const [roleActiveTab, setRoleActiveTab] = useState('courses');

  // Assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([
    {
      from: 'assistant',
      text: 'Hi! Ask me anything about your role, skills, or what to learn next.',
    },
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantSuggestions, setAssistantSuggestions] = useState([]);

  const filteredRoles = role.trim()
    ? ROLE_SUGGESTIONS.filter(r => r.toLowerCase().includes(role.toLowerCase())).slice(0, 8)
    : [];

  const selectRole = (r) => {
    setRole(r);
    setShowSuggestions(false);
  };

  const handleSearch = async () => {
    if (!role.trim()) return;
    setShowSuggestions(false);

    setIsLoading(true);
    try {
      const response = await axios.post('/api/predict-skills', { role });
      const predictedSkills = response.data.skills.map(name => ({ name }));
      setSkills(predictedSkills);
      setHasSearched(true);
      setRoadmapData(null);
      setRoadmapSource('llm');
      // Fetch role-level resources (courses/certificates/youtube) using role roadmap endpoint
      try {
        // Use the cached, validated resources endpoint which returns per-role results
        const r = await axios.post('/api/generate-resources-for-roles', { roles: [role] });
        const payload = r.data && r.data[role] ? r.data[role] : null;
        setRoleResources(cleanResources(payload));
        setRoleResourcesError(null);
      } catch (err) {
        // non-fatal: log but show a visible banner so user can retry
        const msg = err?.response?.data?.detail || err.message || 'Failed to fetch resources';
        console.warn('Failed to fetch role resources', msg);
        setRoleResources(null);
        setRoleResourcesError(msg);
      }
    } catch (error) {
      toaster.create({
        title: 'Prediction Failed',
        description: error.response?.data?.detail || 'Something went wrong',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Keep only trusted, direct links from the backend response
  const cleanResources = (raw) => {
    if (!raw) return { courses: [], certificates: [], youtube: [] };

    const courses = (raw.courses || []).filter((c) =>
      c && !c.isFallback && c.url && /^https?:\/\//.test(c.url)
    );

    const certificates = (raw.certificates || []).filter((cert) =>
      cert && !cert.isFallback && cert.url && /^https?:\/\//.test(cert.url)
    );

    const youtube = (raw.youtube || []).filter((vid) =>
      vid && !vid.isFallback && vid.videoId && vid.videoId.length === 11
    );

    return { courses, certificates, youtube };
  };

  const generateRoadmap = async (skillName) => {
    if (!skillName) return;

    setIsGeneratingRoadmap(true);
    setActiveSkillForRoadmap(skillName);

    try {
      const response = await axios.post('/api/generate-learning-path', { skill: skillName });
      setRoadmapSource('llm');
      setRoadmapData(response.data);
    } catch (error) {
      toaster.create({
        title: 'Roadmap Generation Failed',
        description: error.response?.data?.detail || 'Groq API error',
        type: 'error',
        duration: 3000,
      });
      setActiveSkillForRoadmap(null);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const generateRoleRoadmap = async (roleOverride) => {
    const selectedRole = typeof roleOverride === 'string' ? roleOverride : role;
    if (!selectedRole.trim()) return;

    // Use current search if no override, or the clicked slug from our map
    const slug = ROADMAP_SH_MAPPING[selectedRole] || getRoadmapSlug(selectedRole);
    if (!slug) return; 

    setIsGeneratingRoadmap(true);
    setActiveSkillForRoadmap(selectedRole);

    try {
      // 1. Check Session Storage Cache
      const cacheKey = `roadmap_sh_${slug}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        console.log(`Using cached roadmap for ${slug}`);
        setRoadmapSource('roadmapsh');
        setRoadmapData(JSON.parse(cached));
        setIsGeneratingRoadmap(false);
        return;
      }

      // 2. Fetch from roadmap.sh via backend proxy (to avoid CORS)
      const response = await axios.get(`/api/roadmap-proxy/${slug}`);
      
      // 3. Cache the successful result
      sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
      
      setRoadmapSource('roadmapsh');
      setRoadmapData(response.data);
    } catch (error) {
      toaster.create({
        title: 'Roadmap Fetch Failed',
        description: 'Failed to load data from roadmap.sh. Please try again.',
        type: 'error',
        duration: 3000,
      });
      setActiveSkillForRoadmap(null);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;

    setSkills(prev => {
      if (prev.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const updated = [...prev, { name: trimmed }];
      // Keep skills ordered consistently (basic -> advanced approximation)
      updated.sort((a, b) => a.name.localeCompare(b.name));
      return updated;
    });

    setNewSkill('');
  };

  useEffect(() => {
    const primarySkill = activeSkillForRoadmap || (skills[0]?.name || '');
    const suggestionList = [];

    if (role) {
      suggestionList.push(`What skills do I need to become a ${role}?`);
    }
    if (primarySkill) {
      suggestionList.push(`How should I start learning ${primarySkill}?`);
      suggestionList.push(`Can you suggest projects to practice ${primarySkill}?`);
    }
    if (!role && !primarySkill) {
      suggestionList.push('How can I get started in tech?');
    }
    suggestionList.push('How do I balance theory and practice while learning?');

    const unique = Array.from(new Set(suggestionList));
    setAssistantSuggestions(unique.slice(0, 4));
  }, [role, skills, activeSkillForRoadmap]);

  // Helper: fetch resources for a role (used for retry)
  const fetchRoleResources = async (targetRole) => {
    if (!targetRole) return;
    setRoleResourcesError(null);
    try {
      const r = await axios.post('/api/generate-resources-for-roles', { roles: [targetRole] });
      const payload = r.data && r.data[targetRole] ? r.data[targetRole] : null;
      setRoleResources(cleanResources(payload));
      setRoleResourcesError(null);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to fetch resources';
      setRoleResources(null);
      setRoleResourcesError(msg);
    }
  };

  // Helpers for role resources links and badge colors
  const youtubeWatch = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

  const courseLink = (course) => {
    if (course?.url && /^https?:\/\//.test(course.url)) return course.url;
    const q = encodeURIComponent(course.title || '');
    const p = (course.platform || '').toLowerCase();
    if (p.includes('udemy')) return `https://www.udemy.com/courses/search/?q=${q}`;
    if (p.includes('coursera')) return `https://www.coursera.org/search?query=${q}`;
    return `https://www.google.com/search?q=${q}`;
  };

  const certLink = (cert) => {
    if (cert?.url && /^https?:\/\//.test(cert.url)) return cert.url;
    return `https://www.google.com/search?q=${encodeURIComponent((cert.title || '') + ' ' + (cert.provider || ''))}`;
  };

  const levelColor = (level) => {
    if (!level) return 'green.500';
    const l = level.toLowerCase();
    if (l.includes('beginner')) return 'green.500';
    if (l.includes('intermediate')) return 'orange.500';
    return 'red.500';
  };


  const sendAssistantMessage = async (questionOverride) => {
    const raw = (questionOverride ?? assistantInput).trim();
    if (!raw) return;

    setAssistantMessages((prev) => [...prev, { from: 'user', text: raw }]);
    setAssistantInput('');
    setAssistantLoading(true);

    try {
      const historyPayload = assistantMessages.slice(-6).map((m) => ({
        from: m.from,
        text: m.text,
      }));

      const response = await axios.post('/api/roadmap-assistant', {
        question: raw,
        role: role || null,
        skill: activeSkillForRoadmap || (skills[0]?.name || null),
        history: historyPayload,
      });

      const answer = response.data?.answer || 'Sorry, I could not generate an answer right now.';
      setAssistantMessages((prev) => [...prev, { from: 'assistant', text: answer }]);
    } catch (error) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          from: 'assistant',
          text:
            error.response?.data?.detail ||
            'Something went wrong while talking to the assistant.',
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <Box color="white" fontFamily="'Inter', sans-serif">
      {roadmapData && activeSkillForRoadmap ? (
        roadmapSource === 'roadmapsh' ? (
          <RoadmapShViewer
            data={roadmapData}
            roleName={activeSkillForRoadmap}
            onBack={() => setRoadmapData(null)}
          />
        ) : (
          <RoadmapViewport
            data={roadmapData}
            skillName={activeSkillForRoadmap}
            onBack={() => setRoadmapData(null)}
            showResources={false}
          />
        )
      ) : (
        <Container maxW="5xl">
          <VStack gap={6} align="stretch">
          {/* Header Section */}
          <VStack gap={3} textAlign="center">
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Heading size="2xl" fontWeight="900" letterSpacing="tight" mb={2}>
                AI <Text as="span" color="blue.400">Skill Gap</Text> Analyzer
              </Heading>
            </MotionBox>

            {/* Input Bar with Suggestions */}
            <Box position="relative" w="full" maxW="2xl" mx="auto">
              <Flex
                bg="gray.900"
                p={2}
                borderRadius="2xl"
                border="1px solid"
                borderColor="gray.800"
                gap={{ base: 3, sm: 4 }}
                boxShadow="0 10px 30px rgba(0,0,0,0.5)"
                align={{ base: "stretch", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
              >
                <Flex flex={1} px={4} align="center" gap={2}>
                  <Icon asChild w={5} h={5} color="gray.500"><Search /></Icon>
                  <Input
                    variant="flushed"
                    placeholder="e.g. Full Stack Developer"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => { if (role.trim()) setShowSuggestions(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    borderBottom="none"
                    color="white"
                    _placeholder={{ color: 'gray.600' }}
                  />
                </Flex>
                <Button
                  colorPalette="blue"
                  size="lg"
                  px={8}
                  borderRadius="xl"
                  loading={isLoading}
                  onClick={handleSearch}
                >
                  <Icon asChild w={4} h={4}><Sparkles /></Icon>
                  Analyze
                </Button>
              </Flex>

              {/* Suggestion Dropdown */}
              {showSuggestions && filteredRoles.length > 0 && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  right={0}
                  mt={1}
                  bg="rgba(15, 23, 42, 0.95)"
                  backdropFilter="blur(16px)"
                  border="1px solid"
                  borderColor="gray.700"
                  borderRadius="xl"
                  zIndex={10}
                  overflow="hidden"
                  boxShadow="0 15px 40px rgba(0,0,0,0.6)"
                  py={1}
                >
                  <Text px={4} py={2} fontSize="2xs" color="gray.500" fontWeight="600" letterSpacing="wider" textTransform="uppercase">
                    Suggestions
                  </Text>
                  {filteredRoles.map((r) => (
                    <Flex
                      key={r}
                      px={4}
                      py={2}
                      mx={2}
                      cursor="pointer"
                      align="center"
                      gap={3}
                      borderRadius="lg"
                      _hover={{ bg: 'whiteAlpha.100' }}
                      onClick={() => selectRole(r)}
                      transition="all 0.15s"
                    >
                      <Flex
                        w={7} h={7}
                        align="center" justify="center"
                        borderRadius="md"
                        bg="blue.500/15"
                      >
                        <Icon asChild w={3.5} h={3.5} color="blue.400"><Briefcase /></Icon>
                      </Flex>
                      <Text fontSize="sm" color="gray.200" fontWeight="500">{r}</Text>
                    </Flex>
                  ))}
                </Box>
              )}
            </Box>
          </VStack>

          {!hasSearched && (
            <VStack spacing={8} mt={12} width="100%">
              <Box
                bg="whiteAlpha.100"
                px={4} py={1.5}
                borderRadius="full"
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Text fontSize="xs" fontWeight="700" color="blue.400" textTransform="uppercase" letterSpacing="wider">
                  Role-based Roadmaps
                </Text>
              </Box>

              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4} width="100%" px={4}>
                {POPULAR_ROADMAPS.map((item) => (
                  <RoadmapCard 
                    key={item.title} 
                    title={item.title} 
                    onClick={() => generateRoleRoadmap(item.title)} 
                  />
                ))}
                <RoadmapCard 
                  title="Search for your desired roadmap" 
                  isAction 
                  onClick={() => document.querySelector('input').focus()} 
                />
              </SimpleGrid>
            </VStack>
          )}

          {!hasSearched && (
            <Text color="gray.500" fontSize="sm" mt={8} textAlign="center">
              Tell us your dream tech role and we'll map every core skill from beginner to advanced,<br />
              then build an AI-powered learning roadmap with real courses, certifications, and practice projects.
            </Text>
          )}

          {/* Role-level resources moved above so they appear under the Roadmap header */}

          {/* role-level roadmap button shown only if roadmap.sh slug exists or likely exists */}
          {hasSearched && role.trim() && (
            <Flex justify="center" mt={2}>
              <Button
                size="sm"
                variant="outline"
                borderColor="blue.400"
                color="blue.400"
                _hover={{ bg: 'blue.400', color: 'white' }}
                borderRadius="full"
                onClick={generateRoleRoadmap}
                loading={isGeneratingRoadmap && activeSkillForRoadmap === role}
              >
                <Icon asChild h={4} w={4}><BookOpen /></Icon>
                Roadmap for {role}
              </Button>
            </Flex>
          )}

          {/* Skill Bubbles Section */}
          {hasSearched && (
            <VStack gap={5} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="md" color="gray.100">Core Tech Skills Required</Heading>
                <Text color="gray.500" fontSize="sm">
                  Ordered from basic-advanced
                </Text>
              </Flex>

              {/* Add custom skill */}
              <HStack gap={3} flexWrap="wrap">
                <Text color="gray.500" fontSize="sm">Add a custom skill:</Text>
                <HStack gap={2} flex="1" maxW="420px">
                  <Input
                    size="sm"
                    placeholder="e.g. Machine Learning"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSkill(); }}
                  />
                  <Button
                    size="sm"
                    colorPalette="blue"
                    borderRadius="lg"
                    onClick={handleAddSkill}
                  >
                    Add
                  </Button>
                </HStack>
              </HStack>

              <Box
                p={6}
                bg="gray.900"
                borderRadius="2xl"
                border="1px solid"
                borderColor="gray.800"
                minH="200px"
                position="relative"
                overflow="hidden"
              >
                {skills.length > 0 ? (
                  <Flex align="center" gap={3} wrap="wrap">
                    {skills.map((skill, index) => (
                      <HStack key={skill.name} align="center" gap={2}>
                        <MotionBox
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                        >
                          <Box
                            bg="blue.900/40"
                            px={3}
                            py={1.5}
                            borderRadius="lg"
                            boxShadow="0 0 10px rgba(59,130,246,0.15)"
                            border="1px solid"
                            borderColor="blue.400/50"
                          >
                            <Flex align="center" justify="space-between" gap={2}>
                              <Text fontWeight="600" fontSize="xs" noOfLines={2}>{skill.name}</Text>
                              <IconButton
                                aria-label={`Open roadmap for ${skill.name}`}
                                size="xs"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => generateRoadmap(skill.name)}
                              >
                                <Icon asChild w={3} h={3}><Plus /></Icon>
                              </IconButton>
                            </Flex>
                          </Box>
                        </MotionBox>
                        {index < skills.length - 1 && (
                          <Icon asChild w={4} h={4} color="gray.600">
                            <ArrowRight />
                          </Icon>
                        )}
                      </HStack>
                    ))}
                  </Flex>
                ) : (
                  <Flex align="center" justify="center" h="full">
                    <Text color="gray.500" fontSize="sm">No skills predicted yet. Try another role.</Text>
                  </Flex>
                )}
              </Box>

              {skills.length > 0 && (
                <VStack gap={6} align="center" pt={8}>
                  <Text color="gray.500">Select a skill to dive deeper into its learning path</Text>

                  <Flex gap={4} wrap="wrap" justify="center">
                    {/* role button intentionally omitted here to keep it at the top */}
                    {skills.map(skill => (
                      <Button
                        key={skill.name}
                        variant="outline"
                        borderColor="blue.400"
                        color="blue.400"
                        _hover={{ bg: 'blue.400', color: 'white' }}
                        size="sm"
                        borderRadius="full"
                        loading={isGeneratingRoadmap && activeSkillForRoadmap === skill.name}
                        onClick={() => generateRoadmap(skill.name)}
                      >
                        <Icon asChild h={4} w={4}><BookOpen /></Icon>
                        Roadmap for {skill.name}
                      </Button>
                    ))}
                  </Flex>
                </VStack>
              )}

            {/* Role-level resources shown under the roadmap blocks */}
              {roleResourcesError && (
              <Alert status="warning" borderRadius="lg" mb={4} alignItems="center">
                <Icon as={AlertTriangle} boxSize={5} mr={2} />
                <Box flex="1">
                  <AlertTitle>Resources unavailable</AlertTitle>
                  <AlertDescription display="block">{roleResourcesError}</AlertDescription>
                </Box>
                <Button size="sm" ml={4} onClick={() => fetchRoleResources(role)}>Retry</Button>
                <CloseButton ml={2} onClick={() => setRoleResourcesError(null)} />
              </Alert>
            )}

            {roleResources && (
              <Box mt={6} mb={6}>
                <Heading size="sm" color="gray.100" mb={3}>
                  Resources for <Text as="span" color="blue.400">{role}</Text>
                </Heading>

                <Flex gap={2} mb={4} wrap="wrap">
                  <Button
                    size="xs"
                    bg={roleActiveTab === 'courses' ? 'blue.500' : 'gray.800'}
                    color={roleActiveTab === 'courses' ? 'white' : 'gray.400'}
                    borderRadius="full"
                    onClick={() => setRoleActiveTab('courses')}
                  >
                    Courses <Box as="span" ml={2} bg="whiteAlpha.200" px={2} borderRadius="full">{(roleResources.courses || []).length}</Box>
                  </Button>

                  <Button
                    size="xs"
                    bg={roleActiveTab === 'certificates' ? 'blue.500' : 'gray.800'}
                    color={roleActiveTab === 'certificates' ? 'white' : 'gray.400'}
                    borderRadius="full"
                    onClick={() => setRoleActiveTab('certificates')}
                  >
                    Certificates <Box as="span" ml={2} bg="whiteAlpha.200" px={2} borderRadius="full">{(roleResources.certificates || []).length}</Box>
                  </Button>

                  <Button
                    size="xs"
                    bg={roleActiveTab === 'youtube' ? 'blue.500' : 'gray.800'}
                    color={roleActiveTab === 'youtube' ? 'white' : 'gray.400'}
                    borderRadius="full"
                    onClick={() => setRoleActiveTab('youtube')}
                  >
                    YouTube <Box as="span" ml={2} bg="whiteAlpha.200" px={2} borderRadius="full">{(roleResources.youtube || []).length}</Box>
                  </Button>
                </Flex>

                {/* Courses grid */}
                {roleActiveTab === 'courses' && (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {(roleResources.courses || []).map((c, i) => (
                      <Box
                        key={`rc-${i}`}
                        bg="gray.900"
                        border="1px solid"
                        borderColor="gray.800"
                        borderRadius="xl"
                        p={5}
                        cursor="pointer"
                        onClick={() => window.open(courseLink(c), '_blank')}
                        _hover={{ borderColor: 'blue.500', transform: 'translateY(-2px)', boxShadow: '0 0 20px rgba(59,130,246,0.12)' }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="start" mb={2}>
                          <HStack gap={2}>
                            <Icon asChild w={4} h={4} color="blue.400"><BookOpen /></Icon>
                            <Text fontWeight="700" color="gray.100" fontSize="sm">{c.title}</Text>
                          </HStack>
                          <HStack align="center" gap={2}>
                            {c.isFallback && (
                              <Badge colorScheme="yellow" variant="subtle" fontSize="2xs">Fallback</Badge>
                            )}
                            <Icon asChild w={3.5} h={3.5} color="gray.500"><ExternalLink /></Icon>
                          </HStack>
                        </Flex>
                        <Text color="gray.500" fontSize="xs" mb={2}>{c.description}</Text>
                        <Flex gap={2} align="center">
                          <Box as="span" bg={levelColor(c.level)} color="white" px={2} borderRadius="full" fontSize="2xs">{c.level || 'Beginner'}</Box>
                          <Text color="gray.600" fontSize="2xs">{c.platform}</Text>
                        </Flex>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}

                {/* Certificates grid */}
                {roleActiveTab === 'certificates' && (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {(roleResources.certificates || []).map((cert, i) => (
                      <Box
                        key={`cert-${i}`}
                        bg="gray.900"
                        border="1px solid"
                        borderColor="gray.800"
                        borderRadius="xl"
                        p={5}
                        cursor="pointer"
                        onClick={() => window.open(certLink(cert), '_blank')}
                        _hover={{ borderColor: 'yellow.500', transform: 'translateY(-2px)', boxShadow: '0 0 20px rgba(234,179,8,0.1)' }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="start" mb={2}>
                          <HStack gap={2}>
                            <Icon asChild w={4} h={4} color="yellow.400"><BookOpen /></Icon>
                            <Text fontWeight="700" color="gray.100" fontSize="sm">{cert.title}</Text>
                          </HStack>
                          <HStack align="center" gap={2}>
                            {cert.isFallback && (
                              <Badge colorScheme="yellow" variant="subtle" fontSize="2xs">Fallback</Badge>
                            )}
                            <Icon asChild w={3.5} h={3.5} color="gray.500"><ExternalLink /></Icon>
                          </HStack>
                        </Flex>
                        <Text color="gray.500" fontSize="xs" mb={2}>{cert.description}</Text>
                        <Badge bg="whiteAlpha.100" color="white" borderRadius="full" px={2} fontSize="2xs">{cert.provider}</Badge>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}

                {/* YouTube grid */}
                {roleActiveTab === 'youtube' && (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {(roleResources.youtube || []).map((vid, i) => (
                      <Box
                        key={`yt-${i}`}
                        bg="gray.900"
                        border="1px solid"
                        borderColor="gray.800"
                        borderRadius="xl"
                        p={5}
                        cursor="pointer"
                        onClick={() => window.open(youtubeWatch(vid.videoId), '_blank')}
                        _hover={{ borderColor: 'red.500', transform: 'translateY(-2px)', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="start" mb={2}>
                          <HStack gap={2}>
                            <Icon asChild w={4} h={4} color="red.400"><BookOpen /></Icon>
                            <Text fontWeight="700" color="gray.100" fontSize="sm">{vid.title}</Text>
                          </HStack>
                          <HStack align="center" gap={2}>
                            {vid.isFallback && (
                              <Badge colorScheme="yellow" variant="subtle" fontSize="2xs">Fallback</Badge>
                            )}
                            <Icon asChild w={3.5} h={3.5} color="gray.500"><ExternalLink /></Icon>
                          </HStack>
                        </Flex>
                        <Text color="gray.600" fontSize="xs" mb={1}>{vid.channel}</Text>
                        <Text color="gray.500" fontSize="xs">{vid.description}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Box>
            )}
            </VStack>
          )}
        </VStack>
      </Container>
      )}

      {/* Floating Roadmap Assistant */}
      <Box position="fixed" bottom={{ base: "12px", md: "24px" }} right={{ base: "12px", md: "24px" }} zIndex={50}>
        {assistantOpen ? (
          <Box
            w={{ base: 'calc(100vw - 24px)', sm: '320px', md: '340px' }}
            bg="gray.900"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.700"
            boxShadow="0 18px 45px rgba(0,0,0,0.8)"
            overflow="hidden"
          >
            <Flex
              align="center"
              justify="space-between"
              px={4}
              py={3}
              bg="gray.800"
              borderBottom="1px solid"
              borderColor="gray.700"
            >
              <HStack gap={2}>
                <Icon asChild w={4} h={4} color="blue.300">
                  <Sparkles />
                </Icon>
                <Text fontSize="sm" fontWeight="600">
                  Roadmap Assistant
                </Text>
              </HStack>
              <IconButton
                aria-label="Close assistant"
                size="xs"
                variant="ghost"
                colorPalette="gray"
                onClick={() => setAssistantOpen(false)}
              >
                <Icon asChild w={3.5} h={3.5}>
                  <X />
                </Icon>
              </IconButton>
            </Flex>

            {/* Suggestions strip */}
            <Box px={3} py={2} borderBottom="1px solid" borderColor="gray.700">
              <Flex wrap="wrap" gap={2}>
                {assistantSuggestions.map((s) => (
                  <Button
                    key={s}
                    size="xs"
                    variant="outline"
                    borderColor="gray.600"
                    color="gray.200"
                    borderRadius="full"
                    onClick={() => sendAssistantMessage(s)}
                  >
                    {s}
                  </Button>
                ))}
              </Flex>
            </Box>

            {/* Messages area */}
            <Box maxH="260px" overflowY="auto" px={3} py={3}>
              <VStack align="stretch" gap={2}>
                {assistantMessages.map((m, idx) => {
                  const isUser = m.from === 'user';
                  return (
                    <Box
                      key={idx}
                      alignSelf={isUser ? 'flex-end' : 'flex-start'}
                      maxW="92%"
                    >
                      <Box
                        bg={
                          isUser
                            ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.5))'
                            : 'gray.800'
                        }
                        px={3}
                        py={2}
                        borderRadius="lg"
                        border={isUser ? '1px solid' : 'none'}
                        borderColor={isUser ? 'blue.400/60' : 'transparent'}
                        boxShadow={
                          isUser
                            ? '0 0 12px rgba(59,130,246,0.35)'
                            : '0 0 6px rgba(15,23,42,0.6)'
                        }
                      >
                        <Text fontSize="xs" color="white">
                          {m.text}
                        </Text>
                      </Box>
                    </Box>
                  );
                })}
                {assistantLoading && (
                  <Text fontSize="xs" color="gray.400">
                    Thinking...
                  </Text>
                )}
              </VStack>
            </Box>

            {/* Input row */}
            <Flex
              px={3}
              py={3}
              gap={2}
              align="center"
              borderTop="1px solid"
              borderColor="gray.700"
            >
              <Input
                size="sm"
                placeholder="Ask about your roadmap..."
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendAssistantMessage();
                }}
              />
              <Button
                size="sm"
                colorPalette="blue"
                borderRadius="lg"
                disabled={assistantLoading}
                onClick={() => sendAssistantMessage()}
              >
                Send
              </Button>
            </Flex>
          </Box>
        ) : (
          <VStack align="flex-end" gap={2}>
            <Box
              bg="gray.900"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.700"
              px={3}
              py={2}
              boxShadow="0 14px 30px rgba(0,0,0,0.7)"
            >
              <Text fontSize="xs" color="gray.100">
                Any query? Hey, I&apos;m here to help.
              </Text>
            </Box>
            <IconButton
              aria-label="Open roadmap assistant"
              colorPalette="blue"
              borderRadius="full"
              size="lg"
              boxShadow="0 18px 45px rgba(0,0,0,0.8)"
              onClick={() => setAssistantOpen(true)}
            >
              <Icon asChild w={5} h={5}>
                <MessageCircle />
              </Icon>
            </IconButton>
          </VStack>
        )}
      </Box>
    </Box>
  );
}
