import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Flex, Heading, Text, Button, HStack, Icon, SimpleGrid, Container, GridItem, VStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowRight, GraduationCap, Building2, Zap, Shield, Globe, Sun, Moon } from 'lucide-react';
import { ColorModeButton } from '../components/ui/color-mode';
import Matter from 'matter-js';

const JOB_ROLES = [
  'Software Engineer', 'Data Analyst', 'Product Manager', 'UX Designer',
  'Marketing Executive', 'Financial Analyst', 'HR Specialist', 'Sales Representative',
  'Graphic Designer', 'Content Creator', 'DevOps Engineer', 'Business Analyst',
];

const COLORS = [
  'purple.600', 'purple.500', 'purple.400'
];

export default function LandingPage({ onGetStarted, onLoginClick }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const [chips, setChips] = useState([]);
  const lastSpawnTimeRef = useRef(0);
  const chipIdRef = useRef(0);

  // Initialize Matter.js Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const { Engine, World, Bodies, Runner, Events } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;
    
    // Set up world boundaries (invisible floor and walls)
    const updateBoundaries = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      World.clear(engine.world, false);
      
      const floor = Bodies.rectangle(width / 2, height + 10, width, 50, { isStatic: true });
      const leftWall = Bodies.rectangle(-10, height / 2, 50, height, { isStatic: true });
      const rightWall = Bodies.rectangle(width + 10, height / 2, 50, height, { isStatic: true });
      
      World.add(engine.world, [floor, leftWall, rightWall]);
    };

    updateBoundaries();
    window.addEventListener('resize', updateBoundaries);

    // Runner
    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;

    // Sync React state with Matter.js positions
    const syncLoop = () => {
      setChips((currentChips) => {
        const now = Date.now();
        return currentChips
          .filter((chip) => {
            // Remove from Matter world and React state if older than 1.5 seconds
            if (now - chip.spawnTime > 1500) {
              World.remove(engine.world, chip.body);
              return false;
            }
            return true;
          })
          .map((chip) => ({
            ...chip,
            x: chip.body.position.x,
            y: chip.body.position.y,
            angle: chip.body.angle,
          }));
      });
      requestAnimationFrame(syncLoop);
    };
    const animId = requestAnimationFrame(syncLoop);

    return () => {
      window.removeEventListener('resize', updateBoundaries);
      Runner.stop(runner);
      Engine.clear(engine);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    const now = Date.now();
    if (now - lastSpawnTimeRef.current < 90) return; // Throttle 80-100ms
    lastSpawnTimeRef.current = now;

    if (!engineRef.current) return;

    const { Bodies, World } = Matter;
    const x = e.clientX;
    const y = e.clientY;

    const text = JOB_ROLES[Math.floor(Math.random() * JOB_ROLES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    // Reduced chip dimensions
    const chipWidth = text.length * 8 + 30;
    const chipHeight = 35;

    const body = Bodies.rectangle(x, y, chipWidth, chipHeight, {
      restitution: 0.6, // Bounciness
      friction: 0.1,
      chamfer: { radius: 20 }, // Rounded corners for physics
    });

    World.add(engineRef.current.world, body);

    setChips((prev) => [
      ...prev,
      { 
        id: chipIdRef.current++, 
        text, 
        color, 
        body, 
        width: chipWidth, 
        height: chipHeight, 
        x, 
        y, 
        angle: 0, 
        spawnTime: Date.now() 
      }
    ]);

    // Limit persistent chips is now handled by the opacity filter in syncLoop
  }, []);

  // Hardcoded drifting background elements
  const FloatingBackgroundTags = () => (
    <Box position="absolute" inset={0} overflow="hidden" pointerEvents="none" opacity={0.3} zIndex={0}>
      <Box
        position="absolute"
        top="20%"
        left="10%"
        animation="float 15s ease-in-out infinite"
        transform="rotate(-15deg)"
      >
        <Text fontSize="6xl" fontWeight="900" color="purple.800" textTransform="uppercase" whiteSpace="nowrap">
          Engineering
        </Text>
      </Box>
      <Box
        position="absolute"
        bottom="15%"
        right="5%"
        animation="float 20s ease-in-out infinite reverse"
        transform="rotate(10deg)"
      >
        <Text fontSize="7xl" fontWeight="900" color="blue.900" textTransform="uppercase" whiteSpace="nowrap">
          Marketing
        </Text>
      </Box>
      <Box
        position="absolute"
        top="60%"
        left="5%"
        animation="float 18s ease-in-out infinite"
        transform="rotate(-5deg)"
      >
        <Text fontSize="5xl" fontWeight="900" color="teal.900" textTransform="uppercase" whiteSpace="nowrap">
          Operations
        </Text>
      </Box>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </Box>
  );

  return (
    <Box bg="bg" minH="100vh">
      {/* ── HERO SECTION ── */}
      <Flex
        ref={containerRef}
        h="100vh"
        direction="column"
        position="relative"
        overflow="hidden"
        onMouseMove={handleMouseMove}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            e.clientX = e.touches[0].clientX;
            e.clientY = e.touches[0].clientY;
            handleMouseMove(e);
          }
        }}
      >
        <FloatingBackgroundTags />

        <Box position="absolute" inset={0} pointerEvents="none" zIndex={1}>
          {chips.map((chip) => {
            const age = Date.now() - chip.spawnTime;
            const opacity = Math.max(0, 1 - age / 1500);
            
            return (
              <Box
                key={chip.id}
                position="absolute"
                left={`${chip.x}px`}
                top={`${chip.y}px`}
                transform={`translate(-50%, -50%) rotate(${chip.angle}rad)`}
                bg={chip.color}
                color="white"
                px={4}
                py={2}
                borderRadius="xl"
                fontWeight="700"
                fontSize={{ base: "xs", md: "sm" }}
                whiteSpace="nowrap"
                boxShadow="0 6px 15px rgba(0,0,0,0.4)"
                border="1px solid rgba(255,255,255,0.3)"
                opacity={opacity}
                style={{ backdropFilter: 'blur(6px)' }}
              >
                {chip.text}
              </Box>
            );
          })}
        </Box>

        {/* Header */}
        <Flex 
          as="header" 
          w="full" 
          px={{ base: 6, md: 12 }} 
          py={6} 
          align="center" 
          justify="space-between" 
          position="relative" 
          zIndex={10}
          borderBottom="1px solid"
          borderColor="border.subtle"
        >
        <HStack gap={2}>
          <Icon asChild color="blue.500" w={6} h={6}>
            <Briefcase />
          </Icon>
          <Heading size="md" fontWeight="800" color="fg" letterSpacing="tight">
            HireReady
          </Heading>
        </HStack>
        <HStack gap={8} display={{ base: 'none', md: 'flex' }}>
          <Text as="a" href="#" color="fg.muted" fontSize="sm" fontWeight="600" _hover={{ color: 'fg' }}>Overview</Text>
          <Text as="a" href="#" color="fg.muted" fontSize="sm" fontWeight="600" _hover={{ color: 'fg' }}>Features</Text>
          <Text as="a" href="#" color="fg.muted" fontSize="sm" fontWeight="600" _hover={{ color: 'fg' }}>Pricing</Text>
        </HStack>
        <HStack gap={4}>
          <ColorModeButton variant="ghost" />
          <Button 
            size="sm" 
            variant="outline" 
            borderColor="border" 
            _hover={{ bg: 'bg.subtle' }}
            onClick={onLoginClick || (() => {})}
          >
            Login
          </Button>
        </HStack>
      </Flex>

        {/* Hero Content */}
        <Flex 
          flex={1} 
          direction="column" 
          align="center" 
          justify="center" 
          px={4} 
          position="relative" 
          zIndex={10}
          textAlign="center"
          pointerEvents="none" 
        >
          <Heading
            size="4xl"
            fontWeight="900"
            mb={4}
            lineHeight="1.1"
            letterSpacing="tight"
          >
            <Text as="span" color="fg">Find your </Text>
            <Text 
              as="span" 
              bgGradient="to-r" 
              gradientFrom="purple.500" 
              gradientTo="blue.500" 
              bgClip="text"
            >
              ROLE
            </Text>
          </Heading>
          
          <Text color="fg.muted" fontSize={{ base: "md", md: "xl" }} maxW="600px" mb={10}>
            Turn your passion into profit! Start preparing and earning with HireReady today. Find the perfect fit for your skills.
          </Text>

          <Box pointerEvents="auto" mt={8}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                size="md"
                bg="purple.500"
                color="white"
                px={8}
                h="44px"
                fontSize="md"
                fontWeight="bold"
                borderRadius="full"
                _hover={{ bg: 'purple.600', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                shadow="0 10px 25px rgba(168,85,247,0.3)"
                onClick={onGetStarted}
              >
                Get Started <Icon asChild ml={2}><ArrowRight /></Icon>
              </Button>
            </motion.div>
          </Box>
        </Flex>

        {/* Scroll Indicator */}
        <Flex position="absolute" bottom={8} w="full" justify="center" align="center" direction="column" zIndex={10}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Box w="1px" h="40px" bgGradient="to-b" gradientFrom="purple.500" gradientTo="transparent" />
          </motion.div>
          <Text color="gray.500" fontSize="xs" mt={2} letterSpacing="wider" textTransform="uppercase">Scroll down</Text>
        </Flex>
      </Flex>

      <Box bg="bg.subtle" py={24} position="relative" zIndex={20}>
        <Container maxW="6xl" px={{ base: 6, md: 12 }}>
          <VStack gap={4} textAlign="center" mb={16}>
            <Text color="purple.500" fontWeight="bold" letterSpacing="widest" textTransform="uppercase" fontSize="sm">
              Features
            </Text>
            <Heading size="3xl" color="fg" fontWeight="800">
              Why Choose HireReady?
            </Heading>
            <Text color="fg.muted" fontSize="lg" maxW="2xl" mx="auto">
              A complete ecosystem designed to bridge the gap between academic learning and industry requirements.
            </Text>
          </VStack>
 
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
            <Box bg="bg" p={8} borderRadius="2xl" border="1px solid" borderColor="border">
              <Icon asChild color="blue.500" w={10} h={10} mb={6}><Zap /></Icon>
              <Heading size="lg" color="fg" mb={3}>Instant Analysis</Heading>
              <Text color="fg.muted" lineHeight="tall">
                Get immediate, AI-powered feedback on your resumes and GitHub profiles to instantly know where you stand in the competitive market.
              </Text>
            </Box>
            
            <Box bg="bg" p={8} borderRadius="2xl" border="1px solid" borderColor="border">
              <Icon asChild color="purple.500" w={10} h={10} mb={6}><Shield /></Icon>
              <Heading size="lg" color="fg" mb={3}>Targeted Preparation</Heading>
              <Text color="fg.muted" lineHeight="tall">
                Our tailored recommendation engine suggests the exact skills and quizzes you need to pass top-tier technical interviews.
              </Text>
            </Box>
            
            <Box bg="bg" p={8} borderRadius="2xl" border="1px solid" borderColor="border">
              <Icon asChild color="pink.500" w={10} h={10} mb={6}><Globe /></Icon>
              <Heading size="lg" color="fg" mb={3}>Global Opportunities</Heading>
              <Text color="fg.muted" lineHeight="tall">
                TPOs and hiring managers access a verified pipeline of top talent ready to tackle real-world global challenges.
              </Text>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Flex 
        as="footer"
        w="full" 
        p={8} 
        justify="center" 
        align="center" 
        borderTop="1px solid" 
        borderColor="border.subtle"
        bg="bg"
        position="relative"
        zIndex={10}
        direction="column"
        gap={4}
      >
        <HStack gap={2} mb={2}>
          <Icon asChild color="blue.500" w={5} h={5}><Briefcase /></Icon>
          <Heading size="sm" fontWeight="bold" color="fg">
            HireReady
          </Heading>
        </HStack>
        <Text color="fg.muted" fontSize="sm">
          &copy; {new Date().getFullYear()} HireReady Platform. All rights reserved.
        </Text>
      </Flex>
    </Box>
  );
}
