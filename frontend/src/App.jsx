import { useState, useEffect } from 'react';
import {
  Box, Flex, VStack, HStack, Text, Heading, Button, Spinner,
  Badge, Icon, IconButton,
} from '@chakra-ui/react';
import { Avatar } from '@/components/ui/avatar';
import {
  MenuContent, MenuItem, MenuRoot, MenuTrigger,
} from '@/components/ui/menu';
import { Tooltip } from '@/components/ui/tooltip';
import {
  LayoutDashboard, FileText, Map, ClipboardList, Briefcase,
  User, PanelLeftClose, PanelLeftOpen, LogOut, ChevronLeft, Bell,
} from 'lucide-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import TpoLoginPage from './pages/TpoLoginPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import TpoDashboard from './pages/TpoDashboard';
import ProfilePage from './pages/ProfilePage';
import ResultCard from './components/ResultCard';
import QuizPage from './pages/QuizPage';
import StudentJobs from './pages/StudentJobs';
import ResumeAnalysisPage from './pages/ResumeAnalysisPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const API_BASE = '/api';

/* ── Sidebar nav items ──────────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'resume', label: 'Resume Analysis', icon: FileText },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'quiz', label: 'Take Quizzes', icon: ClipboardList },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'profile', label: 'Profile', icon: User },
];

export default function App() {
  /* ── Tab state ───────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* ── Role selection (landing page) ──────────────────────────────── */
  const [selectedRole, setSelectedRole] = useState(null);

  /* ── Analysis state ─────────────────────────────────────────────── */
  const [result, setResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  /* ── Auth state ─────────────────────────────────────────────────── */
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  });

  const isLoggedIn = !!token;
  const isResetPasswordRoute = window.location.pathname === '/reset-password';

  if (isResetPasswordRoute) {
    return <ResetPasswordPage />;
  }

  /* ── Notification state ────────────────────────────────────────── */
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifsLoading, setNotifsLoading] = useState(false);

  /* ── Fetch profile & latest analysis on login ───────────────────── */
  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const profileResp = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileResp.ok) {
          const profile = await profileResp.json();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } else if (profileResp.status === 401) {
          handleLogout();
          return;
        }
        fetchAnalysis();
      } catch { /* silently fail */ }
    };
    fetchData();
  }, [token]);

  const fetchAnalysis = async () => {
    setLoadingResult(true);
    try {
      const resp = await fetch(`${API_BASE}/analysis/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data.status === 'success' ? data : null);
      }
    } catch (e) {
      console.error('Failed to fetch analysis', e);
    } finally {
      setLoadingResult(false);
    }
  };

  /* ── Notification helpers ─────────────────────────────────────── */
  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUnreadCount(data.count || 0);
      }
    } catch { /* */ }
  };

  const fetchNotifications = async () => {
    setNotifsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setNotifications(data.notifications || []);
      }
    } catch { /* */ }
    finally { setNotifsLoading(false); }
  };

  const markNotifRead = async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* */ }
  };

  // Poll unread count for students
  useEffect(() => {
    if (!token || user?.role === 'tpo') return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token, user?.role]);

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setResult(null);
    setActiveTab('dashboard');
    setSelectedRole(null);
  };

  const handleProfileUpdate = (updatedUser, newAnalysis) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    if (newAnalysis) setResult(newAnalysis);
  };

  /* ── Helpers ────────────────────────────────────────────────────── */
  const categoryColor = (cat) => {
    if (!cat) return 'green';
    const lower = cat.toLowerCase();
    if (lower.includes('ready') && !lower.includes('almost')) return 'green';
    if (lower.includes('almost')) return 'orange';
    return 'red';
  };

  /* ── If not logged in, show landing → selection → login flow ──────── */
  if (!isLoggedIn) {
    if (!selectedRole) {
      return (
        <LandingPage
          onGetStarted={() => setSelectedRole('selecting')}
          onLoginClick={() => setSelectedRole('selecting')}
        />
      );
    }
    if (selectedRole === 'selecting') {
      return (
        <RoleSelectionPage
          onSelectRole={setSelectedRole}
          onBack={() => setSelectedRole(null)}
        />
      );
    }
    if (selectedRole === 'tpo')
      return <TpoLoginPage onLogin={handleLogin} onBack={() => setSelectedRole('selecting')} />;
    return <LoginPage onLogin={handleLogin} onBack={() => setSelectedRole('selecting')} />;
  }

  /* ── If TPO is logged in, show TPO dashboard ────────────────────── */
  if (user?.role === 'tpo') {
    return <TpoDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  /* ── Student Dashboard with Sidebar ─────────────────────────────── */
  const sideW = sidebarCollapsed ? '72px' : '240px';

  return (
    <Flex h="100vh" bg="gray.950">
      {/* ═══════ SIDEBAR ═══════ */}
      <Box
        as="nav"
        w={sideW}
        minW={sideW}
        h="100vh"
        bg="gray.900"
        borderRight="1px solid"
        borderColor="gray.800"
        py={4}
        display="flex"
        flexDirection="column"
        transition="width 0.2s"
        overflow="hidden"
      >
        {/* Brand */}
        <HStack px={4} mb={6} gap={2} justify={sidebarCollapsed ? 'center' : 'flex-start'}>
          <Text fontSize="xl" fontWeight="800" color="blue.400" letterSpacing="-0.5px">
            {sidebarCollapsed ? 'H' : 'HireReady'}
          </Text>
        </HStack>

        {/* Nav links */}
        <VStack gap={1} px={2} flex={1}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            const btn = (
              <Button
                key={item.key}
                variant="ghost"
                w="full"
                justifyContent={sidebarCollapsed ? 'center' : 'flex-start'}
                px={sidebarCollapsed ? 0 : 3}
                py={2}
                h="44px"
                bg={isActive ? 'blue.500/15' : 'transparent'}
                color={isActive ? 'blue.300' : 'gray.400'}
                _hover={{ bg: 'gray.800', color: 'gray.100' }}
                borderRadius="lg"
                fontSize="sm"
                fontWeight={isActive ? '600' : '400'}
                onClick={() => setActiveTab(item.key)}
              >
                <Icon asChild w={5} h={5} mr={sidebarCollapsed ? 0 : 2}>
                  <item.icon />
                </Icon>
                {!sidebarCollapsed && <Text>{item.label}</Text>}
              </Button>
            );

            return sidebarCollapsed ? (
              <Tooltip key={item.key} content={item.label} positioning={{ placement: 'right' }}>
                {btn}
              </Tooltip>
            ) : btn;
          })}
        </VStack>

        {/* Collapse toggle */}
        <Box px={2} mt="auto">
          <Button
            variant="ghost"
            w="full"
            size="sm"
            color="gray.500"
            _hover={{ color: 'gray.300' }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Icon asChild w={4} h={4}>
              {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Icon>
            {!sidebarCollapsed && 'Collapse'}
          </Button>
        </Box>
      </Box>

      {/* ═══════ MAIN AREA ═══════ */}
      <Flex direction="column" flex={1} overflow="hidden">
        {/* ── Top Header ── */}
        <Flex
          h="60px"
          px={6}
          bg="gray.900/60"
          borderBottom="1px solid"
          borderColor="gray.800"
          align="center"
          justify="space-between"
          backdropFilter="blur(8px)"
          flexShrink={0}
        >
          <Heading size="md" color="gray.100" fontWeight="600">
            {NAV_ITEMS.find((n) => n.key === activeTab)?.label || 'Dashboard'}
          </Heading>

          {/* Notification bell + Profile icon (right side) */}
          <HStack gap={2}>
            {/* Notification Bell */}
            <Box position="relative">
              <IconButton
                variant="ghost"
                size="sm"
                color="gray.400"
                _hover={{ bg: 'gray.800', color: 'gray.100' }}
                borderRadius="full"
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs) fetchNotifications();
                }}
                aria-label="Notifications"
              >
                <Icon asChild w={5} h={5}><Bell /></Icon>
              </IconButton>
              {unreadCount > 0 && (
                <Box
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  bg="red.500"
                  color="white"
                  borderRadius="full"
                  w="18px" h="18px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="10px"
                  fontWeight="700"
                  lineHeight="1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Box>
              )}

              {/* Notification Dropdown */}
              {showNotifs && (
                <Box
                  position="absolute"
                  top="44px"
                  right="0"
                  w="360px"
                  maxH="400px"
                  overflowY="auto"
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  borderRadius="xl"
                  boxShadow="xl"
                  zIndex={100}
                  p={0}
                >
                  <Flex px={4} py={3} borderBottom="1px solid" borderColor="gray.700" align="center" justify="space-between">
                    <Text fontWeight="600" color="gray.100" fontSize="sm">Notifications</Text>
                    {unreadCount > 0 && (
                      <Badge colorPalette="red" fontSize="xs">{unreadCount} new</Badge>
                    )}
                  </Flex>
                  {notifsLoading ? (
                    <Flex justify="center" py={6}><Spinner size="sm" color="blue.400" /></Flex>
                  ) : notifications.length === 0 ? (
                    <Text color="gray.500" fontSize="sm" p={4} textAlign="center">No notifications yet</Text>
                  ) : (
                    <VStack gap={0} align="stretch">
                      {notifications.map((n) => (
                        <Box
                          key={n.id}
                          px={4} py={3}
                          borderBottom="1px solid"
                          borderColor="gray.700"
                          bg={n.status === 'unread' ? 'gray.750' : 'transparent'}
                          cursor={n.status === 'unread' ? 'pointer' : 'default'}
                          _hover={n.status === 'unread' ? { bg: 'gray.700' } : {}}
                          onClick={() => { if (n.status === 'unread') markNotifRead(n.id); }}
                        >
                          <Flex gap={2} align="flex-start">
                            {n.status === 'unread' && (
                              <Box w="8px" h="8px" minW="8px" borderRadius="full" bg="blue.400" mt="6px" />
                            )}
                            <Box flex={1}>
                              <Text fontSize="sm" color={n.status === 'unread' ? 'gray.100' : 'gray.400'} lineClamp={2}>
                                {n.message}
                              </Text>
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {new Date(n.created_at).toLocaleString()}
                              </Text>
                            </Box>
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </Box>
              )}
            </Box>

            {/* Profile Menu */}
            <MenuRoot>
              <MenuTrigger asChild>
                <Button variant="ghost" p={0} borderRadius="full" _hover={{ bg: 'gray.800' }}>
                  <HStack gap={2}>
                    <Text fontSize="sm" color="gray.400" display={{ base: 'none', md: 'block' }}>
                      {user?.name || user?.email || 'User'}
                    </Text>
                    <Avatar
                      name={user?.name || user?.email || 'U'}
                      size="sm"
                      bg="blue.500"
                      color="white"
                    />
                  </HStack>
                </Button>
              </MenuTrigger>
              <MenuContent bg="gray.800" borderColor="gray.700">
                <MenuItem
                  value="profile"
                  onClick={() => setActiveTab('profile')}
                  color="gray.200"
                  _hover={{ bg: 'gray.700' }}
                >
                  <Icon asChild w={4} h={4} mr={2}><User /></Icon> Profile
                </MenuItem>
                <MenuItem
                  value="logout"
                  onClick={handleLogout}
                  color="red.300"
                  _hover={{ bg: 'gray.700' }}
                >
                  <Icon asChild w={4} h={4} mr={2}><LogOut /></Icon> Logout
                </MenuItem>
              </MenuContent>
            </MenuRoot>
          </HStack>
        </Flex>

        {/* ── Page Content ── */}
        <Box flex={1} overflow="auto" p={6}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {loadingResult ? (
                <Flex direction="column" align="center" justify="center" h="300px" gap={3}>
                  <Spinner size="xl" color="blue.400" />
                  <Text color="gray.400">Loading latest analysis…</Text>
                </Flex>
              ) : result ? (
                <VStack gap={6} align="stretch">
                  {/* Score hero */}
                  <Box
                    bg="gray.900"
                    border="1px solid"
                    borderColor="gray.800"
                    borderRadius="xl"
                    p={8}
                    textAlign="center"
                  >
                    <Text color="gray.400" fontSize="sm" mb={1}>Readiness Score</Text>
                    <Text
                      fontSize="5xl"
                      fontWeight="800"
                      color={`${categoryColor(result.readiness_category)}.400`}
                    >
                      {result.readiness_score}
                    </Text>
                    <Badge
                      colorPalette={categoryColor(result.readiness_category)}
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="sm"
                      mt={2}
                    >
                      {result.readiness_category}
                    </Badge>
                    <Text color="gray.500" fontSize="xs" mt={3}>
                      Analysis based on your latest profile data
                      <br />
                      Updated: {new Date(result.created_at).toLocaleString()}
                    </Text>
                  </Box>

                  {/* Recommended roles */}
                  {result.recommended_roles?.length > 0 && (
                    <Box>
                      <Heading size="sm" color="gray.200" mb={3}>Top Recommended Roles</Heading>
                      <Flex gap={4} flexWrap="wrap">
                        {result.recommended_roles.map((r, i) => (
                          <ResultCard key={r.role} role={r.role} score={r.score} rank={i + 1} />
                        ))}
                      </Flex>
                    </Box>
                  )}
                </VStack>
              ) : (
                <Flex direction="column" align="center" justify="center" h="300px" gap={4}>
                  <Heading size="lg" color="gray.200">Welcome to HireReady!</Heading>
                  <Text color="gray.400">You haven't run an analysis yet.</Text>
                  <Button
                    colorPalette="blue"
                    size="lg"
                    onClick={() => setActiveTab('profile')}
                  >
                    Go to Profile
                  </Button>
                </Flex>
              )}
            </>
          )}

          {/* Resume Analysis Tab */}
          {activeTab === 'resume' && (
            <ResumeAnalysisPage
              token={token}
              user={user}
              result={result}
              onProfileUpdate={handleProfileUpdate}
            />
          )}

          {/* Roadmap Tab */}
          {activeTab === 'roadmap' && (
            <Flex direction="column" align="center" justify="center" h="300px" gap={4}>
              <Icon asChild w={12} h={12} color="blue.400"><Map /></Icon>
              <Heading size="md" color="gray.200">Career Roadmap</Heading>
              <Text color="gray.400" textAlign="center" maxW="400px">
                Personalized career roadmap coming soon! Complete your profile and analysis to get started.
              </Text>
            </Flex>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <ProfilePage
              token={token}
              user={user}
              onProfileUpdate={handleProfileUpdate}
              onLogout={handleLogout}
            />
          )}

          {/* Quiz Tab */}
          {activeTab === 'quiz' && <QuizPage />}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && <StudentJobs token={token} />}
        </Box>
      </Flex>
    </Flex>
  );
}
