import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Button, VStack,
  Icon, SimpleGrid, Card, HStack, Badge,
  List,
} from '@chakra-ui/react';
import { Alert } from '@/components/ui/alert';
import { ProgressBar, ProgressRoot, ProgressValueText, ProgressLabel } from '@/components/ui/progress';
import { 
  FileUp, Paperclip, File, FileText, CheckCircle2, Lightbulb, 
  Trophy, AlertTriangle, XCircle, Info, Briefcase, BookOpen,
  ArrowLeft, Loader2
} from 'lucide-react';
import { supabase, ensureSupabaseUser, getAccessibleStorageUrl } from '@/lib/supabaseClient';
import axios from 'axios';
import { toaster } from '@/components/ui/toaster';
import RoadmapViewport from '../components/RoadmapViewport';
import RoadmapShViewer from '../components/RoadmapShViewer';

const API_BASE = '/api';
const MAX_RESUME_SIZE_BYTES = 2 * 1024 * 1024;

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
};

const getRoadmapSlug = (title) => {
  if (!title) return '';
  return title.toLowerCase()
    .replace(/ developer$/i, '')
    .replace(/ engineer$/i, '')
    .replace(/\s+/g, '-');
};

export default function ResumeAnalysisPage({ token, user, result, onProfileUpdate }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // Roadmap integration state
  const [roadmapData, setRoadmapData] = useState(null);
  const [roadmapSource, setRoadmapSource] = useState('llm'); // 'llm' or 'roadmapsh'
  const [activeSkillForRoadmap, setActiveSkillForRoadmap] = useState(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const normalizeResumeUrl = (rawUrl) => {
    if (!rawUrl || !String(rawUrl).trim()) return '';
    const url = String(rawUrl).trim();
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return '';
  };

  const savedResumeName = user?.resume_filename || '';
  const savedResumeUrl = normalizeResumeUrl(user?.resume_url || '');

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
      });
      setActiveSkillForRoadmap(null);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const generateRoleRoadmap = async (roleName) => {
    if (!roleName) return;
    const slug = ROADMAP_SH_MAPPING[roleName] || getRoadmapSlug(roleName);
    if (!slug) return; 

    setIsGeneratingRoadmap(true);
    setActiveSkillForRoadmap(roleName);
    try {
      const cacheKey = `roadmap_sh_${slug}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setRoadmapSource('roadmapsh');
        setRoadmapData(JSON.parse(cached));
        setIsGeneratingRoadmap(false);
        return;
      }
      const response = await axios.get(`${API_BASE}/roadmap-proxy/${slug}`);
      sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
      setRoadmapSource('roadmapsh');
      setRoadmapData(response.data);
    } catch (error) {
      toaster.create({
        title: 'Roadmap Fetch Failed',
        description: 'Failed to load industry standard roadmap.',
        type: 'error',
      });
      setActiveSkillForRoadmap(null);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleFileChange = (e) => {

    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf' && file.size <= MAX_RESUME_SIZE_BYTES) {
      setResumeFile(file);
      setMessage('');
    } else if (file && file.type === 'application/pdf' && file.size > MAX_RESUME_SIZE_BYTES) {
      setMessage('Resume size must be 2MB or less.');
    } else if (file) {
      setMessage('Please upload a PDF file.');
    }
  };

  const handleUpload = async () => {
    if (!resumeFile) {
      setMessage('Please select a resume file first.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      if (supabase) {
        const sbUser = await ensureSupabaseUser();
        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const objectPath = `${sbUser.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('Result')
          .upload(objectPath, resumeFile, {
            upsert: false,
            contentType: 'application/pdf',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error(uploadError.message);
          throw new Error(uploadError.message || 'Failed to upload resume to storage.');
        }

        const publicUrl = await getAccessibleStorageUrl('Result', objectPath);
        if (!publicUrl) {
          throw new Error('Failed to generate resume URL. Check bucket visibility/policies.');
        }
        formData.append('resume_url', publicUrl);
        formData.append('resume_filename', resumeFile.name);
      } else {
        // Fallback for missing VITE Supabase envs: backend handles Supabase upload.
        formData.append('resume', resumeFile);
      }

      const resp = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || 'Failed to analyze resume.');
      }

      const data = await resp.json();
      onProfileUpdate(data.user, data.analysis);
      setMessage('Resume Analyzed!');
      setResumeFile(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  const ScoreCard = ({ label, value, color, missing }) => (
    <Box 
      bg="gray.800/40" 
      p={5} 
      borderRadius="2xl" 
      border="1px solid" 
      borderColor="gray.700"
      _hover={{ borderColor: `${color}.500/50`, bg: 'gray.800/60' }}
      transition="all 0.3s"
      position="relative"
      overflow="hidden"
    >
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="800" color="gray.400" textTransform="uppercase" letterSpacing="widest">
            {label}
          </Text>
          <Badge colorPalette={color} variant="solid" size="sm" borderRadius="md">
            {value}/10
          </Badge>
        </HStack>
        
        <Box h="4px" bg="gray.950" borderRadius="full" overflow="hidden">
           <Box h="full" bg={`${color}.500`} w={`${value * 10}%`} transition="width 1s ease-out" />
        </Box>

        {/* Missing items are now handled exclusively in the AI Suggestions box */}
        <HStack gap={1.5} mt={1}>
          <Icon asChild color="green.400" w={3} h={3}><CheckCircle2 /></Icon>
          <Text fontSize="xs" color="green.300" fontWeight="600">
            {value >= 9 ? 'Perfectly Optimized' : 'Optimized'}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );

  const categoryColor = (cat) => {
    if (!cat) return 'green';
    const lower = cat.toLowerCase();
    if (lower.includes('ready') && !lower.includes('almost')) return 'green';
    if (lower.includes('almost')) return 'orange';
    return 'red';
  };

  if (roadmapData && activeSkillForRoadmap) {
    if (roadmapSource === 'roadmapsh') {
      return (
        <RoadmapShViewer
          data={roadmapData}
          roleName={activeSkillForRoadmap}
          onBack={() => { setRoadmapData(null); setActiveSkillForRoadmap(null); }}
        />
      );
    }
    return (
      <RoadmapViewport
        data={roadmapData}
        skillName={activeSkillForRoadmap}
        onBack={() => { setRoadmapData(null); setActiveSkillForRoadmap(null); }}
        showResources={false}
      />
    );
  }

  return (
    <VStack gap={8} align="stretch" maxW="1200px" mx="auto" pb={20}>
      {/* ── Header Area ── */}
      <Flex direction={{ base: 'column', md: 'row' }} gap={6} align="center" justify="space-between">
        <Box>
          <Heading size="xl" color="white" mb={2}>Resume Intelligence</Heading>
          <Text color="gray.400">Deep-dive analysis of your placement readiness with actionable gaps.</Text>
        </Box>
        {result && (
           <Box 
             p={6} 
             bg="blue.600/10" 
             borderRadius="2xl" 
             border="2px solid" 
             borderColor="blue.500/30"
             textAlign="center"
             minW="200px"
           >
              <Text fontSize="xs" color="blue.300" fontWeight="800" mb={1} textTransform="uppercase">Total Score</Text>
              <Text fontSize="4xl" fontWeight="900" color="white" lineHeight="1">
                {result.readiness_score}<Text as="span" fontSize="lg" color="blue.400" fontWeight="500">/100</Text>
              </Text>
              <Badge mt={2} colorPalette={categoryColor(result.readiness_category)} variant="subtle">
                {result.readiness_category}
              </Badge>
           </Box>
        )}
      </Flex>

      {/* ── Main Content Grid ── */}
      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
        
        {/* Left Column: Action & Suggestions */}
        <VStack gap={6} align="stretch" gridColumn={{ lg: 'span 1' }}>
          <Card.Root bg="gray.900/40" border="1px solid" borderColor="gray.800" borderRadius="3xl">
            <Card.Body p={6}>
              <VStack gap={5}>
                <VStack gap={2} textAlign="center">
                  <Box p={3} borderRadius="xl" bg="blue.500/10" color="blue.400">
                    <Icon asChild w={8} h={8}><FileUp /></Icon>
                  </Box>
                  <Heading size="md" color="white">Update Analysis</Heading>
                  <Text fontSize="sm" color="gray.500">Upload your latest PDF to refresh scores.</Text>
                </VStack>

                <Box
                  w="full"
                  border="2px dashed"
                  borderColor={resumeFile ? 'blue.400' : 'gray.700'}
                  borderRadius="2xl"
                  p={8}
                  bg="gray.950/40"
                  cursor="pointer"
                  transition="all 0.2s"
                  onClick={() => document.getElementById('resume-upload').click()}
                >
                  <input id="resume-upload" type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                  <VStack gap={2}>
                    <Icon asChild w={8} h={8} color={resumeFile ? 'blue.400' : 'gray.600'}>
                      {resumeFile ? <File /> : <Paperclip />}
                    </Icon>
                    <Text fontSize="xs" color={resumeFile ? 'gray.200' : 'gray.500'} fontWeight="700" textAlign="center">
                      {resumeFile ? resumeFile.name : 'Select Resume PDF'}
                    </Text>
                  </VStack>
                </Box>

                <Button 
                  w="full" 
                  colorPalette="blue" 
                  size="xl" 
                  borderRadius="xl"
                  loading={uploading}
                  onClick={handleUpload}
                  disabled={!resumeFile}
                  boxShadow="0 4px 15px rgba(49, 130, 206, 0.3)"
                >
                  Run Neural Analysis
                </Button>
                {(savedResumeName || savedResumeUrl) && (
                  <Box w="full" bg="green.500/10" border="1px solid" borderColor="green.500/30" borderRadius="xl" p={3}>
                    <Text fontSize="xs" color="green.200" fontWeight="700" mb={1}>
                      Saved Resume
                    </Text>
                    <Text fontSize="xs" color="gray.200" mb={2} lineClamp={1}>
                      {savedResumeName || 'Resume available'}
                    </Text>
                    {savedResumeUrl && (
                      <HStack gap={2}>
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="green"
                          onClick={() => {
                            const resolved = `${savedResumeUrl}${savedResumeUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                            window.open(resolved, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          Open
                        </Button>
                        <Button
                          size="xs"
                          colorPalette="green"
                          onClick={() => {
                            const anchor = document.createElement('a');
                            anchor.href = savedResumeUrl;
                            anchor.download = savedResumeName || 'resume.pdf';
                            document.body.appendChild(anchor);
                            anchor.click();
                            document.body.removeChild(anchor);
                          }}
                        >
                          Download
                        </Button>
                      </HStack>
                    )}
                  </Box>
                )}
                {message && <Alert status={message.startsWith('Resume Analyzed!') ? 'success' : 'error'} title={message} variant="subtle" borderRadius="xl" />}
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* AI Suggestions Section */}
          <Box bg="purple.600/5" p={6} borderRadius="3xl" border="1px solid" borderColor="purple.500/20">
             <HStack mb={4} gap={3}>
               <Icon asChild color="purple.400" w={6} h={6}><Lightbulb /></Icon>
               <Heading size="sm" color="white">AI Suggestions</Heading>
             </HStack>
             <VStack gap={4} align="stretch">
               {(() => {
                 const suggestions = result?.ai_suggestions?.llm?.suggestions || 
                                    (Array.isArray(result?.ai_suggestions) ? result.ai_suggestions : []);
                 
                 return suggestions.length > 0 ? suggestions.map((s, idx) => (
                   <HStack key={idx} align="start" gap={3}>
                     <Icon asChild w={4} h={4} mt={1} color="purple.400"><CheckCircle2 /></Icon>
                     <Text fontSize="sm" color="gray.300" lineHeight="1.5">{s}</Text>
                   </HStack>
                 )) : (
                   <Text color="gray.500" fontSize="sm">No specific suggestions found. Try refreshing your analysis.</Text>
                 );
               })()}
             </VStack>
          </Box>
        </VStack>

        {/* Right Column: Detailed Score Matrix */}
        <Box gridColumn={{ lg: 'span 2' }}>
          {result ? (
            <VStack gap={6} align="stretch">
              <HStack justify="space-between">
                <Heading size="md" color="gray.100">Performance Breakdown</Heading>
                <HStack gap={4}>
                   <HStack gap={1.5}><Box w={2} h={2} borderRadius="full" bg="green.500" /><Text fontSize="xs" color="gray.500">High</Text></HStack>
                   <HStack gap={1.5}><Box w={2} h={2} borderRadius="full" bg="orange.500" /><Text fontSize="xs" color="gray.500">Medium</Text></HStack>
                   <HStack gap={1.5}><Box w={2} h={2} borderRadius="full" bg="red.500" /><Text fontSize="xs" color="gray.500">Critical</Text></HStack>
                </HStack>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <ScoreCard 
                  label="Resume Formatting" 
                  value={result.education_score || 0} 
                  color={result.education_score > 7 ? 'green' : result.education_score > 4 ? 'orange' : 'red'}
                  missing={result.missing_details?.format}
                />
                <ScoreCard 
                  label="Core Technical Skills" 
                  value={result.skills_score || 0} 
                  color={result.skills_score > 7 ? 'green' : result.skills_score > 4 ? 'orange' : 'red'}
                  missing={result.missing_details?.skill}
                />
                <ScoreCard 
                  label="Relevant Internships" 
                  value={result.internship_score || 0} 
                  color={result.internship_score > 7 ? 'green' : result.internship_score > 4 ? 'orange' : 'red'}
                  missing={result.missing_details?.intern}
                />
                <ScoreCard 
                  label="Technical Projects" 
                  value={result.project_score || 0} 
                  color={result.project_score > 7 ? 'green' : result.project_score > 4 ? 'orange' : 'red'}
                  missing={result.missing_details?.proj}
                />

              </SimpleGrid>

              {/* Predicted Job Roles */}
              {result.recommended_roles?.length > 0 && (
                <Box bg="gray.900/40" p={6} borderRadius="3xl" border="1px solid" borderColor="gray.800">
                  <HStack mb={4} gap={3}>
                    <Icon asChild color="purple.400" w={5} h={5}><Briefcase /></Icon>
                    <Heading size="xs" color="gray.400" textTransform="uppercase" letterSpacing="widest">Predicted Job Roles</Heading>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                    {result.recommended_roles.map((r, idx) => (
                      <Box
                        key={idx}
                        bg={idx === 0 ? 'purple.600/10' : 'gray.800/40'}
                        p={5}
                        borderRadius="2xl"
                        border="1px solid"
                        borderColor={idx === 0 ? 'purple.500/30' : 'gray.700'}
                        textAlign="center"
                        cursor="pointer"
                        _hover={{ borderColor: 'purple.500/50', bg: idx === 0 ? 'purple.600/15' : 'gray.800/60' }}
                        transition="all 0.3s"
                        onClick={() => generateRoleRoadmap(r.role)}
                      >
                        <Badge
                          colorPalette={idx === 0 ? 'purple' : 'gray'}
                          variant="subtle"
                          fontSize="2xs"
                          mb={2}
                        >
                          #{idx + 1} Match
                        </Badge>
                        <HStack justify="center" gap={1}>
                          {isGeneratingRoadmap && activeSkillForRoadmap === r.role ? (
                             <Icon asChild animation="spin 1s linear infinite" color="purple.400">
                               <Loader2 />
                             </Icon>
                          ) : (
                             <Text fontSize="md" fontWeight="700" color="white">
                                {r.role}
                             </Text>
                          )}
                        </HStack>
                        <Text fontSize="2xl" fontWeight="800" color={idx === 0 ? 'purple.400' : 'gray.400'}>
                          {r.score}<Text as="span" fontSize="xs" color="gray.500" fontWeight="400">/100</Text>
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              {/* Detected Skill Stack */}
              <Box bg="gray.900/40" p={6} borderRadius="3xl" border="1px solid" borderColor="gray.800">
                <HStack mb={4} gap={3}>
                  <Icon asChild color="blue.400" w={5} h={5}><Info /></Icon>
                  <Heading size="xs" color="gray.400" textTransform="uppercase" letterSpacing="widest">Detected Skill Stack</Heading>
                </HStack>
                <Flex wrap="wrap" gap={2}>
                  {result.skills_list?.length > 0 ? result.skills_list.map((skill, idx) => (
                    <Badge 
                      key={idx} 
                      variant="surface" 
                      colorPalette="blue" 
                      px={3} py={1} 
                      borderRadius="lg" 
                      fontSize="xs"
                      cursor={isGeneratingRoadmap ? "not-allowed" : "pointer"}
                      _hover={{ bg: 'blue.500/20' }}
                      onClick={() => !isGeneratingRoadmap && generateRoadmap(skill)}
                      transition="transform 0.2s, border-color 0.2s, background-color 0.2s"
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      {skill}
                      {isGeneratingRoadmap && activeSkillForRoadmap === skill && (
                        <Icon asChild animation="spin 1s linear infinite" w={3} h={3}>
                          <Loader2 />
                        </Icon>
                      )}
                    </Badge>
                  )) : (
                    <Text color="gray.600" fontSize="sm italic">No specific technical skills identified yet.</Text>
                  )}
                </Flex>
              </Box>

              {/* Skills to Build (Gaps) */}
              {result.ai_suggestions?.llm?.missing_skills?.length > 0 && (
                <VStack align="stretch" gap={4}>
                  <HStack px={2}>
                    <Icon asChild color="orange.400" w={5} h={5}><BookOpen /></Icon>
                    <Heading size="xs" color="gray.400" textTransform="uppercase" letterSpacing="widest">
                      Skills to Build (Targeting Jobs)
                    </Heading>
                  </HStack>
                  
                  {result.ai_suggestions.llm.missing_skills.map((roleGap, idx) => {
                    // Robust handling: old data might be strings, new is dict
                    const isObject = typeof roleGap === 'object' && roleGap !== null;
                    const roleName = isObject ? (roleGap.role || 'Career Path') : 'Target Role';
                    const skillSet = isObject ? (roleGap.skills || []) : [roleGap];

                    return (
                      <Box 
                        key={idx} 
                        bg="orange.600/5" 
                        p={5} 
                        borderRadius="2xl" 
                        border="1px solid" 
                        borderColor="orange.500/15"
                      >
                        <Text fontSize="xs" fontWeight="800" color="orange.300" mb={3} textTransform="uppercase">
                          For {roleName}
                        </Text>
                        <Flex wrap="wrap" gap={2}>
                          {skillSet.map((skill, i) => (
                            <Badge 
                              key={i} 
                              variant="subtle" 
                              colorPalette="orange" 
                              px={3} 
                              py={1.5} 
                              borderRadius="lg" 
                              fontSize="xs"
                              fontWeight="700"
                              cursor={isGeneratingRoadmap ? "not-allowed" : "pointer"}
                              transition="all 0.2s"
                              _hover={{ 
                                transform: 'scale(1.05)', 
                                bg: 'orange.500', 
                                color: 'white',
                                boxShadow: '0 0 15px rgba(246, 173, 85, 0.4)' 
                              }}
                              onClick={() => !isGeneratingRoadmap && generateRoadmap(skill)}
                              display="flex"
                              alignItems="center"
                              gap={2}
                              opacity={isGeneratingRoadmap && activeSkillForRoadmap !== skill ? 0.6 : 1}
                            >
                              {skill}
                              {isGeneratingRoadmap && activeSkillForRoadmap === skill && (
                                <Icon asChild animation="spin 1s linear infinite" w={3} h={3}>
                                  <Loader2 />
                                </Icon>
                              )}
                            </Badge>
                          ))}
                        </Flex>
                      </Box>
                    );
                  })}

                </VStack>
              )}
            </VStack>

          ) : (
            <Flex direction="column" align="center" justify="center" h="full" minH="500px" bg="gray.900/20" borderRadius="3xl" border="2px dashed" borderColor="gray.800">
              <Icon asChild w={16} h={16} color="gray.700" mb={4}><FileText /></Icon>
              <Text color="gray.500" fontWeight="600">No Analysis Found</Text>
              <Text color="gray.600" fontSize="sm" mt={1}>Upload your resume to see the intelligence dashboard.</Text>
            </Flex>
          )}
        </Box>
      </SimpleGrid>
    </VStack>
  );

}
