import { useState, useEffect } from 'react';
import {
  Box, Heading, Text, Input, Button, VStack,
  Textarea, Icon,
} from '@chakra-ui/react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { FileUp, Paperclip, File } from 'lucide-react';

const API_BASE = '/api';

export default function ProfilePage({ token, user, onProfileUpdate, onLogout }) {
  const [name, setName] = useState(user?.name || '');
  const [githubUsername, setGithubUsername] = useState(user?.github_username || '');
  const [leetcodeUsername, setLeetcodeUsername] = useState(user?.leetcode_username || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || '');
  const [cgpa, setCgpa] = useState(user?.cgpa != null ? String(user.cgpa) : '');
  const [certifications, setCertifications] = useState(user?.certifications || '');
  const [preferredJobRoles, setPreferredJobRoles] = useState(user?.preferred_job_roles || '');
  const [resumeFile, setResumeFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setGithubUsername(user?.github_username || '');
    setLeetcodeUsername(user?.leetcode_username || '');
    setMobileNumber(user?.mobile_number || '');
    setCgpa(user?.cgpa != null ? String(user.cgpa) : '');
    setCertifications(user?.certifications || '');
    setPreferredJobRoles(user?.preferred_job_roles || '');
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') setResumeFile(file);
    else if (file) setMessage('❌ Please upload a PDF file.');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    console.log('[ProfilePage] Save clicked, submitting form...');
    setSaving(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('github_username', githubUsername.trim());
      formData.append('leetcode_username', leetcodeUsername.trim());
      formData.append('mobile_number', mobileNumber.trim());
      formData.append('cgpa', cgpa.trim());
      formData.append('certifications', certifications.trim());
      formData.append('preferred_job_roles', preferredJobRoles.trim());
      if (resumeFile) formData.append('resume', resumeFile);

      const resp = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      console.log('[ProfilePage] Response status:', resp.status);
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || 'Failed to update profile.');
      }
      const data = await resp.json();
      console.log('[ProfilePage] Save successful:', data);
      onProfileUpdate(data.user, data.analysis);
      setMessage(data.analysis
        ? `✅ Saved & Analyzed! (${data.analysis.readiness_category})`
        : '✅ Profile saved!');
      setResumeFile(null);
    } catch (err) {
      console.error('[ProfilePage] Save error:', err);
      const msg = err.name === 'TypeError'
        ? '❌ Network error — is the backend server running? (python -m uvicorn main:app --reload)'
        : `❌ ${err.message}`;
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputStyles = {
    bg: 'gray.800',
    border: '1px solid',
    borderColor: 'gray.700',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' },
  };

  return (
    <Box maxW="650px" mx="auto">
      <Heading size="xl" color="gray.100" mb={1}>Your Profile</Heading>
      <Text color="gray.400" fontSize="sm" mb={5}>
        Update your details here. We'll automatically re-analyze your profile whenever you save changes.
      </Text>

      {message && (
        <Alert
          status={message.startsWith('✅') ? 'success' : 'error'}
          title={message}
          borderRadius="lg"
          mb={4}
        />
      )}

      <form onSubmit={handleSave}>
        <VStack gap={4} align="stretch">
          {/* Email (disabled) */}
          <Field label="Email">
            <Input type="email" value={user?.email || ''} disabled {...inputStyles} opacity={0.6} />
          </Field>

          {/* Name */}
          <Field label="Full Name">
            <Input placeholder="Your full name" value={name}
              onChange={(e) => setName(e.target.value)} {...inputStyles} />
          </Field>

          {/* Resume Upload */}
          <Field label="Resume (PDF)">
            <Box
              border="1px dashed"
              borderColor="gray.700"
              borderRadius="lg"
              p={4}
              bg="gray.800/40"
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ color: '#a0aec0', fontSize: '14px' }}
              />
              <Text fontSize="xs" color="gray.500" mt={2}>
                {resumeFile
                  ? <><Icon asChild w={3} h={3} mr={1} display="inline"><File /></Icon>Selected: {resumeFile.name}</>
                  : user?.resume_filename
                    ? <><Icon asChild w={3} h={3} mr={1} display="inline"><Paperclip /></Icon>Current: {user.resume_filename}</>
                    : 'No resume uploaded'}
              </Text>
            </Box>
          </Field>

          {/* GitHub */}
          <Field label="GitHub Username">
            <Input placeholder="e.g. octocat" value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)} {...inputStyles} />
          </Field>

          {/* LeetCode */}
          <Field label="LeetCode Username">
            <Input placeholder="e.g. leetcoder123" value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)} {...inputStyles} />
          </Field>

          {/* Mobile */}
          <Field label="Mobile Number">
            <Input placeholder="e.g. +91-9876543210" value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)} {...inputStyles} />
          </Field>

          {/* CGPA */}
          <Field label="CGPA (out of 10)">
            <Input type="number" step="0.01" min="0" max="10" placeholder="e.g. 8.5"
              value={cgpa} onChange={(e) => setCgpa(e.target.value)} {...inputStyles} />
          </Field>

          {/* Certifications */}
          <Field label="Certifications (comma-separated)" helperText="Separate multiple certifications with commas">
            <Input placeholder="e.g. AWS Cloud Practitioner, Google Data Analytics"
              value={certifications} onChange={(e) => setCertifications(e.target.value)} {...inputStyles} />
          </Field>

          {/* Preferred Job Roles */}
          <Field label="Preferred Job Roles (comma-separated)" helperText="Separate multiple roles with commas">
            <Input placeholder="e.g. Backend Developer, ML Engineer"
              value={preferredJobRoles} onChange={(e) => setPreferredJobRoles(e.target.value)} {...inputStyles} />
          </Field>

          <Button
            type="submit"
            colorPalette="blue"
            size="lg"
            w="full"
            loading={saving}
            loadingText="Saving & Analyzing…"
          >
            Save & Analyze
          </Button>
        </VStack>
      </form>

      <Box mt={8} pt={4} borderTop="1px solid" borderColor="gray.800">
        <Button variant="ghost" colorPalette="red" onClick={onLogout}>
          Logout
        </Button>
      </Box>
    </Box>
  );
}
