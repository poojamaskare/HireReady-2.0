import { Box } from '@chakra-ui/react';
import StudentOnboarding from '../components/StudentOnboarding';

export default function ProfilePage({ token, user, onProfileUpdate, onLogout }) {
  return (
    <Box maxW="800px" mx="auto" py={4}>
      <StudentOnboarding 
        token={token} 
        user={user} 
        onComplete={onProfileUpdate} 
        onLogout={onLogout} 
      />
    </Box>
  );
}
