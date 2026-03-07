import { Box, Flex, Heading, Text, HStack, Icon, VStack, SimpleGrid, Container, Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { GraduationCap, Building2, ChevronLeft, Briefcase } from 'lucide-react';

export default function RoleSelectionPage({ onSelectRole, onBack }) {
  return (
    <Box bg="gray.950" minH="100vh" py={20}>
      <Container maxW="4xl">
        <VStack gap={12} align="center">
          {/* Header */}
          <VStack gap={4} textAlign="center">
            <HStack gap={2} mb={2}>
              <Icon asChild color="blue.400" w={8} h={8}><Briefcase /></Icon>
              <Heading size="xl" fontWeight="900" color="white" letterSpacing="tight">
                HireReady
              </Heading>
            </HStack>
            <Heading size="2xl" color="white" fontWeight="800">
              How would you like to use HireReady?
            </Heading>
            <Text color="gray.400" fontSize="lg">
              Choose your portal to get started with your journey.
            </Text>
          </VStack>

          {/* Selection Cards */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} w="full">
            {/* Student Card */}
            <motion.div
              whileHover={{ y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                as="button"
                onClick={() => onSelectRole('student')}
                bg="gray.900"
                border="1px solid"
                borderColor="gray.800"
                borderRadius="3xl"
                p={10}
                w="full"
                h="full"
                textAlign="left"
                transition="all 0.3s"
                _hover={{ borderColor: 'blue.400', shadow: '0 20px 40px rgba(59,130,246,0.1)' }}
                position="relative"
                overflow="hidden"
              >
                <Box 
                  position="absolute" 
                  top="-20px" 
                  right="-20px" 
                  w="100px" 
                  h="100px" 
                  bg="blue.500" 
                  opacity="0.1" 
                  filter="blur(40px)"
                />
                <Icon asChild w={12} h={12} color="blue.400" mb={6}><GraduationCap /></Icon>
                <Heading size="xl" color="white" mb={4}>Student</Heading>
                <Text color="gray.400" fontSize="md" lineHeight="tall">
                  Analyze your resume, track your placement readiness, 
                  and discover career roadmaps tailored to your skills.
                </Text>
              </Box>
            </motion.div>

            {/* TPO Card */}
            <motion.div
              whileHover={{ y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                as="button"
                onClick={() => onSelectRole('tpo')}
                bg="gray.900"
                border="1px solid"
                borderColor="gray.800"
                borderRadius="3xl"
                p={10}
                w="full"
                h="full"
                textAlign="left"
                transition="all 0.3s"
                _hover={{ borderColor: 'purple.400', shadow: '0 20px 40px rgba(168,85,247,0.1)' }}
                position="relative"
                overflow="hidden"
              >
                <Box 
                  position="absolute" 
                  top="-20px" 
                  right="-20px" 
                  w="100px" 
                  h="100px" 
                  bg="purple.500" 
                  opacity="0.1" 
                  filter="blur(40px)"
                />
                <Icon asChild w={12} h={12} color="purple.400" mb={6}><Building2 /></Icon>
                <Heading size="xl" color="white" mb={4}>Company / TPO</Heading>
                <Text color="gray.400" fontSize="md" lineHeight="tall">
                  Post openings, manage student pipelines, and find 
                  the perfect talent for your organization's needs.
                </Text>
              </Box>
            </motion.div>
          </SimpleGrid>

          {/* Back Button */}
          <Button 
            variant="ghost" 
            color="gray.500" 
            size="lg"
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
            leftIcon={<Icon asChild><ChevronLeft /></Icon>}
            onClick={onBack}
          >
            Back to Home
          </Button>
        </VStack>
      </Container>
    </Box>
  );
}
