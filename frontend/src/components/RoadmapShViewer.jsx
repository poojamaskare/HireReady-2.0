import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  MarkerType,
  applyEdgeChanges,
  applyNodeChanges,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  IconButton,
  HStack,
  VStack,
  Icon,
  Badge,
  Container,
} from '@chakra-ui/react';
import { ChevronLeft, Zap, ExternalLink } from 'lucide-react';

/* ── Custom Node Components ──────────────────────────────────────────── */

// Topic node — primary skill blocks (e.g., "HTML", "CSS", "React")
const TopicNode = ({ data }) => (
  <Box
    bg="linear-gradient(135deg, #1e293b, #0f172a)"
    border="2px solid #3b82f6"
    borderRadius="10px"
    px={3} py={2}
    textAlign="center"
    boxShadow="0 0 12px rgba(59, 130, 246, 0.25)"
    minW="80px"
    position="relative"
  >
    <Handle type="target" id="top" position={Position.Top} style={{ background: '#3b82f6', border: 'none', width: '6px', height: '6px' }} />
    <Handle type="target" id="left" position={Position.Left} style={{ background: '#3b82f6', border: 'none', width: '6px', height: '6px' }} />
    <Handle type="target" id="right" position={Position.Right} style={{ background: '#3b82f6', border: 'none', width: '6px', height: '6px' }} />
    <Handle type="target" id="bottom" position={Position.Bottom} style={{ background: '#3b82f6', border: 'none', width: '6px', height: '6px' }} />
    
    <Handle type="source" id="top" position={Position.Top} style={{ background: '#3b82f6', border: 'none', opacity: 0 }} />
    <Handle type="source" id="left" position={Position.Left} style={{ background: '#3b82f6', border: 'none', opacity: 0 }} />
    <Handle type="source" id="right" position={Position.Right} style={{ background: '#3b82f6', border: 'none', opacity: 0 }} />
    <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: '#3b82f6', border: 'none', opacity: 0 }} />

    <Text fontSize="12px" fontWeight="700" color="#e2e8f0" fontFamily="'Inter', sans-serif">
      {data.label}
    </Text>
  </Box>
);

// Subtopic node — secondary items (e.g., "Git", "npm", "React Router")
const SubtopicNode = ({ data }) => {
  const colorType = data?.style?.colorType;
  let borderColor = '#64748b';
  let bgColor = 'rgba(30, 41, 59, 0.8)';
  if (colorType === 'a') {
    borderColor = '#f59e0b';
    bgColor = 'rgba(245, 158, 11, 0.08)';
  } else if (colorType === 'c') {
    borderColor = '#8b5cf6';
    bgColor = 'rgba(139, 92, 246, 0.08)';
  }

  return (
    <Box
      bg={bgColor}
      border={`1.5px solid ${borderColor}`}
      borderRadius="8px"
      px={3} py={1.5}
      textAlign="center"
      minW="60px"
      position="relative"
    >
      <Handle type="target" id="top" position={Position.Top} style={{ background: borderColor, opacity: 0.5, border: 'none', width: '4px', height: '4px' }} />
      <Handle type="target" id="bottom" position={Position.Bottom} style={{ background: borderColor, opacity: 0.5, border: 'none', width: '4px', height: '4px' }} />
      <Handle type="target" id="left" position={Position.Left} style={{ background: borderColor, opacity: 0.5, border: 'none', width: '4px', height: '4px' }} />
      <Handle type="target" id="right" position={Position.Right} style={{ background: borderColor, opacity: 0.5, border: 'none', width: '4px', height: '4px' }} />
      
      <Handle type="source" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Text fontSize="11px" fontWeight="600" color="#cbd5e1" fontFamily="'Inter', sans-serif">
        {data.label}
      </Text>
    </Box>
  );
};

// Title node — roadmap title (e.g., "Full Stack")
const TitleNode = ({ data }) => (
  <Box px={2} py={1}>
    <Text fontSize="22px" fontWeight="900" color="#f1f5f9" fontFamily="'Inter', sans-serif">
      {data.label}
    </Text>
  </Box>
);

