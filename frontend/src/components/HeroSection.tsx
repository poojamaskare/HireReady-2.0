import React from 'react';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';

export interface HeroSectionProps {
  onBeginJourney?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onBeginJourney }) => {
  return (
    <Box bg="bg" minH="60vh" display="flex" alignItems="center" justifyContent="center">
      <VStack gap={4} textAlign="center" maxW="800px" px={6}>
        <Heading size="3xl" fontWeight="900">
          <Text as="span" color="fg">Get Ready To </Text>
          <Text as="span" bgGradient="linear(to-r, purple.500, blue.500)" bgClip="text">
            GET HIRED
          </Text>
        </Heading>

        <Text color="fg.muted" fontSize={{ base: 'md', md: 'xl' }}>
          Prepare for your dream role with AI-powered insights, real-time quizzes, and personalized career roadmaps.
        </Text>

        <Button size="lg" bg="purple.500" color="white" onClick={onBeginJourney} _hover={{ bg: 'purple.600' }}>
          Get Started
        </Button>
      </VStack>
    </Box>
  );
};

export default HeroSection;
