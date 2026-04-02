import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Button, VStack, HStack, Badge, Spinner,
} from '@chakra-ui/react';
import { NativeSelectField, NativeSelectRoot } from '@/components/ui/native-select';
import QuizRunner from '../components/QuizRunner';

const API_BASE_URL = '/api';

const QuizPage = () => {
  const [roles, setRoles] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retestResultId, setRetestResultId] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [sessionDetails, setSessionDetails] = useState({}); // { [resultId]: { questions, answers, score, total } }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [rolesRes, historyRes] = await Promise.all([
          fetch(`${API_BASE_URL}/quiz/roles`, { headers }),
          fetch(`${API_BASE_URL}/quiz/results`, { headers }),
        ]);
        if (rolesRes.status === 401 || historyRes.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          return;
        }
        if (rolesRes.ok) { const data = await rolesRes.json(); setRoles(data.roles || []); }
        if (historyRes.ok) { const data = await historyRes.json(); setHistory(data.results || []); }
      } catch (err) {
        console.error('Failed to load quiz data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isRunning]);

  const handleStart = () => {
    if (selectedRole) { 
      setRetestResultId(null); 
      setViewOnly(false);
      setIsRunning(true); 
    }
  };

  const handleRetest = (item) => {
    setSelectedRole(item.role);
    setDifficulty(item.difficulty || 'Medium');
    setRetestResultId(item.id);
    setViewOnly(false);
    setIsRunning(true);
  };

  const handleViewResults = (item) => {
    if (!sessionDetails[item.id]) {
      alert("Detailed results are only available for the current session. Refreshing the page clears session memory.");
      return;
    }
    setSelectedRole(item.role);
    setDifficulty(item.difficulty || 'Medium');
    setRetestResultId(item.id);
    setViewOnly(true);
    setIsRunning(true);
  };

  if (isRunning) {
    const sessionInfo = retestResultId ? sessionDetails[retestResultId] : null;

    return (
      <QuizRunner
        role={selectedRole}
        difficulty={difficulty}
        initialResultId={retestResultId}
        viewOnly={viewOnly}
        sessionQuestions={sessionInfo?.questions}
        sessionAnswers={sessionInfo?.answers}
        onComplete={(data) => {
          if (data && data.resultId) {
            setSessionDetails(prev => ({
              ...prev,
              [data.resultId]: data
            }));
          }
          setIsRunning(false);
        }}
        onCancel={() => setIsRunning(false)}
      />
    );
  }

  return (
    <Box>
      {/* Hero */}
      <Box mb={6}>
        <Heading size="xl" color="gray.100" mb={1}>Skill Assessment</Heading>
        <Text color="gray.400">Test your knowledge with AI-generated quizzes tailored to your target role.</Text>
      </Box>

      <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
        {/* Setup card */}
        <Box
          bg="gray.900"
          border="1px solid"
          borderColor="gray.800"
          borderRadius="xl"
          p={6}
          flex={1}
          maxW={{ lg: '380px' }}
        >
          <Heading size="md" color="gray.100" mb={4}>Start New Quiz</Heading>

          {/* Role select */}
          <Box mb={4}>
            <Text fontSize="sm" color="gray.400" mb={1}>Select Role</Text>
            <NativeSelectRoot size="md">
              <NativeSelectField
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                bg="gray.800"
                border="1px solid"
                borderColor="gray.700"
              >
                <option value="">-- Choose a Role --</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>

          {/* Difficulty */}
          <Box mb={4}>
            <Text fontSize="sm" color="gray.400" mb={1}>Difficulty</Text>
            <HStack gap={2}>
              {['Low', 'Medium', 'High'].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  flex={1}
                  variant={difficulty === d ? 'solid' : 'outline'}
                  colorPalette={difficulty === d ? 'blue' : 'gray'}
                  borderColor="gray.700"
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </Button>
              ))}
            </HStack>
          </Box>

          <Button
            colorPalette="blue"
            w="full"
            size="lg"
            disabled={!selectedRole || loading}
            onClick={handleStart}
          >
            Start Quiz
          </Button>
          {!selectedRole && (
            <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
              Please select a role to begin.
            </Text>
          )}
        </Box>

        {/* History */}
        <Box flex={1}>
          <Heading size="sm" color="gray.300" mb={3}>Recent Attempts</Heading>
          {loading ? (
            <Flex justify="center" py={8}><Spinner color="blue.400" /></Flex>
          ) : history.length === 0 ? (
            <Text color="gray.500">No quizzes taken yet.</Text>
          ) : (
            <VStack gap={2} align="stretch">
              {history.map((item) => {
                const pct = item.score / item.total_questions;
                const scoreColor = pct >= 0.8 ? 'green' : pct >= 0.5 ? 'yellow' : 'red';
                return (
                  <Flex
                    key={item.id}
                    bg="gray.900"
                    border="1px solid"
                    borderColor="gray.800"
                    borderRadius="lg"
                    px={4}
                    py={3}
                    align="center"
                    justify="space-between"
                  >
                    <Box>
                      <Text fontWeight="600" color="gray.100" fontSize="sm">{item.role}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {item.difficulty} • {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </Box>
                    <HStack gap={3}>
                      <Badge
                        colorPalette={scoreColor}
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                      >
                        {item.score}/{item.total_questions}
                      </Badge>
                      <HStack gap={2}>
                        {sessionDetails[item.id] && (
                          <Button size="xs" variant="solid" colorPalette="blue"
                              onClick={() => handleViewResults(item)}
                          >
                              View Results
                          </Button>
                        )}
                        <Button size="xs" variant="outline" borderColor="gray.700" color="gray.300"
                            _hover={{ bg: 'gray.800' }}
                            onClick={() => handleRetest(item)}
                        >
                            Retest
                        </Button>
                      </HStack>
                    </HStack>
                  </Flex>
                );
              })}
            </VStack>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default QuizPage;