// Paragraph node — descriptive text blocks
const ParagraphNode = ({ data }) => {
  const style = data?.style || {};
  const bgColor = style.backgroundColor && style.backgroundColor.toLowerCase() !== 'transparent' && style.backgroundColor.toLowerCase() !== '#ffffff' && style.backgroundColor.toLowerCase() !== 'white'
    ? style.backgroundColor
    : 'rgba(30, 41, 59, 0.6)';
  const borderCol = style.borderColor && style.borderColor !== 'transparent' && style.borderColor !== '#ffffff'
    ? style.borderColor
    : 'rgba(71, 85, 105, 0.4)';

  return (
    <Box
      bg={bgColor === 'rgba(30, 41, 59, 0.6)' ? bgColor : 'rgba(30, 41, 59, 0.6)'}
      border={`1px solid ${borderCol === 'rgba(71, 85, 105, 0.4)' ? borderCol : 'rgba(71, 85, 105, 0.4)'}`}
      borderRadius="8px"
      px={3} py={2}
      maxW="300px"
      position="relative"
    >
      <Handle type="target" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="target" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Text fontSize="11px" color="#94a3b8" fontFamily="'Inter', sans-serif" textAlign={style.textAlign || 'left'}>
        {data.label}
      </Text>
      <Handle type="source" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </Box>
  );
};

// Button node — links to external pages
const ButtonNode = ({ data }) => (
  <Box
    bg={data.backgroundColor || '#4136D6'}
    color={data.color || '#ffffff'}
    borderRadius="8px"
    px={3} py={1.5}
    textAlign="center"
    cursor="pointer"
    _hover={{ opacity: 0.85 }}
    transition="all 0.2s"
    onClick={() => data.href && window.open(data.href, '_blank')}
    boxShadow="0 2px 8px rgba(65, 54, 214, 0.3)"
    position="relative"
  >
    <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
    <HStack gap={1} justify="center">
      <Text fontSize="11px" fontWeight="600" fontFamily="'Inter', sans-serif">
        {data.label}
      </Text>
      {data.href && <Icon asChild w={3} h={3}><ExternalLink /></Icon>}
    </HStack>
    <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
  </Box>
);

// Label node — simple text labels
const LabelNode = ({ data }) => (
  <Box px={1} position="relative">
    <Handle type="target" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
    <Handle type="target" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    <Handle type="target" id="left" position={Position.Left} style={{ visibility: 'hidden' }} />
    <Handle type="target" id="right" position={Position.Right} style={{ visibility: 'hidden' }} />
    <Text
      fontSize="13px"
      fontWeight="700"
      color={data.color === '#000000' ? '#e2e8f0' : (data.color || '#e2e8f0')}
      fontFamily="'Inter', sans-serif"
    >
      {data.label}
    </Text>
    <Handle type="source" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
    <Handle type="source" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    <Handle type="source" id="left" position={Position.Left} style={{ visibility: 'hidden' }} />
    <Handle type="source" id="right" position={Position.Right} style={{ visibility: 'hidden' }} />
  </Box>
);

// Section node — background grouping (rendered as subtle container)
const SectionNode = () => (
  <Box
    bg="rgba(30, 41, 59, 0.1)"
    border="1px dashed rgba(71, 85, 105, 0.2)"
    borderRadius="12px"
    w="100%"
    h="100%"
  />
);

// Group node — alternative container
const GroupNode = () => (
  <Box
    bg="transparent"
    border="1px solid rgba(71, 85, 105, 0.2)"
    borderRadius="12px"
    w="100%"
    h="100%"
    pointerEvents="none"
  />
);

// Horizontal / Vertical connector nodes — decorative dashes but can have handles
const HorizontalNode = ({ data }) => {
  const style = data?.style || {};
  return (
    <Box
      w="100%"
      h="3px"
      bg={style.stroke || '#2B78E4'}
      opacity={0.5}
      borderRadius="full"
      style={style.strokeDasharray ? { backgroundImage: `repeating-linear-gradient(90deg, ${style.stroke || '#2B78E4'} 0px, ${style.stroke || '#2B78E4'} 4px, transparent 4px, transparent 12px)`, background: 'none' } : {}}
      position="relative"
    >
      <Handle type="target" id="left" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="target" id="right" position={Position.Right} style={{ visibility: 'hidden' }} />
      <Handle type="source" id="left" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" id="right" position={Position.Right} style={{ visibility: 'hidden' }} />
    </Box>
  );
};

