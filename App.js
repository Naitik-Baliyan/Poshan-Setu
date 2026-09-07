import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import SelectRoleScreen from './src/screens/SelectRoleScreen';
import TeacherLoginScreen from './src/screens/teacher/LoginScreen';
import CoordinatorLoginScreen from './src/screens/coordinator/CoordinatorLoginScreen';
import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import ClassSelectionScreen from './src/screens/teacher/ClassSelectionScreen';
import AttendanceScreen from './src/screens/teacher/AttendanceScreen';
import CoordinatorDashboard from './src/screens/coordinator/CoordinatorDashboard';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminClassDetailScreen from './src/screens/admin/AdminClassDetailScreen';
import AdminMealDistributionScreen from './src/screens/admin/AdminMealDistributionScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="SelectRole"
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <Stack.Screen name="SelectRole" component={SelectRoleScreen} />
          <Stack.Screen name="TeacherLogin" component={TeacherLoginScreen} />
          <Stack.Screen name="CoordinatorLogin" component={CoordinatorLoginScreen} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
          <Stack.Screen name="ClassSelection" component={ClassSelectionScreen} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          <Stack.Screen name="CoordinatorDashboard" component={CoordinatorDashboard} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="AdminClassDetail" component={AdminClassDetailScreen} />
          <Stack.Screen name="AdminMealDistribution" component={AdminMealDistributionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
