import React from 'react'
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import DashboardScreen from '@features/dashboard/DashboardScreen';
import LoginRegisterScreen from '@features/onboarding/LoginRegisterScreen';
import AddEventScreen from '@features/events/AddEventScreen';
import { RootStackParamList } from '@navigation/types';

const Stack = createStackNavigator<RootStackParamList>();

const StackNavigator = () => {
  return (
   <NavigationContainer>
    <Stack.Navigator initialRouteName="LoginRegisterScreen" id={undefined}>
      <Stack.Screen name="LoginRegisterScreen" component={LoginRegisterScreen} options={{ headerShown : false}} />
      <Stack.Screen name="DashboardScreen" component={DashboardScreen} options={{title : 'Events'}}/>
      <Stack.Screen name="AddEventScreen" component={AddEventScreen} options={{ title: 'Add Event' }} />
    </Stack.Navigator>
   </NavigationContainer>
  )
}

export default StackNavigator