const VerticalNode = ({ data }) => {
  const style = data?.style || {};
  return (
    <Box
      w="3px"
      h="100%"
      bg={style.stroke || '#2B78E4'}
      opacity={0.5}
      borderRadius="full"
      mx="auto"
      position="relative"
    >
      <Handle type="target" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="target" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Handle type="source" id="top" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </Box>
  );
};

// Legend node — shows color legend
const LegendNode = ({ data }) => (
  <Box
    bg="rgba(15, 23, 42, 0.9)"
    border="1px solid rgba(71, 85, 105, 0.5)"
    borderRadius="10px"
    px={3} py={2}
  >
    {(data.legends || []).map((legend) => (
      <HStack key={legend.id} gap={2} mb={1}>
        <Box w={3} h={3} borderRadius="sm" bg={legend.color} flexShrink={0} />
        <Text fontSize="10px" color="#94a3b8" fontFamily="'Inter', sans-serif">
          {legend.label}
        </Text>
      </HStack>
    ))}
  </Box>
);

// LinksGroup node — related roadmap links
const LinksGroupNode = ({ data }) => (
  <Box
    bg="rgba(15, 23, 42, 0.9)"
    border="1px solid rgba(71, 85, 105, 0.5)"
    borderRadius="10px"
    px={3} py={2}
  >
    <Text fontSize="11px" fontWeight="700" color="#e2e8f0" mb={2} fontFamily="'Inter', sans-serif">
      {data.label}
    </Text>
    {(data.links || []).map((link) => (
      <Box
        key={link.id}
        cursor="pointer"
        onClick={() => link.url && window.open(link.url, '_blank')}
        _hover={{ bg: 'whiteAlpha.100' }}
        px={2} py={1}
        borderRadius="md"
        mb={0.5}
      >
        <HStack gap={1}>
          <Icon asChild w={3} h={3} color="blue.400"><ExternalLink /></Icon>
          <Text fontSize="10px" color="#60a5fa" fontFamily="'Inter', sans-serif">
            {link.label}
          </Text>
        </HStack>
      </Box>
    ))}
  </Box>
);

/* ── Node type registry ──────────────────────────────────────────────── */
const nodeTypes = {
  topic: TopicNode,
  subtopic: SubtopicNode,
  title: TitleNode,
  paragraph: ParagraphNode,
  button: ButtonNode,
  label: LabelNode,
  section: SectionNode,
  group: GroupNode,
  horizontal: HorizontalNode,
  vertical: VerticalNode,
  legend: LegendNode,
  linksgroup: LinksGroupNode,
};

/* ── Normalize roadmap.sh specific handle IDs (e.g., n1, s2, w1, y2, x2, z2) ── */
const normalizeHandle = (id) => {
  if (!id) return id;
  const first = id.charAt(0).toLowerCase();
  if (first === 'n' || first === 'y') return 'top';
  if (first === 's') return 'bottom';
  if (first === 'e' || first === 'z') return 'right';
  if (first === 'w' || first === 'x') return 'left';
  return id;
};

