import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Flex, Heading, Text, Button, HStack, Icon, SimpleGrid, Container, GridItem, VStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowRight, GraduationCap, Building2, Zap, Shield, Globe, Sun, Moon } from 'lucide-react';
import { ColorModeButton } from '../components/ui/color-mode';
import IntegrationsBlock from '../components/IntegrationsBlock';

import PhysicsChips from '../components/PhysicsChips';

const JOB_ROLES = [
  'Software Engineer', 'Data Analyst', 'Product Manager', 'UX Designer',
  'Marketing Executive', 'Financial Analyst', 'HR Specialist', 'Sales Representative',
  'Graphic Designer', 'Content Creator', 'DevOps Engineer', 'Business Analyst',
];

const COLORS = [
  'purple.600', 'purple.500', 'purple.400'
];

export default function LandingPage({ onGetStarted, onLoginClick }) {
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
        <Text fontSize={{ base: "4xl", md: "6xl" }} fontWeight="900" color="purple.800" textTransform="uppercase" whiteSpace="nowrap">
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
        <Text fontSize={{ base: "5xl", md: "7xl" }} fontWeight="900" color="blue.900" textTransform="uppercase" whiteSpace="nowrap">
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
        <Text fontSize={{ base: "3xl", md: "5xl" }} fontWeight="900" color="teal.900" textTransform="uppercase" whiteSpace="nowrap">
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
        h="100vh"
        direction="column"
        position="relative"
        overflow="hidden"
        onTouchMove={(e) => {
          // Disabled chip spawning on touch to prevent flickering and layout shifts
        }}
      >
        <FloatingBackgroundTags />
        <PhysicsChips />

        {/* Header */}
        <Flex
          as="header"
          w="full"
          px={{ base: 6, md: 12 }}
          py={6}
          align="center"
          justify="space-between"
          position="relative"
          zIndex={40}
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
          {/* removed nav links: Overview / Features / Pricing per request */}
          <HStack gap={4}>
            <ColorModeButton variant="ghost" />
            <Button
              size="sm"
              variant="outline"
              borderColor="border"
              _hover={{ bg: 'bg.subtle' }}
              onClick={() => {
                console.log('Login clicked');
                if (onLoginClick) onLoginClick();
              }}
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
          zIndex={30}
          textAlign="center"
          pointerEvents="auto"
        >
          <Heading
            size={{ base: "3xl", md: "4xl" }}
            fontWeight="900"
            mb={4}
            lineHeight="1.1"
            letterSpacing="tight"
          >
            <Text as="span" color="fg">Get Ready To </Text>
            <Text
              as="span"
              bgGradient="to-r"
              gradientFrom="purple.500"
              gradientTo="blue.500"
              bgClip="text"
            >
              GET HIRED
            </Text>
          </Heading>

          <Text color="fg.muted" fontSize={{ base: "sm", md: "xl" }} maxW="600px" mb={6}>
            Prepare for your dream role with AI-powered insights, real-time quizzes, and personalized career roadmaps.
          </Text>

          <Box pointerEvents="auto" mt={{ base: 2, md: 8 }} position="relative" zIndex={50}>
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
                onClick={() => {
                  console.log('Get Started clicked');
                  if (onGetStarted) onGetStarted();
                }}
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

      <IntegrationsBlock />

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
