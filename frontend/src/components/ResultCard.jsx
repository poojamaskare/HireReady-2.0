import { Box, Heading, Text } from '@chakra-ui/react';
import { ProgressBar, ProgressRoot } from '@/components/ui/progress';

/**
 * ResultCard — Displays a single recommended role with its match score.
 */
export default function ResultCard({ role, score, rank }) {
  const pct = Math.min(Math.round(score * 100), 100);

  const rankColors = {
    1: 'yellow',
    2: 'gray',
    3: 'orange',
  };
  const color = rankColors[rank] || 'blue';

  return (
    <Box
      bg="gray.900"
      border="1px solid"
      borderColor="gray.800"
      borderRadius="xl"
      p={5}
      w={{ base: 'full', md: '220px' }}
      transition="all 0.2s"
      _hover={{ borderColor: 'gray.700', transform: 'translateY(-2px)' }}
    >
      <Text
        fontSize="xs"
        fontWeight="700"
        color={`${color}.400`}
        mb={1}
      >
        #{rank}
      </Text>
      <Heading size="sm" color="gray.100" mb={3}>{role}</Heading>
      <ProgressRoot value={pct} size="sm" colorPalette={color}>
        <ProgressBar borderRadius="full" />
      </ProgressRoot>
      <Text fontSize="xs" color="gray.400" mt={2}>{pct}% match</Text>
    </Box>
  );
}
