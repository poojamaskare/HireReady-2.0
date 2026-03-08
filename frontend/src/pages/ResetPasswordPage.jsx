import { useMemo, useState } from 'react';
import { Box, Flex, Heading, Text, VStack, Button } from '@chakra-ui/react';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { toaster } from '@/components/ui/toaster';
import { PasswordInput } from '@/components/ui/password-input';

const API_BASE = '/api';

const PASSWORD_RULES = [
  { label: 'Minimum 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { label: 'At least one special character', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  const inputStyles = {
    bg: 'gray.800', border: '1px solid', borderColor: 'gray.700',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    const failedRules = PASSWORD_RULES.filter((r) => !r.test(newPassword));
    if (failedRules.length > 0) {
      setError('Password must contain: ' + failedRules.map((r) => r.label).join(', '));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      let data;
      try {
        data = await resp.json();
      } catch {
        throw new Error('Server error. Please try again later.');
      }

      if (!resp.ok) {
        throw new Error(data.detail || 'Unable to reset password.');
      }

      setSuccessMsg(data.message || 'Password reset successfully.');
      toaster.create({ title: 'Password Reset', description: data.message || 'Password reset successfully.', type: 'success' });
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" bg="gray.950" align="center" justify="center" direction="column" px={4}>
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
        <Text color="gray.400">Reset your password</Text>
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
        <Heading size="lg" color="gray.100" mb={2}>Set New Password</Heading>
        <Text color="gray.400" fontSize="sm" mb={5}>Enter and confirm your new password.</Text>

        {error && <Alert status="error" mb={4} title={error} borderRadius="lg" />}
        {successMsg && <Alert status="success" mb={4} title={successMsg} borderRadius="lg" />}

        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Field label="New Password">
              <PasswordInput
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                {...inputStyles}
              />
            </Field>
            <Field label="Confirm Password">
              <PasswordInput
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
      </Box>
    </Flex>
  );
}
