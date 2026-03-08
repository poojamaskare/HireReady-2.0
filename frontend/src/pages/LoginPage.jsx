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

const PASSWORD_RULES = [
  { label: 'Minimum 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { label: 'At least one special character', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState('login'); // login | register | forgotPassword | resetPassword
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (mode === 'register' && !name.trim()) { setError('Please enter your name.'); return; }

    // Password validation for registration
    if (mode === 'register') {
      const failedRules = PASSWORD_RULES.filter(r => !r.test(password));
      if (failedRules.length > 0) {
        setError('Password must contain: ' + failedRules.map(r => r.label).join(', '));
        return;
      }
    } else if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

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
      let data;
      try {
        data = await resp.json();
      } catch {
        throw new Error('Server error. Please try again later.');
      }
      if (!resp.ok) {
        const detail = data.detail;
        const message = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(e => e.msg).join(', ')
            : 'Something went wrong.';
        throw new Error(message);
      }

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (!forgotEmail.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      const formattedEmail = `${forgotEmail.trim()}@apsit.edu.in`;
      const resp = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formattedEmail }),
      });
      let data;
      try {
        data = await resp.json();
      } catch {
        throw new Error('Server error. Please try again later.');
      }
      if (!resp.ok) {
        const detail = data.detail;
        const message = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(e => e.msg).join(', ')
            : 'Something went wrong.';
        throw new Error(message);
      }
      setSuccessMsg(data.message || 'If the email exists, a password reset link has been sent.');
      setForgotEmail('');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (!tokenInput.trim() || !newPassword.trim()) { setError('Please fill in all fields.'); return; }

    const failedRules = PASSWORD_RULES.filter(r => !r.test(newPassword));
    if (failedRules.length > 0) {
      setError('Password must contain: ' + failedRules.map(r => r.label).join(', '));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim(), new_password: newPassword }),
      });
      let data;
      try {
        data = await resp.json();
      } catch {
        throw new Error('Server error. Please try again later.');
      }
      if (!resp.ok) {
        const detail = data.detail;
        const message = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(e => e.msg).join(', ')
            : 'Something went wrong.';
        throw new Error(message);
      }
      setSuccessMsg(data.message);
      toaster.create({ title: 'Password Reset', description: data.message, type: 'success' });
      setTimeout(() => {
        setMode('login');
        setSuccessMsg('');
        setNewPassword('');
        setTokenInput('');
        setResetToken('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const inputStyles = {
    bg: 'gray.800', border: '1px solid', borderColor: 'gray.700',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' },
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
        {onBack && (mode === 'login' || mode === 'register') && (
          <Button variant="ghost" size="sm" color="gray.400" mb={3} onClick={onBack}
            _hover={{ color: 'gray.100' }}
          >
            <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back to role selection
          </Button>
        )}
        {(mode === 'forgotPassword' || mode === 'resetPassword') && (
          <Button variant="ghost" size="sm" color="gray.400" mb={3}
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            _hover={{ color: 'gray.100' }}
          >
            <Icon asChild w={4} h={4}><ChevronLeft /></Icon> Back to login
          </Button>
        )}

        {/* Login/Register Toggle */}
        {(mode === 'login' || mode === 'register') && (
          <>
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
                      {...inputStyles}
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
                      {...inputStyles}
                    />
                    <Text color="gray.400" whiteSpace="nowrap">@apsit.edu.in</Text>
                  </HStack>
                </Field>
                <Field label="Password">
                  <PasswordInput
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    {...inputStyles}
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

                {mode === 'login' && (
                  <Button
                    variant="plain"
                    size="sm"
                    color="blue.400"
                    w="full"
                    fontWeight="400"
                    _hover={{ color: 'blue.300' }}
                    onClick={() => { setMode('forgotPassword'); setError(''); }}
                  >
                    Forgot Password?
                  </Button>
                )}
              </VStack>
            </form>
          </>
        )}

        {/* Forgot Password Mode */}
        {mode === 'forgotPassword' && (
          <>
            <Heading size="lg" color="gray.100" mb={1}>Forgot Password</Heading>
            <Text color="gray.400" fontSize="sm" mb={5}>
              Enter your registered email to receive a password reset link
            </Text>

            {error && <Alert status="error" mb={4} title={error} borderRadius="lg" />}
            {successMsg && <Alert status="success" mb={4} title={successMsg} borderRadius="lg" />}

            <form onSubmit={handleForgotPassword}>
              <VStack gap={4} align="stretch">
                <Field label="Email">
                  <HStack w="full">
                    <Input
                      type="text"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      {...inputStyles}
                    />
                    <Text color="gray.400" whiteSpace="nowrap">@apsit.edu.in</Text>
                  </HStack>
                </Field>
                <Button
                  type="submit"
                  colorPalette="blue"
                  w="full"
                  loading={loading}
                  loadingText="Sending…"
                >
                  Send Reset Link
                </Button>
              </VStack>
            </form>
          </>
        )}

        {/* Reset Password Mode */}
        {mode === 'resetPassword' && (
          <>
            <Heading size="lg" color="gray.100" mb={1}>Reset Password</Heading>
            <Text color="gray.400" fontSize="sm" mb={5}>
              Enter the reset token and your new password
            </Text>

            {error && <Alert status="error" mb={4} title={error} borderRadius="lg" />}
            {successMsg && <Alert status="success" mb={4} title={successMsg} borderRadius="lg" />}

            <form onSubmit={handleResetPassword}>
              <VStack gap={4} align="stretch">
                <Field label="Reset Token">
                  <Input
                    placeholder="Paste your reset token"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    {...inputStyles}
                  />
                </Field>
                <Field label="New Password">
                  <PasswordInput
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    {...inputStyles}
                  />
                </Field>


                <Button
                  type="submit"
                  colorPalette="blue"
                  w="full"
                  loading={loading}
                  loadingText="Resetting…"
                >
                  Reset Password
                </Button>
              </VStack>
            </form>
          </>
        )}
      </Box>
    </Flex>
  );
}
