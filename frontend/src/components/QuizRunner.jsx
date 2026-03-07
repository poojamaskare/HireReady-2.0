import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Button, VStack, HStack, Spinner, Badge, Icon,
} from '@chakra-ui/react';
import { ProgressBar, ProgressRoot } from '@/components/ui/progress';
import { Code, FileQuestion, X, ArrowRight, Check, ChevronLeft } from 'lucide-react';

const API_BASE_URL = '/api';

const QuizRunner = ({ role, difficulty, initialResultId, onComplete, onCancel }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [resultId, setResultId] = useState(initialResultId || null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/quiz/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role, difficulty, resultId: initialResultId }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Failed to generate quiz');
        }
        const data = await res.json();
        setQuestions(data.questions || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [role, difficulty]);

  const handleNext = async () => {
    if (!selectedAnswer) return;
    const updatedAnswers = { ...answers, [currentIndex]: selectedAnswer };
    setAnswers(updatedAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
    } else {
      let correct = 0;
      const answerPayload = questions.map((q, i) => {
        const userAnswer = updatedAnswers[i] || '';
        const isCorrect = userAnswer === q.correctAnswer;
        if (isCorrect) correct++;
        return { questionIndex: i, userAnswer, isCorrect };
      });
      setScore(correct);
      setSubmitted(true);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/quiz/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            role, difficulty, score: correct, totalQuestions: questions.length,
            questions, answers: answerPayload, resultId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setResultId(data.resultId);
        }
      } catch (err) { console.error('Failed to submit', err); }
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" h="400px" gap={4}>
        <Spinner size="xl" color="blue.400" />
        <Text color="gray.300" fontWeight="500">Generating {role} quiz ({difficulty})...</Text>
        <Text color="gray.500" fontSize="sm">This relies on AI and might take 10-20 seconds.</Text>
      </Flex>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <Flex direction="column" align="center" justify="center" h="300px" gap={4}>
        <Box bg="red.500/15" border="1px solid" borderColor="red.500/30" borderRadius="lg" px={6} py={4}>
          <Text color="red.300">{error}</Text>
        </Box>
        <Button variant="outline" borderColor="gray.700" color="gray.300" onClick={onCancel}>
          <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back to Selection
        </Button>
      </Flex>
    );
  }

  /* ── Submitted ── */
  if (submitted) {
    const pct = Math.round((score / questions.length) * 100);
    let badgeColor = 'red';
    let message = 'Needs Practice';
    if (pct >= 80) { badgeColor = 'green'; message = 'Excellent!'; }
    else if (pct >= 50) { badgeColor = 'yellow'; message = 'Good Job'; }

    return (
      <Flex direction="column" align="center" justify="center" h="400px" gap={5}>
        <Heading size="lg" color="gray.100">Quiz Complete!</Heading>
        <Box textAlign="center">
          <Text fontSize="5xl" fontWeight="800" color={`${badgeColor}.400`}>
            {score}
          </Text>
          <Text color="gray.400" fontSize="lg">/ {questions.length}</Text>
        </Box>
        <Badge colorPalette={badgeColor} px={4} py={2} borderRadius="full" fontSize="md">
          {message} ({pct}%)
        </Badge>
        <HStack gap={3} mt={4}>
          <Button colorPalette="blue" onClick={onComplete}>View Results History</Button>
          <Button variant="outline" borderColor="gray.700" color="gray.300" onClick={onCancel}>
            Take Another Quiz
          </Button>
        </HStack>
      </Flex>
    );
  }

  /* ── Active quiz ── */
  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <Box maxW="700px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack gap={2}>
          <Badge colorPalette="blue" px={2} py={1} borderRadius="md">{role}</Badge>
          <Badge colorPalette="purple" px={2} py={1} borderRadius="md">{difficulty}</Badge>
        </HStack>
        <Button size="sm" variant="ghost" color="gray.400" _hover={{ color: 'red.300' }} onClick={onCancel}>
          <Icon asChild w={4} h={4}><X /></Icon> Cancel
        </Button>
      </Flex>

      {/* Progress */}
      <ProgressRoot value={progress} size="xs" colorPalette="blue" mb={6}>
        <ProgressBar borderRadius="full" />
      </ProgressRoot>

      {/* Question card */}
      <Box bg="gray.900" border="1px solid" borderColor="gray.800" borderRadius="xl" p={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <Text color="gray.400" fontSize="sm">Question {currentIndex + 1} of {questions.length}</Text>
          <Badge
            colorPalette={question.type === 'snippet' ? 'teal' : 'blue'}
            fontSize="xs"
          >
            {question.type === 'snippet'
              ? <><Icon asChild w={3} h={3} mr={1}><Code /></Icon>Code</>
              : <><Icon asChild w={3} h={3} mr={1}><FileQuestion /></Icon>MCQ</>}
          </Badge>
        </Flex>

        {/* Question text */}
        <Box mb={5}>
          {question.type === 'snippet' ? (
            <>
              <Text color="gray.200" mb={2}>{question.question.split('```')[0]}</Text>
              <Box bg="gray.800" borderRadius="lg" p={4} fontFamily="mono" fontSize="sm" color="green.300"
                overflowX="auto">
                <pre>{question.question.split('```')[1] || question.question}</pre>
              </Box>
            </>
          ) : (
            <Heading size="md" color="gray.100" fontWeight="500" lineHeight="1.5">
              {question.question}
            </Heading>
          )}
        </Box>

        {/* Options */}
        <VStack gap={2} align="stretch">
          {question.options.map((opt) => (
            <Button
              key={opt}
              variant="outline"
              w="full"
              justifyContent="flex-start"
              textAlign="left"
              whiteSpace="normal"
              h="auto"
              py={3}
              px={4}
              borderColor={selectedAnswer === opt ? 'blue.500' : 'gray.700'}
              bg={selectedAnswer === opt ? 'blue.500/15' : 'transparent'}
              color={selectedAnswer === opt ? 'blue.200' : 'gray.300'}
              _hover={{ borderColor: 'gray.600', bg: 'gray.800' }}
              onClick={() => setSelectedAnswer(opt)}
            >
              {opt}
            </Button>
          ))}
        </VStack>

        {/* Next / Submit */}
        <Button
          colorPalette="blue"
          w="full"
          mt={5}
          size="lg"
          disabled={!selectedAnswer}
          onClick={handleNext}
        >
          {currentIndex < questions.length - 1 ? <>Next Question <Icon asChild w={4} h={4} ml={1}><ArrowRight /></Icon></> : <>Submit Quiz <Icon asChild w={4} h={4} ml={1}><Check /></Icon></>}
        </Button>
      </Box>
    </Box>
  );
};

export default QuizRunner;
