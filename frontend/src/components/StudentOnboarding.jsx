import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Heading, Text, Input, Button,
  Textarea, IconButton, Flex, SimpleGrid,
  Stack, Separator, Card
} from '@chakra-ui/react';
// Using simple toggle buttons for Education Type to avoid Radio export issues
import { Icon } from '@chakra-ui/react';
import { Avatar } from './ui/avatar';
import { createClient } from '@supabase/supabase-js';
import { 
  ChevronRight, ChevronLeft, Plus, Trash2, 
  User, GraduationCap, Briefcase, Rocket, Award, FileText 
} from 'lucide-react';

// Import project UI snippets
import { Field } from './ui/field';
import { ProgressBar, ProgressRoot } from './ui/progress';
import { Alert } from './ui/alert';
import { NativeSelectField, NativeSelectRoot } from './ui/native-select';
import { toaster } from './ui/toaster';

const API_BASE = '/api';
const MAX_RESUME_SIZE_BYTES = 2 * 1024 * 1024;

export default function StudentOnboarding({ token, user, onComplete, onLogout }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedResumeFilename, setSavedResumeFilename] = useState(user?.resume_filename || '');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile_number: user?.mobile_number || '',
    moodle_id: user?.moodle_id || '',
    prn_no: user?.prn_no || '',
    year: user?.year || '',
    division: user?.division || '',
    semester: user?.semester || '',
    // removed `sgpa` field; CGPI is computed from semester SGPIs instead
    atkt_count: user?.atkt_count || 0,
    atkt_subjects: user?.atkt_subjects || '',
    drop_year: user?.drop_year || 'No',
    internships: user?.internships || [],
    core_interests: user?.core_interests || '',
    core_skills: user?.core_skills || '',
    projects: user?.projects || [],
    github_profile: user?.github_profile || '',
    linkedin_profile: user?.linkedin_profile || '',
    certifications: user?.certifications || '',
    achievements: user?.achievements || '',
    // Academic marks
    marks_10th: user?.marks_10th || '',
    marks_12th: user?.marks_12th || '',
    diploma_avg: user?.diploma_avg || '',
    sem1: user?.sem1 || '',
    sem2: user?.sem2 || '',
    sem3: user?.sem3 || '',
    sem4: user?.sem4 || '',
    sem5: user?.sem5 || '',
    sem6: user?.sem6 || '',
  });
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [educationType, setEducationType] = useState(user?.educationType || '12th');

  // Supabase client (reads Vite env vars)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const [errors, setErrors] = useState({});
  const totalSteps = 6;

  useEffect(() => {
    setSavedResumeFilename(user?.resume_filename || '');
  }, [user?.resume_filename]);

  // Progress Calculation
  const calculateProgress = () => {
    const fields = [
      formData.moodle_id,
      formData.year,
      formData.division,
      formData.semester,
      formData.drop_year,
      formData.core_interests,
      formData.core_skills,
      formData.github_profile,
      formData.linkedin_profile,
      formData.certifications,
      formData.achievements,
      formData.resumeFile || savedResumeFilename
    ];
    
    let filledCount = fields.filter(f => f && String(f).trim() !== '').length;
    
    // Special checks for lists
    if (formData.internships.length > 0) filledCount += 1;
    if (formData.projects.length > 0) filledCount += 1;
    
    const totalCount = fields.length + 2; // + internships + projects
    return Math.round((filledCount / totalCount) * 100);
  };

  const currentProgress = calculateProgress();

  const getVisibleSemesters = () => {
    const startSem = educationType === 'diploma' ? 3 : 1;
    const selectedSem = Number(formData.semester);
    const endSem = Number.isFinite(selectedSem) && selectedSem > 0
      ? Math.min(6, selectedSem)
      : 6;
    const semesters = [];
    for (let sem = startSem; sem <= endSem; sem += 1) semesters.push(sem);
    return semesters;
  };

  // Compute CGPI and converted percentage from semester SGPIs
  const computeCgpiAndPercentage = () => {
    const semKeys = getVisibleSemesters().map((s) => `sem${s}`);
    const vals = semKeys
      .map(k => parseFloat(formData[k]))
      .filter(v => !Number.isNaN(v));
    if (vals.length === 0) return { cgpi: '', percentage: '' };
    const sum = vals.reduce((a,b) => a + b, 0);
    const cgpi = sum / vals.length;
    const percentRaw = cgpi < 7 ? (7.1 * cgpi) + 12 : (7.4 * cgpi) + 12;
    const finalPercent = Math.ceil(percentRaw);
    return { cgpi: Number(cgpi.toFixed(2)), percentage: finalPercent };
  };

  // Validation logic
  const validateStep = (step) => {
    let newErrors = {};
    if (step === 1) {
      if (!formData.moodle_id) newErrors.moodle_id = 'Moodle ID is required';
      else if (!/^\d{8}$/.test(formData.moodle_id)) newErrors.moodle_id = 'Moodle ID must be exactly 8 digits';
      if (!formData.year) newErrors.year = 'Year is required';
      if (!formData.division) newErrors.division = 'Division is required';
      if (!formData.semester) newErrors.semester = 'Semester is required';
    }
    if (step === 2) {
        // Semesters use SGPI (scale 0-10).
        const checkSGPI = (val) => val === '' || (Number(val) >= 0 && Number(val) <= 10);
        const semKeys = getVisibleSemesters().map((s) => `sem${s}`);
        semKeys.forEach(s => {
          if (!checkSGPI(formData[s])) newErrors[s] = 'Enter valid SGPI (0.00 - 10.00)';
        });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        await handleSubmit();
      }
    } else {
      toaster.create({
        title: 'Validation Error',
        description: 'Please fix the errors before continuing.',
        type: 'error'
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let resumePublicUrl = '';
      let resumeOriginalName = '';

      if (formData.resumeFile) {
        if (formData.resumeFile.type !== 'application/pdf') {
          throw new Error('Only PDF resume files are allowed.');
        }
        if (formData.resumeFile.size > MAX_RESUME_SIZE_BYTES) {
          throw new Error('Resume size must be 2MB or less.');
        }

        if (supabase) {
          const safeName = formData.resumeFile.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
          const objectPath = `${user?.id || 'student'}/${Date.now()}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(objectPath, formData.resumeFile, {
              upsert: true,
              contentType: 'application/pdf',
              cacheControl: '3600',
            });

          if (uploadError) {
            throw new Error(uploadError.message || 'Failed to upload resume to Supabase.');
          }

          const { data: publicData } = supabase.storage.from('resumes').getPublicUrl(objectPath);
          resumePublicUrl = publicData?.publicUrl || '';
          if (!resumePublicUrl) {
            throw new Error('Failed to create resume public URL.');
          }
        }
        resumeOriginalName = formData.resumeFile.name;
      }

      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'internships' || key === 'projects') {
          data.append(key, JSON.stringify(formData[key]));
        } else if (key === 'resumeFile') {
          // Resume is uploaded directly to Supabase. Backend receives URL only.
        } else if (formData[key] !== undefined && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });
      if (resumePublicUrl) {
        data.append('resume_url', resumePublicUrl);
        data.append('resume_filename', resumeOriginalName);
      } else if (formData.resumeFile) {
        // Fallback for missing VITE Supabase envs: backend uploads to Supabase.
        data.append('resume', formData.resumeFile);
      }
      // include education type selection
      data.append('educationType', educationType);

      const resp = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || 'Failed to save profile');
      }
      
      const result = await resp.json();
      setSavedResumeFilename(result?.user?.resume_filename || '');
      updateField('resumeFile', null);
      toaster.create({ title: 'Profile Updated Successfully!', type: 'success' });
      onComplete(result.user, result.analysis);
    } catch (err) {
      toaster.create({ title: 'Error Saving Profile', description: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEducationTypeChange = (type) => {
    setEducationType(type);
    if (type === 'diploma') {
      // clear sem1/sem2 for diploma students
      updateField('sem1', '');
      updateField('sem2', '');
    }
  };

  // Handle profile photo selection + direct upload to Supabase
  const handlePhotoFile = async (file) => {
    if (!file) return;
    if (!supabase) {
      toaster.create({ title: 'Upload Failed', description: 'Supabase is not configured.', type: 'error' });
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toaster.create({ title: 'Invalid file type', description: 'Only JPG/PNG/WEBP allowed', type: 'error' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toaster.create({ title: 'File too large', description: 'Max 2MB allowed', type: 'error' });
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('profile_photos').upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      // Get public URL (if bucket public) — fallback to signed URL generation may be needed for private buckets
      const { data: publicData } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl || '';

      // Persist to backend so server can verify ownership and store in DB
      const resp = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filePath }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Failed to persist photo');
      }
      const j = await resp.json();
      setPhotoPreview(j.photo_url || publicUrl);
      toaster.create({ title: 'Photo uploaded', type: 'success' });
    } catch (err) {
      console.error('Photo upload error', err);
      toaster.create({ title: 'Upload failed', description: err.message || String(err), type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addInternship = () => {
    updateField('internships', [...formData.internships, { companyName: '', durationMonths: '', domain: '', knowledgeGained: '' }]);
  };
  const removeInternship = (index) => {
    const updated = formData.internships.filter((_, i) => i !== index);
    updateField('internships', updated);
  };
  const updateInternship = (index, field, value) => {
    const updated = [...formData.internships];
    updated[index][field] = value;
    updateField('internships', updated);
  };

  const addProject = () => {
    updateField('projects', [...formData.projects, { projectTitle: '', techStackUsed: '', description: '' }]);
  };
  const removeProject = (index) => {
    const updated = formData.projects.filter((_, i) => i !== index);
    updateField('projects', updated);
  };
  const updateProject = (index, field, value) => {
    const updated = [...formData.projects];
    updated[index][field] = value;
    updateField('projects', updated);
  };

  const inputStyles = {
    bg: 'gray.800', border: '1px solid', borderColor: 'gray.700',
    color: 'white',
    _hover: { borderColor: 'gray.600' },
    _focus: { borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' },
  };

  return (
    <Box position="relative" w="full" maxW="800px" mx="auto">
      {/* Sticky Progress Bar */}
      <Box 
        position="sticky" top="0" zIndex="100" bg="gray.950" 
        pt={4} pb={4} mb={6} borderBottom="1px solid" borderColor="gray.800"
      >
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="bold" color="purple.400">Step {currentStep} of {totalSteps}</Text>
            <Text fontSize="xs" fontWeight="bold" color="gray.400">{currentProgress}% Profile Complete</Text>
          </HStack>
          <ProgressRoot value={currentProgress} size="sm" colorPalette="purple" variant="subtle">
            <ProgressBar borderRadius="full" bg="gray.800" />
          </ProgressRoot>
        </VStack>
      </Box>

      <Card.Root bg="gray.900" border="1px solid" borderColor="gray.800" borderRadius="2xl" p={{ base: 4, md: 8 }} boxShadow="xl">
        <VStack gap={8} align="stretch">
          
          {/* Step 1: Personal & College Details */}
          {currentStep === 1 && (
            <VStack align="stretch" gap={6}>
              <HStack gap={3}>
                <Heading size="lg" color="white" display="flex" alignItems="center">
                  <User size={24} style={{ marginRight: '12px', color: '#a78bfa' }} />
                  Personal & College Details
                </Heading>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                <Box>
                  <Field label="Full Name" disabled opacity={0.6}>
                    <Input value={formData.name} readOnly {...inputStyles} cursor="not-allowed" />
                  </Field>
                  <Field label="Email Address" disabled opacity={0.6}>
                    <Input value={formData.email} readOnly {...inputStyles} cursor="not-allowed" />
                  </Field>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={4}>
                  <Avatar 
                    name={formData.name} 
                    src={photoPreview} 
                    size="2xl" 
                    h="140px" 
                    w="140px"
                    border="4px solid"
                    borderColor="purple.500"
                    boxShadow="0 0 20px rgba(167, 139, 250, 0.3)"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    display="none"
                    id="profile-photo-input"
                    onChange={(e) => handlePhotoFile(e.target.files[0])}
                  />
                  <Button as="label" htmlFor="profile-photo-input" size="sm" mt={3} isLoading={uploadingPhoto} colorPalette="purple">
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </Box>
                <Field label="Moodle ID (8 Digits)" required errorText={errors.moodle_id}>
                  <Input 
                    placeholder="Enter 8-digit Moodle ID" 
                    value={formData.moodle_id} 
                    onChange={(e) => updateField('moodle_id', e.target.value)}
                    {...inputStyles}
                  />
                </Field>
                <Field label="PRN No." required>
                  <Input 
                    placeholder="Enter PRN Number" 
                    value={formData.prn_no} 
                    onChange={(e) => updateField('prn_no', e.target.value)}
                    {...inputStyles}
                  />
                </Field>
                <Field label="Phone Number">
                  <Input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={formData.mobile_number}
                    onChange={(e) => updateField('mobile_number', e.target.value)}
                    {...inputStyles}
                  />
                </Field>
                <Field label="Current Year" required errorText={errors.year}>
                  <NativeSelectRoot {...inputStyles}>
                    <NativeSelectField
                      placeholder="Select Year"
                      value={formData.year}
                      onChange={(e) => updateField('year', e.target.value)}
                      items={[
                        { label: 'First Year (FE)', value: 'FE' },
                        { label: 'Second Year (SE)', value: 'SE' },
                        { label: 'Third Year (TE)', value: 'TE' },
                        { label: 'Fourth Year (BE)', value: 'BE' },
                      ]}
                    />
                  </NativeSelectRoot>
                </Field>
                <Field label="Division" required errorText={errors.division}>
                  <NativeSelectRoot {...inputStyles}>
                    <NativeSelectField
                      placeholder="Select Division"
                      value={formData.division}
                      onChange={(e) => updateField('division', e.target.value)}
                      items={['A', 'B', 'C']}
                    />
                  </NativeSelectRoot>
                </Field>
                <Field label="Current Semester" required errorText={errors.semester}>
                  <NativeSelectRoot {...inputStyles}>
                    <NativeSelectField
                      placeholder="Select Semester"
                      value={formData.semester}
                      onChange={(e) => updateField('semester', e.target.value)}
                      items={[1,2,3,4,5,6,7,8].map(s => ({ label: `Semester ${s}`, value: s }))}
                    />
                  </NativeSelectRoot>
                </Field>
              </SimpleGrid>
            </VStack>
          )}

          {/* Step 2: Academic Record */}
          {currentStep === 2 && (
            <VStack align="stretch" gap={6}>
              <HStack gap={3}>
                <Heading size="lg" color="white" display="flex" alignItems="center">
                  <GraduationCap size={24} style={{ marginRight: '12px', color: '#a78bfa' }} />
                  Academic Record
                </Heading>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                <Box gridColumn={{ md: 'span 2' }}>
                  <Text fontSize="sm" color="gray.400">
                    Enter SGPI semester-wise for your current academics.
                  </Text>
                </Box>

                {getVisibleSemesters().map((sem) => {
                  const key = `sem${sem}`;
                  return (
                    <Field key={key} label={`${sem}${sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} sem SGPI`} errorText={errors[key]}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="e.g. 8.0"
                        value={formData[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        {...inputStyles}
                      />
                    </Field>
                  );
                })}

                {/* Computed CGPI -> Percentage field */}
                {(() => {
                  const { cgpi, percentage } = computeCgpiAndPercentage();
                  return (
                    <Field label="Estimated Percentage (from SGPIs)" helperText={cgpi ? `Computed CGPI: ${cgpi}` : ''}>
                      <Input value={percentage ? `${percentage}%` : ''} readOnly {...inputStyles} />
                    </Field>
                  );
                })()}
              </SimpleGrid>
            </VStack>
          )}

          {/* Step 3: Experience & Core Interests */}
          {currentStep === 3 && (
            <VStack align="stretch" gap={6}>
              <HStack gap={3}>
                <Heading size="lg" color="white" display="flex" alignItems="center">
                  <Briefcase size={24} style={{ marginRight: '12px', color: '#a78bfa' }} />
                  Experience & Core Interests
                </Heading>
              </HStack>
              
              <VStack align="stretch" gap={4}>
                <Text fontWeight="bold" fontSize="md" color="white">Internships</Text>
                {formData.internships.map((intern, idx) => (
                  <Box key={idx} p={4} bg="gray.800/50" borderRadius="xl" border="1px solid" borderColor="gray.700" position="relative">
                    <IconButton 
                      aria-label="Remove internship" size="xs" variant="ghost" colorPalette="red"
                      position="absolute" top={2} right={2} onClick={() => removeInternship(idx)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                      <Field label="Company Name">
                        <Input size="sm" value={intern.companyName} onChange={(e) => updateInternship(idx, 'companyName', e.target.value)} {...inputStyles} />
                      </Field>
                      <Field label="Duration (Months)">
                        <Input size="sm" type="number" value={intern.durationMonths} onChange={(e) => updateInternship(idx, 'durationMonths', e.target.value)} {...inputStyles} />
                      </Field>
                      <Field label="Domain">
                        <Input size="sm" placeholder="e.g. Web Dev, AI" value={intern.domain} onChange={(e) => updateInternship(idx, 'domain', e.target.value)} {...inputStyles} />
                      </Field>
                      <Box gridColumn={{ md: "span 2" }}>
                        <Field label="Knowledge Gained">
                          <Textarea size="sm" value={intern.knowledgeGained} onChange={(e) => updateInternship(idx, 'knowledgeGained', e.target.value)} {...inputStyles} />
                        </Field>
                      </Box>
                    </SimpleGrid>
                  </Box>
                ))}
                <Button variant="outline" size="sm" onClick={addInternship} w="fit-content" colorPalette="purple">
                  <Plus size={16} style={{marginRight: '6px'}} /> Add Internship
                </Button>
              </VStack>

              <Separator borderColor="gray.800" />

              <Field label="Core Interests">
                <Input 
                  placeholder="What domains are you passionate about? (e.g. Cyber Security, Robotics)"
                  value={formData.core_interests}
                  onChange={(e) => updateField('core_interests', e.target.value)}
                  {...inputStyles}
                />
              </Field>
            </VStack>
          )}

          {/* Step 4: Projects & Technical Skills */}
          {currentStep === 4 && (
            <VStack align="stretch" gap={6}>
              <HStack gap={3}>
                <Heading size="lg" color="white" display="flex" alignItems="center">
                  <Rocket size={24} style={{ marginRight: '12px', color: '#a78bfa' }} />
                  Projects & Technical Skills
                </Heading>
              </HStack>

              <Field label="Core Skills / Tech Stack">
                <Input 
                  placeholder="e.g. React, Node.js, Python, MongoDB"
                  value={formData.core_skills}
                  onChange={(e) => updateField('core_skills', e.target.value)}
                  {...inputStyles}
                />
              </Field>

              <VStack align="stretch" gap={4}>
                <Text fontWeight="bold" fontSize="md" color="white">Key Projects</Text>
                {formData.projects.map((proj, idx) => (
                  <Box key={idx} p={4} bg="gray.800/50" borderRadius="xl" border="1px solid" borderColor="gray.700" position="relative">
                    <IconButton 
                      aria-label="Remove project" size="xs" variant="ghost" colorPalette="red"
                      position="absolute" top={2} right={2}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                    <VStack align="stretch" gap={3}>
                      <Field label="Project Title">
                        <Input size="sm" value={proj.projectTitle} onChange={(e) => updateProject(idx, 'projectTitle', e.target.value)} {...inputStyles} />
                      </Field>
                      <Field label="Tech Stack Used">
                        <Input size="sm" value={proj.techStackUsed} onChange={(e) => updateProject(idx, 'techStackUsed', e.target.value)} {...inputStyles} />
                      </Field>
                      <Field label="Description">
                        <Textarea size="sm" value={proj.description} onChange={(e) => updateProject(idx, 'description', e.target.value)} {...inputStyles} />
                      </Field>
                    </VStack>
                  </Box>
                ))}
              </VStack>

              <Separator borderColor="gray.800" />

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field label="GitHub Profile (URL)">
                  <Input 
                    placeholder="https://github.com/yourusername"
                    value={formData.github_profile}
                    onChange={(e) => updateField('github_profile', e.target.value)}
                    {...inputStyles}
                  />
                </Field>
                <Field label="LinkedIn Profile (URL)">
                  <Input 
                    placeholder="https://linkedin.com/in/yourusername"
                    value={formData.linkedin_profile}
                    onChange={(e) => updateField('linkedin_profile', e.target.value)}
                    {...inputStyles}
                  />
                </Field>
              </SimpleGrid>
            </VStack>
          )}

          {/* Step 5: Certifications & Achievements */}
          {currentStep === 5 && (
            <VStack align="stretch" gap={6}>
              <HStack gap={3}>
                <Heading size="lg" color="white" display="flex" alignItems="center">
                  <Award size={24} style={{ marginRight: '12px', color: '#a78bfa' }} />
                  Certifications & Achievements
                </Heading>
              </HStack>

              <Field label="Certifications">
                <Textarea 
                  minH="150px"
                  placeholder="List your certificates and issuing platforms (e.g. AWS Solutions Architect - Udemy)"
                  value={formData.certifications}
                  onChange={(e) => updateField('certifications', e.target.value)}
                  {...inputStyles}
                />
              </Field>

              <Field label="Achievements">
                <Textarea 
                  minH="150px"
                  placeholder="Hackathons, Tech Fests, Competitions, or Extracurricular highlights"
                  value={formData.achievements}
                  onChange={(e) => updateField('achievements', e.target.value)}
                  {...inputStyles}
                />
              </Field>
            </VStack>
          )}

          {/* Step 6: Resume Upload */}
          {currentStep === 6 && (
            <VStack align="stretch" gap={6}>
              <HStack gap={3}>
                <Heading size="lg" color="white" display="flex" alignItems="center">
                  <FileText size={24} style={{ marginRight: '12px', color: '#a78bfa' }} />
                  Resume Upload
                </Heading>
              </HStack>

              <Box 
                p={10} bg="gray.800/40" borderRadius="2xl" border="2px dashed" borderColor="gray.700"
                display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={4}
              >
                <Input 
                  type="file" accept="application/pdf"
                  onChange={(e) => updateField('resumeFile', e.target.files[0])}
                  display="none" id="resume-upload"
                />
                <Button as="label" htmlFor="resume-upload" variant="outline" cursor="pointer" colorPalette="purple">
                  <Plus size={16} style={{marginRight: '8px'}} /> Choose PDF Resume
                </Button>
                <Text color="gray.500" fontSize="sm">
                  {formData.resumeFile
                    ? `Selected: ${formData.resumeFile.name}`
                    : savedResumeFilename
                      ? `Uploaded: ${savedResumeFilename}`
                      : 'Only .PDF files accepted'}
                </Text>
              </Box>

              <Alert 
                status="info" 
                title="AI Analysis Trigger" 
                borderRadius="lg"
                bg="blue.900/20"
                borderColor="blue.800/50"
              >
                Submitting your profile will trigger an AI-based analysis of your placement readiness score!
              </Alert>
            </VStack>
          )}

          {/* Navigation Buttons */}
          <Flex justify="space-between" pt={4} borderTop="1px solid" borderColor="gray.800">
            <Button 
              variant="ghost" 
              onClick={handleBack} 
              disabled={currentStep === 1 || loading}
              visibility={currentStep === 1 ? 'hidden' : 'visible'}
              color="gray.400" _hover={{color: 'white', bg: 'whiteAlpha.100'}}
            >
              <ChevronLeft size={16} style={{marginRight: '8px'}} /> Previous
            </Button>
            <Button 
              colorPalette="purple" 
              onClick={handleNext}
              loading={loading}
              px={currentStep === totalSteps ? 8 : 6}
            >
              {currentStep === totalSteps ? 'Submit Profile' : 'Save & Continue'}
              {currentStep !== totalSteps && <ChevronRight size={16} style={{marginLeft: '8px'}} />}
            </Button>
          </Flex>

        </VStack>
      </Card.Root>

      <Box mt={10} textAlign="center" opacity={0.5} _hover={{opacity: 1}} transition="opacity 0.2s">
        <Button variant="ghost" colorPalette="red" size="xs" onClick={onLogout}>
          Logout Session
        </Button>
      </Box>
    </Box>
  );
}
