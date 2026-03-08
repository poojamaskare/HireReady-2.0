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

const EMAIL_DOMAIN = '@apsit.edu.in';

const normalizeEmailPrefix = (value) => value.replace(/\s+/g, '').split('@')[0];

export default function TpoLoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailPrefix = normalizeEmailPrefix(email);
    if (!emailPrefix || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (mode === 'register' && !name.trim()) { setError('Please enter your name.'); return; }
    if (email.includes('@')) { setError('Enter only the email prefix before @apsit.edu.in.'); return; }

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
      const fullEmail = `${emailPrefix}${EMAIL_DOMAIN}`;
      const body = mode === 'login'
        ? { email: fullEmail, password }
        : { name: name.trim(), email: fullEmail, password, role: 'tpo' };

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
    const forgotPrefix = normalizeEmailPrefix(forgotEmail);
    if (!forgotPrefix) { setError('Please enter your email.'); return; }
    if (forgotEmail.includes('@')) { setError('Enter only the email prefix before @apsit.edu.in.'); return; }
    setLoading(true);
    try {
      const fullEmail = `${forgotPrefix}${EMAIL_DOMAIN}`;
      const resp = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail }),
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
        setMode('login'); setSuccessMsg(''); setNewPassword(''); setTokenInput(''); setResetToken('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const inputStyles = {
    bg: 'gray.800', border: '1px solid', borderColor: 'gray.700',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' },
  };

  return (
    <Flex minH="100vh" bg="gray.950" align="center" justify="center" direction="column" px={4}>
      <Box textAlign="center" mb={8}>
        <Heading
          size="3xl"
          fontWeight="800"
          bgGradient="to-r"
          gradientFrom="purple.400"
          gradientTo="pink.400"
          bgClip="text"
          mb={1}
        >
          HireReady
        </Heading>
        <Text color="gray.400">Training &amp; Placement Officer Portal</Text>
      </Box>

      <Box
        bg="gray.900"
        border="1px solid"
        borderColor="gray.800"
        borderRadius="2xl"
        p={8}
        w="full"
        maxW="420px"
      >
        {(mode === 'login' || mode === 'register') && (
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

        {(mode === 'login' || mode === 'register') && (
          <>
            <HStack bg="gray.800" borderRadius="lg" p={1} mb={5} gap={0}>
              <Button
                flex={1} size="sm"
                variant={mode === 'login' ? 'solid' : 'ghost'}
                colorPalette={mode === 'login' ? 'purple' : undefined}
                color={mode === 'login' ? 'white' : 'gray.400'}
                onClick={() => { setMode('login'); setError(''); }}
              >
                Login
              </Button>
              <Button
                flex={1} size="sm"
                variant={mode === 'register' ? 'solid' : 'ghost'}
                colorPalette={mode === 'register' ? 'purple' : undefined}
                color={mode === 'register' ? 'white' : 'gray.400'}
                onClick={() => { setMode('register'); setError(''); }}
              >
                Register
              </Button>
            </HStack>

            <Heading size="lg" color="gray.100" mb={1}>
              {mode === 'login' ? 'Welcome back, TPO' : 'Create TPO account'}
            </Heading>
            <Text color="gray.400" fontSize="sm" mb={5}>
              {mode === 'login' ? 'Sign in to manage placements' : 'Register as a placement officer'}
            </Text>

            {error && <Alert status="error" mb={4} title={error} borderRadius="lg" />}

            <form onSubmit={handleSubmit}>
              <VStack gap={4} align="stretch">
                {mode === 'register' && (
                  <Field label="Full Name">
                    <Input placeholder="e.g. Dr. Sharma" value={name}
                      onChange={(e) => setName(e.target.value)} {...inputStyles} />
                  </Field>
                )}
                <Field label="Email">
                  <HStack w="full">
                    <Input type="text" placeholder="Enter email" value={email}
                      onChange={(e) => setEmail(normalizeEmailPrefix(e.target.value))} {...inputStyles} />
                    <Text color="gray.400" whiteSpace="nowrap">{EMAIL_DOMAIN}</Text>
                  </HStack>
                </Field>
                <Field label="Password">
                  <PasswordInput placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} {...inputStyles} />
                </Field>


                <Button
                  type="submit" colorPalette="purple" w="full"
                  loading={loading}
                  loadingText={mode === 'login' ? 'Signing in…' : 'Creating account…'}
                >
                  {mode === 'login' ? 'Sign In as TPO' : 'Create TPO Account'}
                </Button>

                {mode === 'login' && (
                  <Button
                    variant="plain" size="sm" color="purple.400" w="full" fontWeight="400"
                    _hover={{ color: 'purple.300' }}
                    onClick={() => { setMode('forgotPassword'); setError(''); }}
                  >
                    Forgot Password?
                  </Button>
                )}
              </VStack>
            </form>
          </>
        )}

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
                    <Input type="text" placeholder="Enter email" value={forgotEmail}
                      onChange={(e) => setForgotEmail(normalizeEmailPrefix(e.target.value))} {...inputStyles} />
                    <Text color="gray.400" whiteSpace="nowrap">{EMAIL_DOMAIN}</Text>
                  </HStack>
                </Field>
                <Button type="submit" colorPalette="purple" w="full" loading={loading} loadingText="Sending…">
                  Send Reset Link
                </Button>
              </VStack>
            </form>
          </>
        )}

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
                  <Input placeholder="Paste your reset token" value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)} {...inputStyles} />
                </Field>
                <Field label="New Password">
                  <PasswordInput placeholder="••••••••" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} {...inputStyles} />
                </Field>
                <Button type="submit" colorPalette="purple" w="full" loading={loading} loadingText="Resetting…">
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
