import { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import {
  Box, Button, Heading, Text, Icon, HStack, VStack, Flex,
  SimpleGrid, Badge,
} from '@chakra-ui/react';
import {
  ChevronLeft, Zap, BookOpen, Award, Youtube,
  ExternalLink, Play, GraduationCap,
} from 'lucide-react';

/* ── Direct link helpers ───────────────────────────────────────────── */
const youtubeWatch = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

const courseLink = (course) => {
  // Use direct URL from Groq if provided, otherwise fallback to platform search
  if (course.url) return course.url;
  const q = encodeURIComponent(course.title);
  const p = (course.platform || '').toLowerCase();
  if (p.includes('udemy')) return `https://www.udemy.com/courses/search/?q=${q}`;
  if (p.includes('coursera')) return `https://www.coursera.org/search?query=${q}`;
  return `https://www.freecodecamp.org/news/search/?query=${q}`;
};

const certLink = (cert) => {
  if (cert.url) return cert.url;
  return `https://www.google.com/search?q=${encodeURIComponent(cert.title + ' ' + cert.provider + ' certification')}`;
};

/* ── Dagre Layout ──────────────────────────────────────────────────── */
const nodeWidth = 180;
const nodeHeight = 60;

const getLayoutedElements = (nodes, edges) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 100 });

  nodes.forEach((node) => g.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  dagre.layout(g);

  const newNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
      style: {
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        color: '#e2e8f0',
        border: '1.5px solid #3b82f6',
        borderRadius: '12px',
        padding: '10px 16px',
        fontSize: '13px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: '600',
        width: nodeWidth,
        textAlign: 'center',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(59, 130, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    };
  });
  return { nodes: newNodes, edges };
};

const levelColor = (level) => {
  if (!level) return 'blue';
  const l = level.toLowerCase();
  if (l.includes('beginner')) return 'green';
  if (l.includes('intermediate')) return 'orange';
  return 'red';
};

/* ── Component ─────────────────────────────────────────────────────── */
export default function RoadmapViewport({ data, onBack, skillName, showResources = true }) {
  const [activeTab, setActiveTab] = useState('courses');

  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    const raw = (data.nodes || []).map((n) => ({ id: n.id, data: { label: n.label } }));
    return getLayoutedElements(raw, data.edges || []);
  }, [data]);

  const [nodes, setNodes] = useState(initNodes);
  const [edges, setEdges] = useState(initEdges);

  const onNodesChange = useCallback((c) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c) => setEdges((e) => applyEdgeChanges(c, e)), []);

  const courses = data.courses || [];
  const certificates = data.certificates || [];
  const youtube = data.youtube || [];

  const tabs = [
    { key: 'courses', label: 'Courses', icon: BookOpen, count: courses.length },
    { key: 'certificates', label: 'Certificates', icon: Award, count: certificates.length },
    { key: 'youtube', label: 'YouTube', icon: Youtube, count: youtube.length },
  ];

  return (
    <Box fontFamily="'Inter', sans-serif">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack gap={2}>
          <Button variant="ghost" color="gray.400" _hover={{ color: 'white' }} onClick={onBack} size="sm">
            <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back
          </Button>
          <Icon asChild color="yellow.400" w={4} h={4}><Zap /></Icon>
          <Heading size="md" color="white">{skillName} <Text as="span" color="blue.400">Roadmap</Text></Heading>
        </HStack>
      </Flex>

      {/* Flowchart — compact */}
      <Box h="450px" bg="gray.950" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100" overflow="hidden" mb={6} boxShadow="inset 0 0 40px rgba(0,0,0,0.5)">
        <ReactFlow
          nodes={nodes}
          edges={edges.map((e) => ({
            ...e,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2.5, opacity: 0.8 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: '#3b82f6',
            },
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#1e293b" variant="dots" gap={25} size={1} />
          <Controls style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '4px' }} />
        </ReactFlow>
      </Box>

      {/* Resource Tabs (optional) */}
      {showResources && (
        <>
          <Heading size="sm" color="gray.100" mb={3}>
            Resources for <Text as="span" color="blue.400">{skillName}</Text>
          </Heading>

          <Flex gap={2} mb={5} wrap="wrap">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                bg={activeTab === tab.key ? 'blue.500' : 'gray.800'}
                color={activeTab === tab.key ? 'white' : 'gray.400'}
                _hover={{ bg: activeTab === tab.key ? 'blue.600' : 'gray.700' }}
                borderRadius="full"
                size="xs"
                px={4}
                fontWeight="600"
                fontSize="xs"
              >
                <Icon asChild w={3.5} h={3.5}><tab.icon /></Icon>
                {tab.label}
                <Badge ml={1} bg="whiteAlpha.200" color="white" borderRadius="full" px={1.5} fontSize="2xs">
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </Flex>

          {/* ── Courses ── */}
          {activeTab === 'courses' && (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {courses.map((c, i) => (
                <Box
                  key={i}
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
                      <Icon asChild w={4} h={4} color="blue.400"><GraduationCap /></Icon>
                      <Text fontWeight="700" color="gray.100" fontSize="sm">{c.title}</Text>
                    </HStack>
                    <Icon asChild w={3.5} h={3.5} color="gray.500"><ExternalLink /></Icon>
                  </Flex>
                  <Text color="gray.500" fontSize="xs" mb={2}>{c.description}</Text>
                  <Flex gap={2}>
                    <Badge colorPalette={levelColor(c.level)} borderRadius="full" px={2} fontSize="2xs">{c.level}</Badge>
                    <Text color="gray.600" fontSize="2xs">{c.platform}</Text>
                  </Flex>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* ── Certificates ── */}
          {activeTab === 'certificates' && (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {certificates.map((cert, i) => (
                <Box
                  key={i}
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
                      <Icon asChild w={4} h={4} color="yellow.400"><Award /></Icon>
                      <Text fontWeight="700" color="gray.100" fontSize="sm">{cert.title}</Text>
                    </HStack>
                    <Icon asChild w={3.5} h={3.5} color="gray.500"><ExternalLink /></Icon>
                  </Flex>
                  <Text color="gray.500" fontSize="xs" mb={2}>{cert.description}</Text>
                  <Badge colorPalette="purple" borderRadius="full" px={2} fontSize="2xs">{cert.provider}</Badge>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* ── YouTube ── */}
          {activeTab === 'youtube' && (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {youtube.map((vid, i) => (
                <Box
                  key={i}
                  bg="gray.900"
                  border="1px solid"
                  borderColor="gray.800"
                  borderRadius="xl"
                  p={5}
                  cursor="pointer"
                  onClick={() => window.open(vid.videoId ? youtubeWatch(vid.videoId) : `https://www.youtube.com/results?search_query=${encodeURIComponent(vid.title)}`, '_blank')}
                  _hover={{ borderColor: 'red.500', transform: 'translateY(-2px)', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}
                  transition="all 0.2s"
                >
                  <Flex justify="space-between" align="start" mb={2}>
                    <HStack gap={2}>
                      <Icon asChild w={4} h={4} color="red.400"><Play /></Icon>
                      <Text fontWeight="700" color="gray.100" fontSize="sm">{vid.title}</Text>
                    </HStack>
                    <Icon asChild w={3.5} h={3.5} color="gray.500"><ExternalLink /></Icon>
                  </Flex>
                  <Text color="gray.600" fontSize="xs" mb={1}>{vid.channel}</Text>
                  <Text color="gray.500" fontSize="xs">{vid.description}</Text>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Box>
  );
}