/* ── Process roadmap.sh nodes for React Flow ─────────────────────────── */
const processNodes = (rawNodes, roadmapTitle) => {
  if (!rawNodes) return [];
  
  const title = (roadmapTitle || '').toLowerCase();
  
  // Blacklist of terms to remove from the roadmap to ensure native feel
  const brandBlacklist = [
    'roadmap.sh',
    'visit the beginner version',
    'detailed version of this roadmap',
    'other similar roadmaps',
    'visit https://roadmap.sh',
    'keep learning with the following',
    'relevant track',
    'ai and data scientist roadmap',
    'build a portfolio',
    'participate in kaggle',
    'online courses and certifications',
    'platforms like coursera',
    'stay updated and network',
    'join networking events',
    'participate in competitions',
    'learn from community',
    'mentorship',
    'webinars',
    'edx, udemy',
    'datacamp',
    'check out',
    'related roadmaps',
    'any query?',
    "hey, i'm",
    'vibe coding',
  ];

  const excludedButtonLabels = [
    'ai agents',
    'prompt engineering',
    'vibe coding roadmap',
    'ai & data scientist',
    'ai and data scientist',
  ];

  return rawNodes
    .filter((n) => {
      if (!n || !n.id || !n.position) return false;
      
      // Remove linksgroup nodes as they are almost always cross-promotions
      if (n.type === 'linksgroup') return false;

      const label = (n.data?.label || '').toLowerCase();
      
      // Remove chatbot/helper popups
      if (label.includes('any query') || label.includes("hey, i'm")) return false;

      // Remove specific cross-link buttons labeled in the screenshot
      if (n.type === 'button') {
        if (excludedButtonLabels.some(term => label.includes(term))) return false;
        if (label.includes('roadmap') && label !== title) return false;
      }

      // Filter out career advice blocks and suggested tracks
      return !brandBlacklist.some(term => label.includes(term.toLowerCase()));
    })
    .map((node) => {
      const type = nodeTypes[node.type] ? node.type : 'topic';
      const measured = node.measured || {};
      const nodeStyle = node.style || {};

      return {
        id: node.id,
        type,
        position: node.position,
        data: node.data || { label: '' },
        zIndex: node.zIndex || 0,
        style: {
          width: measured.width || nodeStyle.width || undefined,
          height: measured.height || nodeStyle.height || undefined,
        },
        selectable: false,
        draggable: false,
      };
    });
};

const processEdges = (rawEdges) => {
  if (!rawEdges) return [];
  return rawEdges
    .filter((e) => e && e.source && e.target)
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: normalizeHandle(edge.sourceHandle),
      targetHandle: normalizeHandle(edge.targetHandle),
      type: edge.type || 'smoothstep',
      animated: false,
      style: {
        stroke: edge.style?.stroke || '#3b82f6',
        strokeWidth: edge.style?.strokeWidth ? Math.min(edge.style.strokeWidth, 2.5) : 2,
        strokeDasharray: edge.style?.strokeDasharray || '0',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.style?.stroke || '#3b82f6',
        width: 15,
        height: 15,
      },
    }));
};

/* ── Main Component ──────────────────────────────────────────────────── */
export default function RoadmapShViewer({ data, onBack, roleName }) {
  const titleRaw = data?.title?.page || data?.title?.card || roleName || 'Roadmap';
  const title = titleRaw.replace(/ Roadmap$/i, '').trim();
  const description = data?.description?.replace(/@currentYear@/g, new Date().getFullYear().toString()).replace(/roadmap\.sh/gi, 'HireReady') || '';

  const initNodes = useMemo(() => processNodes(data?.nodes, title), [data, title]);
  const initEdges = useMemo(() => processEdges(data?.edges), [data]);

  const [nodes, setNodes] = useState(initNodes);
  const [edges, setEdges] = useState(initEdges);

  const onNodesChange = useCallback((c) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c) => setEdges((e) => applyEdgeChanges(c, e)), []);

  return (
    <Container maxW="6xl" py={8}>
      <Box fontFamily="'Inter', sans-serif">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <HStack gap={2}>
          <Button variant="ghost" color="gray.400" _hover={{ color: 'white' }} onClick={onBack} size="sm">
            <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back
          </Button>
          <Icon asChild color="yellow.400" w={4} h={4}><Zap /></Icon>
          <Heading size="md" color="white">
            {title} <Text as="span" color="blue.400">Roadmap</Text>
          </Heading>
        </HStack>
      </Flex>

      {description && (
        <Text color="gray.400" fontSize="sm" mb={4}>{description}</Text>
      )}

      {/* Flowchart */}
      <Box
        h={{ base: '600px', md: '800px' }}
        bg="transparent"
        position="relative"
        mb={6}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#334155" variant="dots" gap={20} size={1} />
          <Controls
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: 'white',
            }}
          />
          <Panel position="bottom-right">
            <Box
              bg="rgba(15, 23, 42, 0.8)"
              backdropFilter="blur(8px)"
              border="1px solid rgba(71,85,105,0.3)"
              borderRadius="lg"
              px={3} py={2}
            >
              <Text fontSize="2xs" color="gray.500">
                Scroll to zoom · Drag to pan · Use controls to fit view
              </Text>
            </Box>
          </Panel>
        </ReactFlow>
      </Box>
    </Box>

    </Container>
  );
}
