import { useState } from 'react';
import {
  Box, Flex, Heading, Text, Input, Button, VStack, HStack, Icon,
} from '@chakra-ui/react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { PasswordInput } from '@/components/ui/password-input';
import { ChevronLeft } from 'lucide-react';

const API_BASE = '/api';

export default function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (mode === 'register' && !name.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const formattedEmail = `${email.trim()}@apsit.edu.in`;
      const body = mode === 'login'
        ? { email: formattedEmail, password }
        : { name: name.trim(), email: formattedEmail, password };

      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Something went wrong.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toaster.create({
        title: mode === 'login' ? 'Login Successful' : 'Registration Successful',
        type: 'success',
      });
      onLogin(data.token, data.user);
    } catch (err) {
      const errorMsg = err.name === 'TypeError' ? 'Network error — is the backend running?' : err.message;
      setError(errorMsg);
      toaster.create({
        title: mode === 'login' ? 'Login Failed' : 'Registration Failed',
        description: errorMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" bg="gray.950" align="center" justify="center" direction="column" px={4}>
      {/* Branding */}
      <Box textAlign="center" mb={8}>
        <Heading
          size="3xl"
          fontWeight="800"
          bgGradient="to-r"
          gradientFrom="blue.400"
          gradientTo="purple.400"
          bgClip="text"
          mb={1}
        >
          HireReady
        </Heading>
        <Text color="gray.400">AI-powered career readiness analysis</Text>
      </Box>

      {/* Card */}
      <Box
        bg="gray.900"
        border="1px solid"
        borderColor="gray.800"
        borderRadius="2xl"
        p={8}
        w="full"
        maxW="420px"
      >
        {/* Back */}
        {onBack && (
          <Button variant="ghost" size="sm" color="gray.400" mb={3} onClick={onBack}
            _hover={{ color: 'gray.100' }}
          >
            <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back to role selection
          </Button>
        )}

        {/* Toggle */}
        <HStack bg="gray.800" borderRadius="lg" p={1} mb={5} gap={0}>
          <Button
            flex={1}
            size="sm"
            variant={mode === 'login' ? 'solid' : 'ghost'}
            colorPalette={mode === 'login' ? 'blue' : undefined}
            color={mode === 'login' ? 'white' : 'gray.400'}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Login
          </Button>
          <Button
            flex={1}
            size="sm"
            variant={mode === 'register' ? 'solid' : 'ghost'}
            colorPalette={mode === 'register' ? 'blue' : undefined}
            color={mode === 'register' ? 'white' : 'gray.400'}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Register
          </Button>
        </HStack>

        <Heading size="lg" color="gray.100" mb={1}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </Heading>
        <Text color="gray.400" fontSize="sm" mb={5}>
          {mode === 'login' ? 'Sign in to analyze your profile' : 'Register to get started'}
        </Text>

        {error && (
          <Alert status="error" mb={4} title={error} borderRadius="lg" />
        )}

        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            {mode === 'register' && (
              <Field label="Full Name">
                <Input
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'gray.600' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                />
              </Field>
            )}
            <Field label="Email">
              <HStack w="full">
                <Input
                  type="text"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'gray.600' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                />
                <Text color="gray.400" whiteSpace="nowrap">@apsit.edu.in</Text>
              </HStack>
            </Field>
            <Field label="Password">
              <PasswordInput
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bg="gray.800"
                border="1px solid"
                borderColor="gray.700"
                _hover={{ borderColor: 'gray.600' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
              />
            </Field>
            <Button
              type="submit"
              colorPalette="blue"
              w="full"
              loading={loading}
              loadingText={mode === 'login' ? 'Signing in…' : 'Creating account…'}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </VStack>
        </form>
      </Box>
    </Flex>
  );
}
